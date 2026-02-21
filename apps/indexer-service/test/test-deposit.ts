// test-deposit.ts
import "dotenv/config"
import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
    createTransferCheckedInstruction,
    getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';

import bs58 from 'bs58';

// --------------------
// CONFIG
// --------------------
const RPC = process.env.SOLANA_RPC_URL;
if (!RPC) {
    throw new Error('❌ RPC missing in env');
}
const connection = new Connection(RPC, 'confirmed');

// Load Phantom private key (Base58)
if (!process.env.PHANTOM_PRIVATE_KEY) {
    throw new Error('❌ PHANTOM_PRIVATE_KEY missing in env');
}

const phantomKeypair = Keypair.fromSecretKey(
    bs58.decode(process.env.PHANTOM_PRIVATE_KEY)
);

// Your setup
const HOT_WALLET = new PublicKey(
    '6oktp2QmgQgmxKxzBfgTGD11T1VwmQx8Gxkg8gcUMG72'
);

const USDC_MINT = new PublicKey(
    'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
);

const MEMO = 'DEP-95F2A5'; // Your memo

// --------------------
// TEST DEPOSIT
// --------------------
async function testDeposit() {
    console.log('🧪 Testing USDC deposit from Phantom → Hot Wallet\n');

    console.log('1️⃣ Resolving token accounts...');

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        phantomKeypair,
        USDC_MINT,
        phantomKeypair.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        phantomKeypair,
        USDC_MINT,
        HOT_WALLET
    );

    console.log('   From (Phantom ATA):', fromTokenAccount.address.toBase58());
    console.log('   To   (Hot ATA):', toTokenAccount.address.toBase58());

    console.log('\n2️⃣ Building transaction...');

    const tx = new Transaction();

    // ✅ CRITICAL: Add MEMO FIRST
    const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    
    tx.add(
        new TransactionInstruction({
            programId: MEMO_PROGRAM_ID,
            keys: [],
            data: Buffer.from(MEMO, 'utf-8'),
        })
    );

    // ✅ Then add USDC transfer using transferChecked (more reliable)
    tx.add(
        createTransferCheckedInstruction(
            fromTokenAccount.address,      // source
            USDC_MINT,                     // mint
            toTokenAccount.address,        // destination
            phantomKeypair.publicKey,      // owner
            100 * 1_000_000,                // amount (50 USDC)
            6                              // decimals
        )
    );

    console.log('\n3️⃣ Sending transaction...');
    console.log('   From:', phantomKeypair.publicKey.toBase58());
    console.log('   To  :', HOT_WALLET.toBase58());
    console.log('   Amount: 100 USDC');
    console.log('   Memo  :', MEMO);

    const signature = await sendAndConfirmTransaction(
        connection,
        tx,
        [phantomKeypair],
        { 
            commitment: 'confirmed',
            preflightCommitment: 'confirmed'
        }
    );

    console.log('\n✅ Transaction confirmed!');
    console.log('   Signature:', signature);
    console.log(
        `   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

    // Verify memo is on chain
    console.log('\n🔍 Verifying memo on-chain...');
    const txDetails = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
    });

    const memoInstruction = txDetails?.transaction.message.instructions.find(
        (inst) => 
            ('programId' in inst && inst.programId.toBase58() === MEMO_PROGRAM_ID.toBase58()) ||
            ('program' in inst && inst.program === 'spl-memo')
    );

    if (memoInstruction) {
        console.log('   ✅ Memo instruction found on-chain!');
        console.log('   ', JSON.stringify(memoInstruction, null, 2));
    } else {
        console.log('   ❌ WARNING: Memo instruction NOT found on-chain!');
    }

    console.log('\n👀 Check your indexer logs now');
}

testDeposit().catch((err) => {
    console.error('❌ Deposit failed:', err);
});

