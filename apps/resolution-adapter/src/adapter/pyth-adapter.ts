import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';

import type { ResolutionResult , Outcome } from '../types';

const SUPPORTED_ASSETS = ['BTC', 'ETH'] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

function isSupportedAsset(value: string): value is SupportedAsset {
  return (SUPPORTED_ASSETS as readonly string[]).includes(value);
}

export class PythAdapter{
    private connection: Connection;
    private pythClient: PythHttpClient;


    // Pyth price feed IDs (mainnet)
  private readonly FEED_IDS: Record<`${SupportedAsset}/USD`, string> = {
      'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
      'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    };

  constructor(rpcUrl: string) {
    // Create a RPC connection to the solana node 
    this.connection = new Connection(rpcUrl);
    this.pythClient = new PythHttpClient(
      this.connection,
    //   it is used to fetch data from the Pyth Smart contract depoloyed on the Solana mainnet 
      getPythProgramKeyForCluster('mainnet-beta')
    );
  }

  canResolve(resolutionSource: string): boolean {
    return resolutionSource.toLowerCase().includes('pyth');
  }

  async resolve(
    resolutionSource: string,
    question: string
  ): Promise<ResolutionResult | null> {
    try {
      // Parse question to determine asset and threshold
      // Example: "Will BTC reach $100k by..."
      const match = question.match(/Will (\w+) (?:reach|hit|exceed) \$?([\d,]+)k?/i);

      if (!match) {
        console.warn('⚠️ Could not parse question format');
        return null;
      }

      const asset = match[1]?.toUpperCase();
      if (!asset || !isSupportedAsset(asset)) {
        console.warn(`⚠️ No supported Pyth feed for ${asset}/USD`);
        return null;
      }
      const thresholdStr = match[2]?.replace(/,/g, '');  // "100"
      const threshold = parseFloat(thresholdStr!) * 1000;  // 100k = 100,000

      const feedId = this.FEED_IDS[`${asset}/USD`];

      if (!feedId) {
        console.warn(`⚠️ No Pyth feed for ${asset}/USD`);
        return null;
      }

      console.log(`📊 Fetching Pyth price for ${asset}/USD`);
      console.log(`   Threshold: $${threshold.toLocaleString()}`);

    //  we are reading on Chain pyth oracle account 
    // and decode the binary data means 
    // extract price confidence exponent and publish time 
      const data = await this.pythClient.getData();
      const priceData = data.productPrice.get(feedId);

      if (!priceData || !priceData.price) {
        console.warn('⚠️ No price data available');
        return null;
      }

      const currentPrice = priceData.price;
      const confidence = priceData.confidence || 0;

      console.log(`💰 Current ${asset}/USD: $${currentPrice.toLocaleString()}`);
      console.log(`   Confidence: ±$${confidence.toLocaleString()}`);

      // Determine outcome
      const outcome: Outcome = currentPrice >= threshold ? { yes: {} } : { no: {} };

      const confidenceRatio = confidence / currentPrice;

      return {
        outcome,
        confidence: 1 - confidenceRatio,  // Higher is better
        source: `Pyth Network (${asset}/USD)`,
      };
    } catch (error) {
      console.error('❌ Pyth fetch failed:', error);
      return null;
    }
  }
}