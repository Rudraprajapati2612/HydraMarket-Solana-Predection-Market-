use anyhow::Result;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use std::env;
use std::str::FromStr;

pub struct Config {
    // Redis
    pub redis_url: String,
    pub mint_queue_key: String,
    
    // Solana
    pub solana_rpc_url: String,
    pub treasury_keypair: Keypair,
    pub escrow_program_id: Pubkey,
    pub usdc_mint: Pubkey,
    
    // Database
    pub database_url: String,
    
    // Worker settings
    pub batch_size: usize,
    pub poll_interval_ms: u64,
    pub max_retries: u32,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv::dotenv().ok();
        
        // Load treasury private key from env
        let treasury_key_bytes = env::var("TREASURY_PRIVATE_KEY")
            .expect("TREASURY_PRIVATE_KEY not set");
        let key_bytes = bs58::decode(treasury_key_bytes).into_vec()?;
        let treasury_keypair = Keypair::from_bytes(&key_bytes)?;
        
        // Load escrow program ID
        let escrow_program_id = Pubkey::from_str(
            &env::var("ESCROW_PROGRAM_ID").expect("ESCROW_PROGRAM_ID not set")
        )?;

        let usdc_mint = Pubkey::from_str(
            &env::var("USDC_MINT_ADDRESS").expect("USDC_MINT_ADDRESS not set")
        )?;
        
        Ok(Self {
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            mint_queue_key: env::var("MINT_QUEUE_KEY")
                .unwrap_or_else(|_| "mint:queue".to_string()),
            solana_rpc_url: env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string()),
            treasury_keypair,
            escrow_program_id,
            usdc_mint,
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL not set"),
            batch_size: env::var("BATCH_SIZE")
                .unwrap_or_else(|_| "1".to_string())
                .parse()
                .unwrap_or(1),
            poll_interval_ms: env::var("POLL_INTERVAL_MS")
                .unwrap_or_else(|_| "1000".to_string())
                .parse()
                .unwrap_or(1000),
            max_retries: env::var("MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
        })
    }
}
