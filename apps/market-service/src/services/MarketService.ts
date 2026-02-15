// apps/market-service/src/market.ts

import "dotenv/config";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor"; // ✅ Import BN from @coral-xyz/anchor, not bn.js
import { Redis } from "ioredis";
import marketIdl from "../idl/market_registry.json";
import escrowIdl from "../idl/escrow_vault.json";
import type { MarketRegistry } from "../tsIdl/market_registry";
import type { EscrowVault } from "../tsIdl/escrow_vault";
import { randomBytes } from "crypto";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { prisma } from "db/client";
import bs58 from "bs58";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

export class MarketService {
  private connection: Connection;
  private adminKeypair: Keypair;
  private marketProgram: Program<MarketRegistry>;
  private escrowProgram: Program<EscrowVault>;

  constructor() {
    console.log("RPC", process.env.SOLANA_RPC_URL);

    this.connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");

    const adminKeyEnv = process.env.ADMIN_PRIVATE_KEY;
    console.log(adminKeyEnv);

    if (!adminKeyEnv) {
      throw new Error(" ADMIN_PRIVATE_KEY is missing in .env");
    }

    const secretKey = bs58.decode(adminKeyEnv);
    this.adminKeypair = Keypair.fromSecretKey(secretKey);

    const wallet = new NodeWallet(this.adminKeypair);

    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });

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
    expiresAt: Date;
    resolutionSource: string;
    creatorId: string;
  }) {
    console.log("🚀 Creating Market:", params.question);

    // Validate expiresAt
    if (!params.expiresAt) {
      throw new Error("expiresAt is required");
    }

    const expireDate = new Date(params.expiresAt);

    if (isNaN(expireDate.getTime())) {
      throw new Error("Invalid expiresAt date");
    }

    // ✅ FIXED: Use Anchor's BN and ensure proper conversion
    const expireAtUnix = Math.floor(expireDate.getTime() / 1000);
    const expireAtBn = new BN(expireAtUnix);

    console.log("📅 Expiration:", {
      input: params.expiresAt,
      parsed: expireDate.toISOString(),
      unix: expireAtUnix,
      bn: expireAtBn.toString(),
    });

    // Generate accounts
    const yesTokenMint = Keypair.generate();
    const noTokenMint = Keypair.generate();
    const resolutionAdapter = Keypair.generate();

    const marketId = randomBytes(32);

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

    try {
      // ✅ Call Anchor instruction with proper BN
      const tx = await this.marketProgram.methods
        .initializeMarket({
          marketId: Array.from(marketId),
          question: params.question,
          description: params.description,
          category: params.category,
          expireAt: expireAtBn, // ✅ This should now work
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

      console.log("⏳ Confirming transaction...");
      await this.connection.confirmTransaction(tx, "confirmed");

      console.log("✅ Market created. Tx:", tx);

      // Initialize escrow vault
      console.log("🔐 Initializing escrow vault...");
      await this.initializeEscrowVault(
        marketPda,
        escrowVaultPda,
        yesTokenMint.publicKey,
        noTokenMint.publicKey
      );

      // Open market for trading
      console.log("🚪 Opening market for trading...");
      await this.openMarket(marketPda);

      // Store in Database
      console.log("💾 Saving to database...");
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
          expiresAt: params.expiresAt,
        },
      });

      // Cache market state in redis
      await redis.set(
        `market:state:${market.id}`,
        "OPEN",
        "EX",
        86400 // 24 Hours
      );

      console.log("✅ Market saved to database:", market.id);

      return {
        marketId: market.id,
        marketPda: marketPda.toBase58(),
        yesTokenMint: yesTokenMint.publicKey.toBase58(),
        noTokenMint: noTokenMint.publicKey.toBase58(),
        txHash: tx,
      };
    } catch (error: any) {
      console.error("❌ Market creation failed:", error);
      
      // Log detailed error info
      if (error.logs) {
        console.error("📋 Program logs:", error.logs);
      }
      
      throw new Error(`Market creation failed: ${error.message}`);
    }
  }

  private async initializeEscrowVault(
    marketPda: PublicKey,
    escrowVaultPda: PublicKey,
    yesTokenMint: PublicKey,
    noTokenMint: PublicKey
  ) {
    try {
      const usdcMint = new PublicKey(process.env.USDC_MINT_ADDRESS!);

      const usdcVaultAta = await getAssociatedTokenAddress(
        usdcMint,
        escrowVaultPda,
        true
      );

      console.log("📍 Escrow accounts:");
      console.log("  USDC Mint:", usdcMint.toBase58());
      console.log("  USDC Vault ATA:", usdcVaultAta.toBase58());

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
      console.log("✅ Escrow vault initialized:", tx);
    } catch (error: any) {
      console.error("❌ Escrow vault initialization failed:", error);
      if (error.logs) {
        console.error("📋 Program logs:", error.logs);
      }
      throw error;
    }
  }

  private async openMarket(marketPda: PublicKey) {
    try {
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

      console.log(" Market opened:", tx);
    } catch (error: any) {
      console.error(" Open market failed:", error);
      if (error.logs) {
        console.error("📋 Program logs:", error.logs);
      }
      throw error;
    }
  }

  async getMarket(marketId: string) {
    return await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async listMarket(filters?: {
    state?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    return await prisma.market.findMany({
      where: {
        state: filters?.state as any,
        category: filters?.category,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }
}