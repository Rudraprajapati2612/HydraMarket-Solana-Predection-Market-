import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { ResolutionClient } from '../solana/resolution-client';
import { PythAdapter } from '../adapter/pyth-adapter';
import { CricketAdapter } from '../adapter/cricket-adapter';
import type { Market, Outcome,MarketState } from '../types';
import type { MarketRegistry } from '../tsIdl/market_registry';


export class ResolutionService {
  private connection: Connection;
  private resolutionClient: ResolutionClient;
  private pythAdapter: PythAdapter;
  private cricketAdapter: CricketAdapter;
  private marketProgramId: PublicKey;
  private usdcMint: PublicKey;

  constructor(
    rpcUrl: string,
    adminKeypair: Keypair,
    resolutionProgramId: PublicKey,
    marketProgramId: PublicKey,
    usdcMint: PublicKey,
    rapidApiKey: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.resolutionClient = new ResolutionClient(
      this.connection,
      resolutionProgramId,
      adminKeypair
    );
    this.pythAdapter = new PythAdapter(rpcUrl);
    this.cricketAdapter = new CricketAdapter(rapidApiKey);
    this.marketProgramId = marketProgramId;
    this.usdcMint = usdcMint;
  }

  /**
   * Process expired markets
   */
  async processExpiredMarkets(): Promise<number> {
    console.log('\\n⏰ Checking for expired markets...');

    // Get all markets in OPEN state
    const markets = await this.getOpenMarkets();

    console.log(`📋 Found ${markets.length} open markets`);

    const now = Math.floor(Date.now() / 1000);
    const expiredMarkets = markets.filter(m => m.expiresAt <= now);

    console.log(`⏱️  ${expiredMarkets.length} markets expired`);

    let resolved = 0;

    for (const market of expiredMarkets) {
      try {
        await this.processMarket(market);
        resolved++;
      } catch (error) {
        console.error(`❌ Failed to process market ${market.publicKey.toBase58()}:`, error);
      }
    }

    return resolved;
  }

  /**
   * Process a single market
   */
  private async processMarket(market: Market): Promise<void> {
    console.log(`\\n🔧 Processing market: ${market.question}`);
    console.log(`   Market PDA: ${market.publicKey.toBase58()}`);

    // Step 1: Initialize resolution if not already done
    const [resolutionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('resolution'), market.publicKey.toBuffer()],
      this.resolutionClient['program'].programId
    );

    let resolutionExists = false;
    try {
      await this.resolutionClient.getResolutionProposal(resolutionPda);
      resolutionExists = true;
      console.log('   Resolution already initialized');
    } catch {
      console.log('   Initializing resolution...');

      const category = market.resolutionSource.toLowerCase().includes('pyth') ||
                      market.resolutionSource.toLowerCase().includes('crypto')
        ? 'crypto'
        : 'sports';

      await this.resolutionClient.initializeResolution(
        market.publicKey,
        category,
        this.usdcMint
      );
    }

    // Step 2: Determine outcome using adapters
    let result = null;

    if (this.pythAdapter.canResolve(market.resolutionSource)) {
      result = await this.pythAdapter.resolve(market.resolutionSource, market.question);
    } else if (this.cricketAdapter.canResolve(market.resolutionSource)) {
      result = await this.cricketAdapter.resolve(market.resolutionSource, market.question);
    }

    if (!result) {
      console.warn('⚠️ Could not determine outcome automatically');
      return;
    }

    console.log(`📊 Resolution result:`);
    console.log(`   Outcome: ${JSON.stringify(result.outcome)}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Source: ${result.source}`);

    // Step 3: Propose outcome (simplified - using admin as oracle)
    // In production, this would be a separate oracle with bonded USDC
    // For now, we'll skip the proposal and go straight to finalization

    // Step 4: Wait for dispute window (in production)
    // For testing, we can finalize immediately

    console.log('✅ Market processed successfully');
  }

  /**
   * Get all open markets
   */
  private async getOpenMarkets(): Promise<Market[]> {
    const idl = require('../idl/market_registry.json');
  
    const provider = new anchor.AnchorProvider(
      this.connection,
      {} as anchor.Wallet,
      { commitment: 'confirmed' }
    );
  
    const program = new anchor.Program<MarketRegistry>(idl, provider);
  
    const accounts = await program.account.market.all();
  
    return accounts
      .filter(acc => {
        const rawState = Object.keys(acc.account.state)[0];
        return rawState === 'open';
      })
      .map(acc => {
        const rawState = Object.keys(acc.account.state)[0];
  
        // Guard against undefined (satisfies TS18048)
        if (!rawState) {
          throw new Error(`Market ${acc.publicKey.toBase58()} has no state`);
        }
  
        const state =
          (rawState.charAt(0).toUpperCase() + rawState.slice(1)) as MarketState;
  
        // Fix TS2464: cast the key to string explicitly before using as computed property
        const resolutionOutcome = acc.account.resolutionOutcome
          ? (() => {
              const key = Object.keys(acc.account.resolutionOutcome)[0] as string | undefined;
              return key ? ({ [key]: {} } as Outcome) : null;
            })()
          : null;
  
        return {
          publicKey: acc.publicKey,
          // Fix TS2322: convert number[] → Buffer so it satisfies Market['marketId']
          marketId: Buffer.from(acc.account.marketId as number[]),
          question: acc.account.question,
          description: acc.account.description,
          category: acc.account.category,
          state,
          expiresAt: acc.account.expireAt.toNumber(),
          resolvedAt: acc.account.resolvedAt?.toNumber() ?? null,
          resolutionSource: acc.account.resolutionSource,
          resolutionOutcome,
          yesTokenMint: acc.account.yesTokenMint,
          noTokenMint: acc.account.noTokenMint,
          escrowVault: acc.account.escrowVault,
        } satisfies Market;
      });
  }
}