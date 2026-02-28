import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { ResolutionAdapter } from '../tsIdl/resolution_adapter';

import  type { Outcome } from '../types';


export class ResolutionClient{
    private program: Program<ResolutionAdapter>;
    private admin: Keypair;
  
    constructor(
      connection: Connection,
      programId: PublicKey,
      adminKeypair: Keypair
    ) {
      const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(adminKeypair),
        { commitment: 'confirmed' }
      );
  
      this.program = new Program<ResolutionAdapter>(
        require('../idl/resolution_adapter.json'),
        provider
      );
  
      this.admin = adminKeypair;
    }
  
    async initializeResolution(
        marketPda: PublicKey,
        category: 'crypto' | 'sports',
        usdcMint: PublicKey
      ): Promise<{ resolutionPda: PublicKey; bondVault: PublicKey }> {
        const [resolutionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('resolution'), marketPda.toBuffer()],
          this.program.programId
        );
    
        const [bondVault] = PublicKey.findProgramAddressSync(
          [Buffer.from('bond_vault'), marketPda.toBuffer()],
          this.program.programId
        );
    
        console.log(`🔧 Initializing ${category} resolution for market ${marketPda.toBase58()}`);
    
        await this.program.methods
          .initializeResolution(category === 'crypto' ? { crypto: {} } : { sports: {} })
          .accounts({
            authority: this.admin.publicKey,
            market: marketPda,
            // @ts-ignore
            resolutionProposal: resolutionPda,
            bondVault,
            bondMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([this.admin])
          .rpc();
    
        console.log(`✅ Resolution initialized: ${resolutionPda.toBase58()}`);
    
        return { resolutionPda, bondVault };
      }
    

      async proposeCryptoOutcome(
        marketPda: PublicKey,
        resolutionPda: PublicKey,
        bondVault: PublicKey,
        oracleUsdc: PublicKey,
        priceFeedId: string,
        threshold: number,
        bondAmount: number
      ): Promise<string> {
        console.log(`📊 Proposing crypto outcome for ${marketPda.toBase58()}`);
    
        const signature = await this.program.methods
          .proposeCryptoOutcome(
            'BTC/USD',
            { greaterOrEqual: { target: new anchor.BN(threshold * 1_000_000) } },
            [priceFeedId],
            new anchor.BN(bondAmount)
          )
          .accounts({
            proposer: this.admin.publicKey,
            market: marketPda,
            // @ts-ignore
            resolutionProposal: resolutionPda,
            bondVault,
            proposerBondAccount: oracleUsdc,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([this.admin])
          .rpc();
    
        console.log(`✅ Crypto outcome proposed: ${signature}`);
    
        return signature;
      }
    

      async proposeSportsOutcome(
        marketPda: PublicKey,
        resolutionPda: PublicKey,
        bondVault: PublicKey,
        oracleUsdc: PublicKey,
        eventName: string,
        winner: string,
        sources: Array<{ sourceName: string; result: string }>,
        bondAmount: number
      ): Promise<string> {
        console.log(`🏏 Proposing sports outcome for ${marketPda.toBase58()}`);
    
        const sportsData = sources.map(s => ({
          sourceType: { manual: {} },
          sourceName: s.sourceName,
          oracleAccount: null,
          result: s.result,
          timestamp: new anchor.BN(Math.floor(Date.now() / 1000)),
        }));
    
        const signature = await this.program.methods
          .proposeSportsOutcome(
            eventName,
            { winner: {} },
            sportsData,
            new anchor.BN(bondAmount)
          )
          .accounts({
            proposer: this.admin.publicKey,
            market: marketPda,
            // @ts-ignore
            resolutionProposal: resolutionPda,
            bondVault,
            proposerBondAccount: oracleUsdc,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([this.admin])
          .rpc();
    
        console.log(`✅ Sports outcome proposed: ${signature}`);
    
        return signature;
      }

      async finalizeOutcome(
        marketPda: PublicKey,
        resolutionPda: PublicKey,
        bondVault: PublicKey,
        winnerAccount: PublicKey,
        protocolTreasury: PublicKey,
        resolutionAdapterKeypair: Keypair,
        outcome: Outcome
      ): Promise<string> {
        console.log(`🏁 Finalizing outcome for ${marketPda.toBase58()}`);
    
        const signature = await this.program.methods
          .finalizeOutcome(outcome)
          .accounts({
            authority: resolutionAdapterKeypair.publicKey,
            rewardAuthority: this.admin.publicKey,
            market: marketPda,
            // @ts-ignore
            resolutionProposal: resolutionPda,
            bondVault,
            winnerAccount,
            protocolTreasury,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([resolutionAdapterKeypair, this.admin])
          .rpc();
    
        console.log(`✅ Outcome finalized: ${signature}`);
    
        return signature;
      }

      async getResolutionProposal(resolutionPda: PublicKey) {
        return await this.program.account.resolutionProposal.fetch(resolutionPda);
      }
}