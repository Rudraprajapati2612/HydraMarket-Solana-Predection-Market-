import type { ResolutionResult, Outcome } from '../types';

const SUPPORTED_ASSETS = ['BTC', 'ETH'] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

function isSupportedAsset(value: string): value is SupportedAsset {
  return (SUPPORTED_ASSETS as readonly string[]).includes(value);
}

export class PythAdapter {
  private readonly pythEndpoint: string;

  private readonly FEED_IDS: Record<`${SupportedAsset}/USD`, string> = {
    'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  };

  constructor(rpcUrl: string) {
    // rpcUrl kept for interface compatibility but not needed for Hermes REST
    this.pythEndpoint = process.env.PYTH_ENDPOINT || 'https://hermes.pyth.network';
  }

  canResolve(resolutionSource: string): boolean {
    return resolutionSource.toLowerCase().includes('pyth');
  }

  async resolve(
    resolutionSource: string,
    question: string
  ): Promise<ResolutionResult | null> {
    try {
      // Parse question — examples: "Will BTC reach $100k by..." / "Will BTC hit $100,000"
      const match = question.match(/Will (\w+) (?:reach|hit|exceed) \$?([\d,.]+)\s*(k)?/i);
      if (!match) {
        console.warn('⚠️ Could not parse question format');
        return null;
      }

      const asset = match[1]?.toUpperCase();
      if (!asset || !isSupportedAsset(asset)) {
        console.warn(`⚠️ No supported Pyth feed for ${asset}/USD`);
        return null;
      }

      const thresholdStr = match[2]?.replace(/,/g, '');
      const hasK = Boolean(match[3]);
      const baseThreshold = parseFloat(thresholdStr!);

      if (!Number.isFinite(baseThreshold)) {
        console.warn('⚠️ Could not parse numeric threshold from question');
        return null;
      }

      const threshold = hasK ? baseThreshold * 1000 : baseThreshold;

      const feedId = this.FEED_IDS[`${asset}/USD`];

      console.log(`📊 Fetching Pyth price for ${asset}/USD`);
      console.log(`   Threshold: $${threshold.toLocaleString()}`);
      console.log(`   Endpoint: ${this.pythEndpoint}`);

      // Call Hermes REST API
      const url = `${this.pythEndpoint}/v2/updates/price/latest?ids[]=${feedId}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`⚠️ Pyth Hermes API failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as any;
      const priceInfo = data?.parsed?.[0]?.price;

      if (!priceInfo) {
        console.warn('⚠️ No price data in Hermes response');
        console.warn('   Raw response:', JSON.stringify(data));
        return null;
      }

      // Price stored with exponent: price=8500000000, expo=-4 → $85,000
      const currentPrice = Number(priceInfo.price) * Math.pow(10, priceInfo.expo);
      const confidence = Number(priceInfo.conf) * Math.pow(10, priceInfo.expo);

      console.log(`💰 Current ${asset}/USD: $${currentPrice.toLocaleString()}`);
      console.log(`   Confidence: ±$${confidence.toLocaleString()}`);
      console.log(`   Threshold:  $${threshold.toLocaleString()}`);

      const outcome: Outcome = currentPrice >= threshold ? { yes: {} } : { no: {} };
      const confidenceRatio = confidence / currentPrice;

      return {
        outcome,
        confidence: 1 - confidenceRatio,
        source: `Pyth Hermes (${asset}/USD)`,
      };

    } catch (error) {
      console.error('❌ Pyth fetch failed:', error);
      return null;
    }
  }
}
