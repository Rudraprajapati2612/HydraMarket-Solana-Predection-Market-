/**
 * payouts.ts
 *
 * Architecture:
 *   - Settlement worker mints YES/NO tokens to HOT WALLET's ATAs
 *   - Hot wallet is therefore `user` in claimPayout (owns all token accounts)
 *   - Hot wallet signs the transaction server-side — no Phantom popup needed
 *   - USDC payout lands in hot wallet, then credited to user's platform ledger
 *   - User withdraws via withdrawal worker as normal
 *
 * Routes:
 *   POST /payouts/resolve/:marketId   — Admin: resolve + settle on-chain
 *   POST /payouts/claim/:marketId     — User: claim payout (server-side, no wallet needed)
 *   GET  /payouts/claimable           — User: list claimable positions
 */

import { Elysia, t } from 'elysia';
import { prisma } from 'db/client';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID,getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import { authPlugin } from '../plugins/auth';
import type { EscrowVault }    from '../tsIdl/escrow_vault';
import type { MarketRegistry } from '../tsIdl/market_registry';
import ESCROW_IDL  from '../idl/escrow_vault.json';
import MARKET_IDL  from '../idl/market_registry.json';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

const SOLANA_RPC_URL             = requireEnv('SOLANA_RPC_URL');
const ESCROW_VAULT_PROGRAM_ID    = new PublicKey('CRyAfXPmf11myj8X1dZ3AdjSfwXEjB5Ep4HpXmf6D6QP');
const MARKET_REGISTRY_PROGRAM_ID = new PublicKey('H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h');
const USDC_MINT                  = new PublicKey(requireEnv('USDC_MINT_ADDRESS'));
const ESCROW_VAULT_SEED          = Buffer.from('escrow_vault');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function buildProvider(secretKeyBs58?: string) {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const key = secretKeyBs58 ?? requireEnv('HOT_WALLET_PRIVATE_KEY');
  const keypair    = Keypair.fromSecretKey(bs58.decode(key));
  const wallet     = new anchor.Wallet(keypair);
  const provider   = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  return { provider, keypair };
}

function deriveVaultPda(marketPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [ESCROW_VAULT_SEED, marketPubkey.toBuffer()],
    ESCROW_VAULT_PROGRAM_ID,
  );
  return pda;
}

function parseOutcomeEnum(outcome: string) {
  switch (outcome.toUpperCase()) {
    case 'YES':     return { yes: {} };
    case 'NO':      return { no: {} };
    case 'INVALID': return { invalid: {} };
    default: throw new Error(`Unknown outcome: ${outcome}`);
  }
}

