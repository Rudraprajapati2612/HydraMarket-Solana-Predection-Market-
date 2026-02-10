import "dotenv/config";
import { DepositIndexer } from './service/DepositIndexer';
import { Elysia } from 'elysia';
import { webhookRoute, setIndexer } from './service/webhook';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL!;
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS!;
const USDC_MINT = process.env.USDC_MINT_ADDRESS!;
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || "3001");

if (!SOLANA_RPC_URL || !HOT_WALLET_ADDRESS || !USDC_MINT) {
  console.error('Missing environment variables!');
  console.error('   Required: SOLANA_RPC_URL, HOT_WALLET_ADDRESS, USDC_MINT_ADDRESS');
  process.exit(1);
}

async function main() {
  console.log("Starting indexer service");
  console.log(`RPC: ${SOLANA_RPC_URL}`);
  console.log(`Hot Wallet: ${HOT_WALLET_ADDRESS}`);
  console.log(`USDC Mint: ${USDC_MINT}\n`);
  
  // Initialize indexer
  const indexer = new DepositIndexer(SOLANA_RPC_URL, HOT_WALLET_ADDRESS, USDC_MINT);
  
  // Set indexer for webhook
  setIndexer(indexer);
  
  // Start polling
  await indexer.start();
  
  // Start webhook server
  const app = new Elysia()
    .use(webhookRoute)
    .listen(WEBHOOK_PORT);
  
  console.log(`🌐 Webhook server running on port ${WEBHOOK_PORT}`);
  console.log(`   Endpoint: http://localhost:${WEBHOOK_PORT}/webhooks/helius\n`);

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    indexer.stop();
    app.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});