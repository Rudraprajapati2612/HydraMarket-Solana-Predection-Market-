import "dotenv/config"
import { DepositeIndexer } from './service/DepositIndexer';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL!;
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS!;
const USDC_MINT = process.env.USDC_MINT_ADDRESS!;

if (!SOLANA_RPC_URL || !HOT_WALLET_ADDRESS || !USDC_MINT) {
  console.error('Missing environment variables!');
  console.error('   Required: SOLANA_RPC_URL, HOT_WALLET_ADDRESS, USDC_MINT_ADDRESS');
  process.exit(1);
}

async function main(){

    console.log("Starting indexer service");
    console.log(`RPC: ${SOLANA_RPC_URL}`);
    console.log(`Hot Wallet: ${HOT_WALLET_ADDRESS}`);
    console.log(`USDC Mint: ${USDC_MINT}\n`);
    
    
    const indexer = new DepositeIndexer(SOLANA_RPC_URL,HOT_WALLET_ADDRESS,USDC_MINT);

    await indexer.start();

    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        indexer.stop();
        process.exit(0);
      });
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});