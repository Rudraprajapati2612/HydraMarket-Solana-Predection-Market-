import { Elysia } from 'elysia';
import { prisma } from 'db/client';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { authPlugin } from '../plugins/auth';
import type { EscrowVault } from '../tsIdl/escrow_vault'; // your IDL type
import IDL_JSON from '../idl/escrow_vault.json';   // raw JSON IDL

// ─────────────────────────────────────────────────────────────
// Constants — all pulled from env
// ─────────────────────────────────────────────────────────────

const SOLANA_RPC_URL          = process.env.SOLANA_RPC_URL!;
const ESCROW_VAULT_PROGRAM_ID = new PublicKey('CRyAfXPmf11myj8X1dZ3AdjSfwXEjB5Ep4HpXmf6D6QP'); // from your IDL address field
const USDC_MINT               = new PublicKey(process.env.USDC_MINT_ADDRESS!);

// Seeds must exactly match your Rust program:
// seeds = [b"escrow_vault", vault.market.as_ref()]
// IDL byte array [101,115,99,114,111,119,95,118,97,117,108,116] = "escrow_vault"
const ESCROW_VAULT_SEED = Buffer.from('escrow_vault');

// ─────────────────────────────────────────────────────────────
// Solana helpers
// ─────────────────────────────────────────────────────────────

/**
 * Builds an Anchor provider using the server-side hot wallet.
 * The hot wallet signs the claimPayout instruction as "user" on Solana.
 * This means the server pays fees and signs — user tokens are in the
 * hot wallet's associated token accounts on the platform.
 */
function buildProvider(): { provider: anchor.AnchorProvider; connection: Connection } {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const secretKey  = bs58.decode(process.env.HOT_WALLET_PRIVATE_KEY!);
  const hotWallet  = Keypair.fromSecretKey(secretKey);
  const wallet     = new anchor.Wallet(hotWallet);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment:          'confirmed',
    preflightCommitment: 'confirmed',
  });

  return { provider, connection };
}

/**
 * Derives the EscrowVault PDA.
 * Seeds: [b"escrow_vault", market_pubkey] — matches IDL exactly.
 */
function deriveVaultPda(marketPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_VAULT_SEED, marketPubkey.toBuffer()],
    ESCROW_VAULT_PROGRAM_ID,
  );
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

