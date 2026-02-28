import { PublicKey } from '@solana/web3.js';

export interface Market {
  publicKey: PublicKey;
  marketId: Buffer;
  question: string;
  description: string;
  category: string;
  state: MarketState;
  expiresAt: number;
  resolvedAt: number | null;
  resolutionSource: string;
  resolutionOutcome: Outcome | null;
  yesTokenMint: PublicKey;
  noTokenMint: PublicKey;
  escrowVault: PublicKey;
}

export type MarketState =
  | 'Created'
  | 'Open'
  | 'Paused'
  | 'Resolving'
  | 'Resolved'
  | 'Close';

export type Outcome =
  | { yes: {} }
  | { no: {} }
  | { invalid: {} };

export interface ResolutionProposal {
  market: PublicKey;
  category: { crypto: {} } | { sports: {} };
  proposer: PublicKey | null;
  bondAmount: number;
  isDisputed: boolean;
  isFinalized: boolean;
  bondVault: PublicKey;
}

export interface ResolutionResult {
  outcome: Outcome;
  confidence: number;
  source: string;
}