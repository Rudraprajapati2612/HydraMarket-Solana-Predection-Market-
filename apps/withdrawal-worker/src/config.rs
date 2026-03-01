use anyhow::Result;
use solana_sdk::signature::Keypair;
use std::env;

pub struct Config {
    pub solana_rpc_url: String,
    pub hot_wallet: Keypair,
    pub database_url: String,
    pub poll_interval_ms: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let hot_wallet_key = env::var("HOT_WALLET_PRIVATE_KEY")?;
        let key_bytes = bs58::decode(hot_wallet_key).into_vec()?;
        let hot_wallet = Keypair::from_bytes(&key_bytes)?;

        Ok(Self {
            solana_rpc_url: env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "<https://api.devnet.solana.com>".to_string()),
            hot_wallet,
            database_url: env::var("DATABASE_URL")?,
            poll_interval_ms: env::var("POLL_INTERVAL_MS")
                .unwrap_or_else(|_| "5000".to_string())
                .parse()
                .unwrap_or(5000),
        })
    }
}