async function executeClaimPayout(userId: string, marketId: string) {
  console.log(`\n💰 Claim payout: market=${marketId} user=${userId}`);

  const market = await prisma.market.findUnique({ where: { id: marketId } });

  if (!market) return { success: false, error: 'Market not found' } as const;
  if (market.state !== 'RESOLVED') return { success: false, error: 'Market not resolved yet. Admin must call POST /payouts/resolve/:marketId first.' } as const;
  if (!market.outcome) return { success: false, error: 'Market outcome not set' } as const;

  const position = await prisma.position.findUnique({
    where: { userId_marketId: { userId, marketId } },
  });

  if (!position) return { success: false, error: 'No position found' } as const;
  if (position.isClaimed) return { success: false, error: 'Payout already claimed' } as const;

  const yesTokens = Number(position.yesTokens);
  const noTokens = Number(position.noTokens);

  let expectedPayout = 0;
  if (market.outcome === 'YES') expectedPayout = yesTokens;
  else if (market.outcome === 'NO') expectedPayout = noTokens;
  else if (market.outcome === 'INVALID') expectedPayout = yesTokens + noTokens;

  if (expectedPayout === 0) {
    return { success: false, error: 'No winning tokens to claim' } as const;
  }

  const { provider } = buildProvider();
  const hotWalletPubkey = provider.wallet.publicKey;

  const escrowProgram = new anchor.Program<EscrowVault>(
    ESCROW_IDL as EscrowVault,
    provider,
  );

  const marketPubkey = new PublicKey(market.marketPda);
  const vaultPda = deriveVaultPda(marketPubkey);

  let vaultAccount: Awaited<ReturnType<typeof escrowProgram.account.escrowVault.fetch>>;
  try {
    vaultAccount = await escrowProgram.account.escrowVault.fetch(vaultPda);
  } catch {
    return { success: false, error: 'Failed to fetch vault from Solana' } as const;
  }

  if (!vaultAccount.isSettled) {
    return { success: false, error: 'Vault not settled on-chain. Admin must call POST /payouts/resolve/:marketId first.' } as const;
  }

  const yesTokenMint = vaultAccount.yesTokenMint;
  const noTokenMint = vaultAccount.noTokenMint;
  const usdcVault = vaultAccount.usdcVault;

  const hotWalletKeypair = (provider.wallet as anchor.Wallet).payer;
  const connection = provider.connection;

  const [yesAtaInfo, noAtaInfo, usdcAtaInfo] = await Promise.all([
    getOrCreateAssociatedTokenAccount(connection, hotWalletKeypair, yesTokenMint, hotWalletPubkey),
    getOrCreateAssociatedTokenAccount(connection, hotWalletKeypair, noTokenMint, hotWalletPubkey),
    getOrCreateAssociatedTokenAccount(connection, hotWalletKeypair, USDC_MINT, hotWalletPubkey),
  ]);

  const userYesAccount = position.yesTokenAccount
    ? new PublicKey(position.yesTokenAccount)
    : yesAtaInfo.address;

  const userNoAccount = position.noTokenAccount
    ? new PublicKey(position.noTokenAccount)
    : noAtaInfo.address;

  const userUsdc = usdcAtaInfo.address;

  let txSignature: string;
  try {
    txSignature = await escrowProgram.methods
      .claimPayout()
      .accounts({
        user: hotWalletPubkey,
        vault: vaultPda,
        market: marketPubkey,
        usdcVault,
        userUsdc,
        yesTokenMint,
        noTokenMint,
        userYesAccount,
        userNoAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();
  } catch (e: any) {
    const anchorError = anchor.AnchorError.parse(e.logs ?? []);
    const errorMsg = anchorError
      ? `${anchorError.error.errorCode.code}: ${anchorError.error.errorMessage}`
      : (e.message ?? 'Unknown error');
    console.error('❌ claimPayout failed:', errorMsg);
    return { success: false, error: `Solana claimPayout failed: ${errorMsg}` } as const;
  }

  try {
    await prisma.$transaction([
      prisma.ledger.update({
        where: { userId_asset: { userId, asset: 'USDC' } },
        data: { available: { increment: expectedPayout } },
      }),
      prisma.position.update({
        where: { userId_marketId: { userId, marketId } },
        data: { isClaimed: true, claimedAt: new Date(), claimTxHash: txSignature },
      }),
    ]);
  } catch (dbError) {
    await prisma.reconciliationLog.create({
      data: {
        userId,
        marketId,
        txSignature,
        type: 'CLAIM_PAYOUT',
        status: 'PENDING_RECONCILIATION',
        metadata: JSON.stringify({ expectedPayout, error: String(dbError) }),
      },
    }).catch(console.error);
  }

  return {
    success: true,
    data: {
      marketId,
      payout: expectedPayout,
      outcome: market.outcome,
      yesTokens,
      noTokens,
      txSignature,
    },
  } as const;
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

export const payoutRoutes = new Elysia({ prefix: '/payouts' })
  .use(authPlugin())

  // ══════════════════════════════════════════════════════════
  // POST /payouts/resolve/:marketId
  // Admin only. Body: { outcome: "YES" | "NO" | "INVALID" }
  //
  // Runs full on-chain resolution:
  //   1. resolvingMarket()
  //   2. finalizeMarket()
  //   3. settle()
  //   4. Update DB
  // ══════════════════════════════════════════════════════════
  .post('/resolve/:marketId',
    async ({ user, params, body }) => {
      if (!user) throw new Error('Unauthorized');
      if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
        return { success: false, error: 'Forbidden: Admin only' };
      }

      const outcome = body.outcome;
      const market  = await prisma.market.findUnique({ where: { id: params.marketId } });

      if (!market)                      return { success: false, error: 'Market not found' };
      if (!market.marketPda)            return { success: false, error: 'Market has no on-chain PDA' };
      if (!market.resolutionAdapterKey) return { success: false, error: 'Market has no resolutionAdapterKey' };

      const marketPubkey = new PublicKey(market.marketPda);
      const vaultPda     = deriveVaultPda(marketPubkey);
      const outcomeEnum  = parseOutcomeEnum(outcome);

      const { provider: adminProvider, keypair: adminKeypair }     = buildProvider();
      const { keypair: resolutionAdapterKeypair }                   = buildProvider(market.resolutionAdapterKey);

      const marketProgram = new anchor.Program<MarketRegistry>(MARKET_IDL as MarketRegistry, adminProvider);
      const escrowProgram = new anchor.Program<EscrowVault>(ESCROW_IDL as EscrowVault, adminProvider);

      let onChainMarket: Awaited<ReturnType<typeof marketProgram.account.market.fetch>>;
      let onChainVault:  Awaited<ReturnType<typeof escrowProgram.account.escrowVault.fetch>>;

      try {
        onChainMarket = await marketProgram.account.market.fetch(marketPubkey);
        onChainVault  = await escrowProgram.account.escrowVault.fetch(vaultPda);
      } catch (e: any) {
        return { success: false, error: `Failed to fetch on-chain state: ${e.message}` };
      }

      const isResolving       = !!onChainMarket.state.resolving;
      const isOnChainResolved = !!onChainMarket.state.resolved;
      const isSettled         = onChainVault.isSettled as boolean;

      if (isSettled) {
        return { success: false, error: 'Vault already settled on-chain. Nothing to do.' };
      }

      const steps: string[] = [];

      try {
        if (!isResolving && !isOnChainResolved) {
          const tx1 = await marketProgram.methods
            .resolvingMarket()
            .accounts({ admin: adminKeypair.publicKey, market: marketPubkey } as any)
            .signers([adminKeypair])
            .rpc();
          steps.push(`resolvingMarket tx: ${tx1}`);
        } else {
          steps.push('resolvingMarket: skipped');
        }

        if (!isOnChainResolved) {
          const tx2 = await marketProgram.methods
            .finalizeMarket(outcomeEnum)
            .accounts({ resolutionAdapter: resolutionAdapterKeypair.publicKey, market: marketPubkey } as any)
            .signers([resolutionAdapterKeypair])
            .rpc();
          steps.push(`finalizeMarket tx: ${tx2}`);
        } else {
          steps.push('finalizeMarket: skipped');
        }

        const tx3 = await escrowProgram.methods
          .settle()
          .accounts({
            authority:             adminKeypair.publicKey,
            vault:                 vaultPda,
            market:                marketPubkey,
            marketRegistryProgram: MARKET_REGISTRY_PROGRAM_ID,
          } as any)
          .signers([adminKeypair])
          .rpc();
        steps.push(`settle tx: ${tx3}`);

      } catch (e: any) {
        const anchorError = anchor.AnchorError.parse(e.logs ?? []);
        const errorMsg    = anchorError
          ? `${anchorError.error.errorCode.code}: ${anchorError.error.errorMessage}`
          : (e.message ?? 'Unknown Solana error');
        return { success: false, error: `On-chain resolution failed: ${errorMsg}`, completedSteps: steps };
      }

      await prisma.market.update({
        where: { id: params.marketId },
        data:  { state: 'RESOLVED', outcome: outcome.toUpperCase() as any, resolvedAt: new Date() },
      });

      steps.push('DB updated: state=RESOLVED');
      return { success: true, data: { marketId: params.marketId, outcome: outcome.toUpperCase(), steps } };
    },
    { body: t.Object({ outcome: t.String() }) },
  )

  // ══════════════════════════════════════════════════════════
  // POST /payouts/claim/:marketId
  //
  // Server-side claim — no frontend wallet signing required.
  //
  // Why hot wallet signs:
  //   The settlement worker mints YES/NO tokens to the HOT WALLET's ATAs.
  //   The Rust constraint requires: user_yes_account.owner == user.key()
  //   Since hot wallet owns all token accounts, hot wallet must be `user`.
  //   Hot wallet signs server-side, USDC lands in hot wallet,
  //   then credited to user's platform ledger for withdrawal.
  // ══════════════════════════════════════════════════════════
  .post('/claim/:marketId', async ({ user, params }) => {
    if (!user) throw new Error('Unauthorized');
    return executeClaimPayout(user.userId, params.marketId);
  })

  .post('/claim-all', async ({ user }) => {
    if (!user) throw new Error('Unauthorized');

    const positions = await prisma.position.findMany({
      where: { userId: user.userId, isClaimed: false, market: { state: 'RESOLVED' } },
      include: { market: true },
    });

    const claimableMarketIds = positions
      .filter((position) => {
        const yesTokens = Number(position.yesTokens);
        const noTokens = Number(position.noTokens);
        if (position.market.outcome === 'YES') return yesTokens > 0;
        if (position.market.outcome === 'NO') return noTokens > 0;
        if (position.market.outcome === 'INVALID') return yesTokens + noTokens > 0;
        return false;
      })
      .map((position) => position.marketId);

    const succeeded: any[] = [];
    const failed: any[] = [];

    for (const marketId of claimableMarketIds) {
      const result = await executeClaimPayout(user.userId, marketId);
      if (result.success) {
        succeeded.push(result.data);
      } else {
        failed.push({ marketId, error: result.error });
      }
    }

    return {
      success: failed.length === 0,
      data: {
        totalRequested: claimableMarketIds.length,
        claimedCount: succeeded.length,
        failedCount: failed.length,
        claims: succeeded,
        failures: failed,
      },
    };
  })

  // ══════════════════════════════════════════════════════════
  // GET /payouts/claimable
  // ══════════════════════════════════════════════════════════
  .get('/claimable', async ({ user }) => {
    if (!user) throw new Error('Unauthorized');

    const positions = await prisma.position.findMany({
      where:   { userId: user.userId, isClaimed: false, market: { state: 'RESOLVED' } },
      include: { market: true },
    });

    const claimable = positions
      .map(p => {
        const yesTokens = Number(p.yesTokens);
        const noTokens  = Number(p.noTokens);
        let payout = 0;
        if (p.market.outcome === 'YES')          payout = yesTokens;
        else if (p.market.outcome === 'NO')      payout = noTokens;
        else if (p.market.outcome === 'INVALID') payout = yesTokens + noTokens;
        return { marketId: p.marketId, marketQuestion: p.market.question, outcome: p.market.outcome, yesTokens, noTokens, payout };
      })
      .filter(p => p.payout > 0);

    return { success: true, data: claimable };
  })

  .get('/history', async ({ user, query }) => {
    if (!user) throw new Error('Unauthorized');

    const limit = Math.min(Number(query.limit ?? 50), 100);

    const claimedPositions = await prisma.position.findMany({
      where: {
        userId: user.userId,
        isClaimed: true,
        claimedAt: { not: null },
      },
      include: {
        market: {
          select: {
            id: true,
            question: true,
            outcome: true,
          },
        },
      },
      orderBy: { claimedAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: claimedPositions.map((position) => {
        const yesTokens = Number(position.yesTokens);
        const noTokens = Number(position.noTokens);
        let amount = 0;
        if (position.market.outcome === 'YES') amount = yesTokens;
        else if (position.market.outcome === 'NO') amount = noTokens;
        else if (position.market.outcome === 'INVALID') amount = yesTokens + noTokens;

        return {
          id: position.id,
          marketId: position.market.id,
          marketQuestion: position.market.question,
          outcome: position.market.outcome,
          amount,
          claimedAt: position.claimedAt,
          txSignature: position.claimTxHash,
        };
      }),
    };
  }, {
    query: t.Object({
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    }),
  });