export const payoutRoutes = new Elysia({ prefix: '/payouts' })
  .use(authPlugin())

  /**
   * POST /payouts/claim/:marketId
   *
   * Full flow:
   *  1. Validate market is RESOLVED in DB
   *  2. Validate user has an unclaimed position in DB
   *  3. Fetch on-chain vault to get authoritative token mints + usdc vault address
   *  4. Call escrow_vault.claimPayout() on Solana:
   *       → Burns YES/NO tokens on-chain
   *       → Transfers USDC from escrow_vault → user's token account
   *  5. ONLY on success → atomically update DB (ledger + position)
   */
  .post('/claim/:marketId', async ({ user, params }) => {
    console.log(`💰 Claim payout request for market: ${params.marketId}`);

    if (!user) throw new Error('Unauthorized User');

    // ── 1. Validate market ──────────────────────────────────
    const market = await prisma.market.findUnique({
      where: { id: params.marketId },
    });

    if (!market)                     return { success: false, error: 'Market not found' };
    if (market.state !== 'RESOLVED') return { success: false, error: 'Market not resolved yet' };
    if (!market.outcome)             return { success: false, error: 'Market outcome not set' };
    

    // ── 2. Validate position ────────────────────────────────
    const position = await prisma.position.findUnique({
      where: {
        userId_marketId: {
          userId:   user.userId,
          marketId: params.marketId,
        },
      },
    });

    if (!position)          return { success: false, error: 'No position found' };
    if (position.isClaimed) return { success: false, error: 'Payout already claimed' };

    const yesTokens = Number(position.yesTokens);
    const noTokens  = Number(position.noTokens);

    // Expected payout for DB update — smart contract is source of truth for actual amount
    let expectedPayout = 0;
    if (market.outcome === 'YES')          expectedPayout = yesTokens;
    else if (market.outcome === 'NO')      expectedPayout = noTokens;
    else if (market.outcome === 'INVALID') expectedPayout = yesTokens + noTokens;

    if (expectedPayout === 0) {
      return { success: false, error: 'No winning tokens to claim' };
    }

    // ── 3. Build Solana accounts ────────────────────────────
    const { provider } = buildProvider();

    const program = new anchor.Program<EscrowVault>(
      IDL_JSON as EscrowVault,
      provider,
    );

    const marketPubkey  = new PublicKey(market.marketPda);
    const [vaultPda]    = deriveVaultPda(marketPubkey);

    // Fetch on-chain vault — this is the authoritative source for mints and usdc vault
    // Never rely on DB for these — they must match what's on-chain or the tx will fail
    let vaultAccount: Awaited<ReturnType<typeof program.account.escrowVault.fetch>>;
    try {
      vaultAccount = await program.account.escrowVault.fetch(vaultPda);
    } catch (e) {
      console.error('Failed to fetch vault account:', e);
      return { success: false, error: 'Failed to fetch vault from Solana' };
    }

    const yesTokenMint = vaultAccount.yesTokenMint;  // PublicKey
    const noTokenMint  = vaultAccount.noTokenMint;   // PublicKey
    const usdcVault    = vaultAccount.usdcVault;     // PublicKey — the vault's USDC token account

    // hot wallet is the "user" signer — it holds the platform token accounts
    const hotWalletPubkey = provider.wallet.publicKey;

    // Derive associated token accounts for the hot wallet (platform-controlled accounts)
    // These are where YES/NO tokens are held on the platform
    const userYesAccount = await getAssociatedTokenAddress(yesTokenMint, hotWalletPubkey);
    const userNoAccount  = await getAssociatedTokenAddress(noTokenMint,  hotWalletPubkey);
    const userUsdc       = await getAssociatedTokenAddress(USDC_MINT,    hotWalletPubkey);

    console.log('📋 claimPayout accounts:');
    console.log('   vault:          ', vaultPda.toBase58());
    console.log('   market:         ', marketPubkey.toBase58());
    console.log('   usdcVault:      ', usdcVault.toBase58());
    console.log('   userUsdc:       ', userUsdc.toBase58());
    console.log('   yesTokenMint:   ', yesTokenMint.toBase58());
    console.log('   noTokenMint:    ', noTokenMint.toBase58());
    console.log('   userYesAccount: ', userYesAccount.toBase58());
    console.log('   userNoAccount:  ', userNoAccount.toBase58());

    // ── 4. Call Solana claimPayout ──────────────────────────
    let txSignature: string;

    try {
      txSignature = await program.methods
        .claimPayout()          // instruction name from IDL: "claimPayout"
        .accounts({             // must match ALL accounts in your IDL claimPayout instruction
          user:           hotWalletPubkey,
          // @ts-ignore
          vault:          vaultPda,
          market:         marketPubkey,
          usdcVault:      usdcVault,
          userUsdc:       userUsdc,
          yesTokenMint:   yesTokenMint,
          noTokenMint:    noTokenMint,
          userYesAccount: userYesAccount,
          userNoAccount:  userNoAccount,
          tokenProgram:   TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log(`✅ On-chain claimPayout confirmed: ${txSignature}`);

    } catch (e: any) {
      console.error('❌ Solana claimPayout failed:', e);

      // Parse Anchor error for a clean readable message
      const anchorError = anchor.AnchorError.parse(e.logs ?? []);
      const errorMsg = anchorError
        ? `${anchorError.error.errorCode.code}: ${anchorError.error.errorMessage}`
        : (e.message ?? 'Unknown Solana error');

      return { success: false, error: `Solana transaction failed — ${errorMsg}` };
    }

    // ── 5. Atomic DB update — ONLY after on-chain success ───
    // If this fails, on-chain already succeeded.
    // Log it loudly for manual reconciliation — do NOT return error to user.
    try {
      await prisma.$transaction([
        // Credit USDC to user's platform ledger
        prisma.ledger.update({
          where: {
            userId_asset: {
              userId: user.userId,
              asset:  'USDC',
            },
          },
          data: {
            available: { increment: expectedPayout },
          },
        }),

        // Mark position as claimed with tx hash for audit trail
        prisma.position.update({
          where: {
            userId_marketId: {
              userId:   user.userId,
              marketId: params.marketId,
            },
          },
          data: {
            isClaimed:   true,
            claimedAt:   new Date(),
            claimTxHash: txSignature,
          },
        }),
      ]);

      console.log(`💰 DB updated — ${expectedPayout} USDC credited to user ${user.userId}`);

    } catch (dbError) {
      // This is a reconciliation issue — blockchain succeeded but DB didn't update.
      // The user's wallet has their USDC. Alert your team to fix the DB manually.
    // Instead of just logging to console
      await prisma.reconciliationLog.create({
        data: {
          userId:      user.userId,
          marketId:    params.marketId,
          txSignature: txSignature,
          type:        'CLAIM_PAYOUT',
          status:      'PENDING_RECONCILIATION',
          metadata:    JSON.stringify({ expectedPayout, error: String(dbError) }),
        },
      });
      // Still return success — blockchain is source of truth
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

  /**
   * GET /payouts/claimable
   * Returns all resolved, unclaimed positions for the authenticated user.
   */
  .get('/claimable', async ({ user }) => {
    if (!user) throw new Error('Unauthorized User');

    const positions = await prisma.position.findMany({
      where: {
        userId:    user.userId,
        isClaimed: false,
        market: { state: 'RESOLVED' },
      },
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

        return {
          marketId:       p.marketId,
          marketQuestion: p.market.question,
          outcome:        p.market.outcome,
          yesTokens,
          noTokens,
          payout,
        };
      })
      .filter(p => p.payout > 0);

    return { success: true, data: claimable };
  });