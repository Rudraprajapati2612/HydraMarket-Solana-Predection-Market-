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
    console.log(`\n💰 Claim payout: market=${params.marketId} user=${user?.userId}`);

    if (!user) throw new Error('Unauthorized');

    // ── 1. Validate market ───────────────────────────────────
    const market = await prisma.market.findUnique({ where: { id: params.marketId } });

    if (!market)                     return { success: false, error: 'Market not found' };
    if (market.state !== 'RESOLVED') return { success: false, error: 'Market not resolved yet. Admin must call POST /payouts/resolve/:marketId first.' };
    if (!market.outcome)             return { success: false, error: 'Market outcome not set' };

    // ── 2. Validate position ─────────────────────────────────
    const position = await prisma.position.findUnique({
      where: { userId_marketId: { userId: user.userId, marketId: params.marketId } },
    });

    if (!position)          return { success: false, error: 'No position found' };
    if (position.isClaimed) return { success: false, error: 'Payout already claimed' };

    const yesTokens = Number(position.yesTokens);
    const noTokens  = Number(position.noTokens);

    let expectedPayout = 0;
    if (market.outcome === 'YES')          expectedPayout = yesTokens;
    else if (market.outcome === 'NO')      expectedPayout = noTokens;
    else if (market.outcome === 'INVALID') expectedPayout = yesTokens + noTokens;

    if (expectedPayout === 0) {
      return { success: false, error: 'No winning tokens to claim' };
    }

    // ── 3. Setup Solana ──────────────────────────────────────
    // HOT WALLET is the signer — it owns all YES/NO token accounts
    const { provider } = buildProvider(); // uses ADMIN_PRIVATE_KEY = hot wallet
    const hotWalletPubkey = provider.wallet.publicKey;

    const escrowProgram = new anchor.Program<EscrowVault>(
      ESCROW_IDL as EscrowVault,
      provider,
    );

    const marketPubkey = new PublicKey(market.marketPda);
    const vaultPda     = deriveVaultPda(marketPubkey);

    // ── 4. Fetch vault ───────────────────────────────────────
    let vaultAccount: Awaited<ReturnType<typeof escrowProgram.account.escrowVault.fetch>>;
    try {
      vaultAccount = await escrowProgram.account.escrowVault.fetch(vaultPda);
    } catch {
      return { success: false, error: 'Failed to fetch vault from Solana' };
    }

    if (!vaultAccount.isSettled) {
      return { success: false, error: 'Vault not settled on-chain. Admin must call POST /payouts/resolve/:marketId first.' };
    }

    const yesTokenMint = vaultAccount.yesTokenMint;
    const noTokenMint  = vaultAccount.noTokenMint;
    const usdcVault    = vaultAccount.usdcVault;

    // ── 5. Resolve token accounts ────────────────────────────
    // Use accounts stored by settlement worker — they are owned by hot wallet.
    // For the side not held, derive hot wallet ATA as empty placeholder.
    // Contract only burns what's non-zero so the placeholder is never touched.
    // ── 5. Ensure token accounts exist on-chain ─────────────────
    
    // Hot wallet keypair (payer)
    const hotWalletKeypair = (provider.wallet as anchor.Wallet).payer;
    const connection = provider.connection;
    
    // Always ensure YES, NO and USDC ATAs exist
    const [yesAtaInfo, noAtaInfo, usdcAtaInfo] = await Promise.all([
      getOrCreateAssociatedTokenAccount(
        connection,
        hotWalletKeypair,
        yesTokenMint,
        hotWalletPubkey
      ),
      getOrCreateAssociatedTokenAccount(
        connection,
        hotWalletKeypair,
        noTokenMint,
        hotWalletPubkey
      ),
      getOrCreateAssociatedTokenAccount(
        connection,
        hotWalletKeypair,
        USDC_MINT,
        hotWalletPubkey
      ),
    ]);
    
    // If DB already stored token account, use it.
    // Otherwise use the created ATA.
    const userYesAccount = position.yesTokenAccount
      ? new PublicKey(position.yesTokenAccount)
      : yesAtaInfo.address;
    
    const userNoAccount = position.noTokenAccount
      ? new PublicKey(position.noTokenAccount)
      : noAtaInfo.address;
    
    const userUsdc = usdcAtaInfo.address;
    
    console.log('📋 Token accounts verified:');
    console.log('   userYesAccount:', userYesAccount.toBase58());
    console.log('   userNoAccount :', userNoAccount.toBase58());
    console.log('   userUsdc      :', userUsdc.toBase58());
    
    
    
    console.log('📋 claimPayout accounts:');
    console.log('   user (hot wallet): ', hotWalletPubkey.toBase58());
    console.log('   vault:             ', vaultPda.toBase58());
    console.log('   usdcVault:         ', usdcVault.toBase58());
    console.log('   userUsdc:          ', userUsdc.toBase58());
    console.log('   yesTokenMint:      ', yesTokenMint.toBase58());
    console.log('   noTokenMint:       ', noTokenMint.toBase58());
    console.log('   userYesAccount:    ', userYesAccount.toBase58(), position.yesTokenAccount ? '(DB)' : '(derived)');
    console.log('   userNoAccount:     ', userNoAccount.toBase58(),  position.noTokenAccount  ? '(DB)' : '(derived)');

    // ── 6. Call claimPayout on-chain ─────────────────────────
    // Hot wallet signs automatically via provider
    let txSignature: string;
    try {
      const { getAccount } = await import('@solana/spl-token');
       const connection = provider.connection;

      const [yesInfo, noInfo, usdcInfo] = await Promise.all([
        getAccount(connection, userYesAccount).catch(e => ({ error: e.message })),
        getAccount(connection, userNoAccount).catch(e => ({ error: e.message })),
        getAccount(connection, userUsdc).catch(e => ({ error: e.message })),
      ]);
    
      console.log('🔍 YES account:', {
        address: userYesAccount.toBase58(),
        owner:   (yesInfo as any).owner?.toBase58(),
        amount:  (yesInfo as any).amount?.toString(),
        error:   (yesInfo as any).error,
      });
    
      console.log('🔍 NO account:', {
        address: userNoAccount.toBase58(),
        owner:   (noInfo as any).owner?.toBase58(),
        amount:  (noInfo as any).amount?.toString(),
        error:   (noInfo as any).error,
      });
    
      console.log('🔍 USDC account:', {
        address: userUsdc.toBase58(),
        owner:   (usdcInfo as any).owner?.toBase58(),
        amount:  (usdcInfo as any).amount?.toString(),
        error:   (usdcInfo as any).error,
      });
    
      console.log('🔍 Hot wallet (user):', hotWalletPubkey.toBase58());
      // 🔍 DEBUG BLOCK END

      txSignature = await escrowProgram.methods
        .claimPayout()
        .accounts({
          user:           hotWalletPubkey,  // owner of all token accounts
          vault:          vaultPda,
          market:         marketPubkey,
          usdcVault:      usdcVault,
          userUsdc:       userUsdc,         // hot wallet USDC ATA ← key fix
          yesTokenMint:   yesTokenMint,
          noTokenMint:    noTokenMint,
          userYesAccount: userYesAccount,
          userNoAccount:  userNoAccount,
          tokenProgram:   TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log(`✅ claimPayout confirmed: ${txSignature}`);

    } catch (e: any) {
      const anchorError = anchor.AnchorError.parse(e.logs ?? []);
      const errorMsg    = anchorError
        ? `${anchorError.error.errorCode.code}: ${anchorError.error.errorMessage}`
        : (e.message ?? 'Unknown error');
      console.error('❌ claimPayout failed:', errorMsg);
      return { success: false, error: `Solana claimPayout failed: ${errorMsg}` };
    }

    // ── 7. Update DB atomically — only after on-chain success ──
    // Credit user's platform ledger — they withdraw via withdrawal worker
    try {
      await prisma.$transaction([
        prisma.ledger.update({
          where: { userId_asset: { userId: user.userId, asset: 'USDC' } },
          data:  { available: { increment: expectedPayout } },
        }),
        prisma.position.update({
          where: { userId_marketId: { userId: user.userId, marketId: params.marketId } },
          data:  { isClaimed: true, claimedAt: new Date(), claimTxHash: txSignature },
        }),
      ]);
      console.log(`💰 ${expectedPayout} USDC credited to user ${user.userId}`);

    } catch (dbError) {
      // On-chain succeeded — log for reconciliation, do not return error
      await prisma.reconciliationLog.create({
        data: {
          userId:      user.userId,
          marketId:    params.marketId,
          txSignature: txSignature,
          type:        'CLAIM_PAYOUT',
          status:      'PENDING_RECONCILIATION',
          metadata:    JSON.stringify({ expectedPayout, error: String(dbError) }),
        },
      }).catch(console.error);
    }

    return {
      success: true,
      data: {
        payout:      expectedPayout,
        outcome:     market.outcome,
        yesTokens,
        noTokens,
        txSignature,
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
  });