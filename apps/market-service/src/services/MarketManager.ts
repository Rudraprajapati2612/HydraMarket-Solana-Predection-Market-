import "dotenv/config";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { Redis } from "ioredis";
import marketIdl from "../idl/market_registry.json";
import escrowIdl from "../idl/escrow_vault.json";
import type { MarketRegistry } from "../tsIdl/market_registry";
import type { EscrowVault } from "../tsIdl/escrow_vault";

import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";

import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { prisma } from "db/client";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export class MarketManager {
  private connection: Connection;
  private adminKeypair: Keypair;

  private marketProgram: Program<MarketRegistry>;
  private escrowProgram: Program<EscrowVault>;

  constructor() {
    // RPC connection
    this.connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");

    // Admin keypair
    const secretKey = JSON.parse(process.env.ADMIN_PRIVATE_KEY!);
    this.adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

    // Anchor provider (wallet not needed for client signing)
    const provider = new AnchorProvider(
      this.connection,
      { publicKey: this.adminKeypair.publicKey } as any,
      { commitment: "confirmed" }
    );

    // Typed programs (IMPORTANT)
    this.marketProgram = new Program<MarketRegistry>(
      marketIdl as MarketRegistry,
      provider
    );

    this.escrowProgram = new Program<EscrowVault>(
      escrowIdl as EscrowVault,
      provider
    );
  }

  async createMarket(params: {
    question: string;
    description: string;
    category: string;
    expireAt: Date;
    resolutionSource: string;
    creatorId: string;
  }) {
    console.log("🚀 Creating Market:", params.question);

    // Generate accounts
    const yesTokenMint = Keypair.generate();
    const noTokenMint = Keypair.generate();
    const resolutionAdapter = Keypair.generate();

    // Random market ID (32 bytes)
    const marketId = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));

    // Market PDA
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketId],
      this.marketProgram.programId
    );

    // Escrow vault PDA
    const [escrowVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_vault"), marketPda.toBuffer()],
      this.escrowProgram.programId
    );

    console.log("📍 Derived Addresses");
    console.log("Market PDA:", marketPda.toBase58());
    console.log("Escrow Vault:", escrowVaultPda.toBase58());
    console.log("YES Mint:", yesTokenMint.publicKey.toBase58());
    console.log("NO Mint:", noTokenMint.publicKey.toBase58());

    // Convert Date → Unix timestamp → BN
    const expireAtBn = new BN(Math.floor(params.expireAt.getTime() / 1000));

    // Call Anchor instruction
    const tx = await this.marketProgram.methods
      .initializeMarket({
        marketId: Array.from(marketId),
        question: params.question,
        description: params.description,
        category: params.category,
        expireAt: expireAtBn,
        resolutionSource: params.resolutionSource,
      })
      .accounts({
        admin: this.adminKeypair.publicKey,
        // @ts-ignore
        market: marketPda,
        yesTokenMint: yesTokenMint.publicKey,
        noTokenMint: noTokenMint.publicKey,
        escrowVault: escrowVaultPda,
        escrowProgram: this.escrowProgram.programId,
        resolutionAdapter: resolutionAdapter.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([this.adminKeypair, yesTokenMint, noTokenMint])
      .rpc();

    await this.connection.confirmTransaction(tx, "confirmed");

    console.log(" Market created. Tx:", tx);

    //  Initialize escrow vault
    await this.initializeEscrowVault(
      marketPda,
      escrowVaultPda,
      yesTokenMint.publicKey,
      noTokenMint.publicKey
    );

    // Open market For Trading
    this.openMarket(marketPda);

    //   Store in Database

    const market = await prisma.market.create({
      data: {
        marketId: marketId.toString("hex"),
        question: params.question,
        description: params.description,
        category: params.category,
        creatorId: params.creatorId,
        marketPda: marketPda.toBase58(),
        escrowVaultPda: escrowVaultPda.toBase58(),
        yesTokenMint: yesTokenMint.publicKey.toBase58(),
        noTokenMint: noTokenMint.publicKey.toBase58(),
        state: "OPEN",
        expiresAt: params.expireAt,
      },
    });
    // Cache market State  in redis

    await redis.set(
        `market:state:${market.id}`,
        'OPEN',
        'EX',
        86400 //24 Hours 
    );

    console.log("Market Saved To database",market.id);


    

    return {
      marketId: market.id,
      marketPda: marketPda.toBase58(),
      yesTokenMint: yesTokenMint.publicKey.toBase58(),
      noTokenMint: noTokenMint.publicKey.toBase58(),
      txHash: tx,
    };
  }

  private async initializeEscrowVault(
    marketPda: PublicKey,
    escrowVaultPda: PublicKey,
    yesTokenMint: PublicKey,
    noTokenMint: PublicKey
  ) {
    console.log("🔐 Initializing escrow vault...");

    const usdcMint = new PublicKey(process.env.USDC_MINT_ADDRESS!);

    const usdcVaultAta = await getAssociatedTokenAddress(
      usdcMint,
      escrowVaultPda,
      true
    );

    const tx = await this.escrowProgram.methods
      .initializeVault()
      .accounts({
        admin: this.adminKeypair.publicKey,
        market: marketPda,
        //@ts-ignore
        vault: escrowVaultPda,
        marketRegisteryProgram: this.marketProgram.programId,
        yesTokenMint,
        noTokenMint,
        usdcVault: usdcVaultAta,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([this.adminKeypair])
      .rpc();

    await this.connection.confirmTransaction(tx);
    console.log(" Escrow vault initialized:", tx);
  }

  private async openMarket(marketPda: PublicKey) {
    console.log("Open Market");

    const tx = await this.marketProgram.methods
      .openMarket()
      .accounts({
        admin: this.adminKeypair.publicKey,
        // @ts-ignore
        market: marketPda,
      })
      .signers([this.adminKeypair])
      .rpc();

    await this.connection.confirmTransaction(tx);

    console.log("Market Open", tx);
  }

  async getMarket(marketId:string){
    return await prisma.market.findUnique({
        where : {id:marketId},
        include:{
            creator:{
                select:{
                    id:true,
                    username:true
                }
            }
        }
    })
  }


  async listMarket(filters?:{
    state?:string,
    category?: string,
    limit?:number,
    offset?:number
  }){
     return await prisma.market.findMany({
        where : { 
            state : filters?.state as any,
            category : filters?.category
        },
        include :{
            creator :{
                select :{
                    id:true,
                    username:true
                }
            }
        },
        orderBy : {
            createdAt:'desc',
        },
        take:filters?.limit||50,
        skip : filters?.offset||0
     })
  }
}
