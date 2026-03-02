// scripts/settle-market.ts
import dotenv from "dotenv/config"
import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import IDL_JSON from '../idl/escrow_vault.json';
import type { EscrowVault } from '../tsIdl/escrow_vault';

const ESCROW_VAULT_PROGRAM_ID = new PublicKey('CRyAfXPmf11myj8X1dZ3AdjSfwXEjB5Ep4HpXmf6D6QP');
const MARKET_REGISTRY_PROGRAM = new PublicKey('H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h');
const ESCROW_VAULT_SEED = Buffer.from('escrow_vault');

async function settleMarket(marketPda: string) {
  const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
  const secretKey  = bs58.decode(process.env.HOT_WALLET_PRIVATE_KEY!);
  const hotWallet  = Keypair.fromSecretKey(secretKey);
  const wallet     = new anchor.Wallet(hotWallet);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const program = new anchor.Program<EscrowVault>(IDL_JSON as EscrowVault, provider);

  const marketPubkey = new PublicKey(marketPda);
  const [vaultPda]   = PublicKey.findProgramAddressSync(
    [ESCROW_VAULT_SEED, marketPubkey.toBuffer()],
    ESCROW_VAULT_PROGRAM_ID,
  );

  // Check current vault state before settling
  const vault = await program.account.escrowVault.fetch(vaultPda);
  console.log('Vault isSettled:', vault.isSettled);

  if (vault.isSettled) {
    console.log('✅ Vault already settled');
    return;
  }

  const tx = await program.methods
    .settle()
    .accounts({
      authority: hotWallet.publicKey,
      // @ts-ignore
      vault:                 vaultPda,
      market:                marketPubkey,
      marketRegistryProgram: MARKET_REGISTRY_PROGRAM,
    })
    .rpc();

  console.log('✅ Vault settled! tx:', tx);
}

// Pass your marketPda from the DB
settleMarket(process.env.MARKET_PDA!);