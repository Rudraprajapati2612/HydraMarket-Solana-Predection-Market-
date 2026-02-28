import dotenv from 'dotenv';
import cron from 'node-cron';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { ResolutionService } from './services/resolution-service';

dotenv.config();

async function main() {
  console.log('🔧 Starting Resolution Adapter Worker');

  // Load configuration
  const rpcUrl = process.env.SOLANA_RPC_URL || '<https://api.devnet.solana.com>';
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY!;
  const resolutionProgramId = new PublicKey(process.env.RESOLUTION_ADAPTER_PROGRAM_ID!);
  const marketProgramId = new PublicKey(process.env.MARKET_REGISTRY_PROGRAM_ID!);
  const usdcMint = new PublicKey(process.env.USDC_MINT!);
  const rapidApiKey = process.env.RAPIDAPI_CRICKET_KEY || '';

  // Load admin keypair
  const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminPrivateKey));

  console.log('✅ Configuration loaded');
  console.log(`   Admin: ${adminKeypair.publicKey.toBase58()}`);
  console.log(`   RPC: ${rpcUrl}`);

  // Initialize service
  const resolutionService = new ResolutionService(
    rpcUrl,
    adminKeypair,
    resolutionProgramId,
    marketProgramId,
    usdcMint,
    rapidApiKey
  );

  // Run immediately on startup
  console.log('\\n🔍 Running initial check...');
  await processMarkets(resolutionService);

  // Schedule cron job (every hour)
  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';
  cron.schedule(schedule, async () => {
    console.log('\\n⏰ Scheduled check triggered');
    await processMarkets(resolutionService);
  });

  console.log(`\\n✅ Resolution Adapter running (schedule: ${schedule})`);
  console.log('   Press Ctrl+C to stop');
}

async function processMarkets(service: ResolutionService) {
  try {
    const resolved = await service.processExpiredMarkets();
    console.log(`\\n✅ Processed ${resolved} market(s)`);
  } catch (error) {
    console.error('❌ Error processing markets:', error);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down Resolution Adapter...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n👋 Shutting down Resolution Adapter...');
  process.exit(0);
});

main().catch(console.error);