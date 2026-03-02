use anyhow::Result;
use solana_sdk::pubkey::Pubkey;
use std::{str::FromStr, sync::Arc};
use tracing::{error, info, warn};

mod config;
mod redis_client;
mod solana_client;
mod database;
mod types;

use config::Config;
use redis_client::RedisClient;
use solana_client::SolanaClient;
use database::Database;
use types::MintRequest;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    
    info!("🚀 Starting Settlement Worker");
    
    // Load config
    let config = Config::from_env()?;
    
    // Initialize Redis client
    let redis = Arc::new(RedisClient::new(&config.redis_url, &config.mint_queue_key)?);
    info!("✅ Connected to Redis: {}", config.redis_url);
    
    // Initialize Solana client
    let solana = Arc::new(SolanaClient::new(
        &config.solana_rpc_url,
        config.treasury_keypair,
        config.escrow_program_id,
        config.usdc_mint,
        Pubkey::from_str("H42DouiugXCKGn9sHrC7N6PtvRQFwwDLZsHJW1Q58N2h")?
    ));
    info!("✅ Connected to Solana: {}", config.solana_rpc_url);
    info!("✅ Treasury wallet: {}", solana.treasury_pubkey());
    
    // Initialize database
    let database = Arc::new(Database::connect(&config.database_url).await?);
    info!("✅ Connected to database");
    
    info!("✅ Settlement Worker ready - listening for mint requests...");
    
    // Main processing loop
    loop {
        match redis.pop_mint_request(1.0).await {
            Ok(Some(request)) => {
                info!("📥 Received mint request: {}", request.trade_id);
                
                // Process settlement
                match process_settlement(
                    request.clone(),
                    redis.clone(),
                    solana.clone(),
                    database.clone(),
                    config.max_retries,
                ).await {
                    Ok(signature) => {
                        info!("✅ Settlement complete: {}", signature);
                    }
                    Err(e) => {
                        error!("❌ Settlement failed: {}", e);
                        
                        // Push to failed queue for manual review
                        if let Err(e) = redis.push_failed(&request, &e.to_string()).await {
                            error!("Failed to push to retry queue: {}", e);
                        }
                    }
                }
            }
            Ok(None) => {
                // Timeout, no message - continue loop
            }
            Err(e) => {
                error!("Redis error: {}", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn process_settlement(
    request: MintRequest,
    redis: Arc<RedisClient>,
    solana: Arc<SolanaClient>,
    database: Arc<Database>,
    _max_retries: u32,
) -> Result<String> {
    let settlement_id = &request.trade_id;
    
    // 1. Check idempotency
    if redis.is_processed(settlement_id).await? {
        info!("⏭️  Settlement {} already processed, skipping", settlement_id);
        return Ok("already_processed".to_string());
    }
    
    // 2. Parse pairs
    let pairs = request.pairs_as_u64()?;
    
    info!("🔨 Processing settlement: {} pairs", pairs);
    
    // 3. Call Solana: mint_pairs
    info!("📡 Calling Solana: mint_pairs");
    
    let (signature, yes_token_account, no_token_account) = solana.mint_pairs(
        &request.market_pda,
        &request.escrow_vault_pda,
        &request.usdc_vault,
        &request.yes_token_mint,
        &request.no_token_mint,
        &request.yes_user_id,
        &request.no_user_id,
        pairs,
    ).await?;
    
    info!("✅ Blockchain confirmed: {}", signature);
    
    // 4. Mark as processed in Redis
    redis.marked_processed(settlement_id, &signature.to_string()).await?;
    
    // 5. Store token accounts in database
    database.store_token_accounts(
        &request.yes_user_id,
        &request.market_id,
        Some(&yes_token_account),
        None,
    ).await?;
    
    database.store_token_accounts(
        &request.no_user_id,
        &request.market_id,
        None,
        Some(&no_token_account),
    ).await?;
    
    // 6. Update positions
    info!("📝 Updating database...");
    
    database.update_positions(
        &request.yes_user_id,
        &request.no_user_id,
        &request.market_id,
        pairs,
        &request.yes_price,
        &request.no_price,
    ).await?;
    
    // 7. Calculate amounts and release reservations
    let yes_amount = (request.pairs.parse::<f64>()? * request.yes_price.parse::<f64>()?).round() as u64;
    let no_amount = (request.pairs.parse::<f64>()? * request.no_price.parse::<f64>()?).round() as u64;
    
    database.release_reservations(
        &request.yes_user_id,
        &request.no_user_id,
        yes_amount,
        no_amount,
    ).await?;
    
    // 8. Mark orders as FILLED
    let yes_order_id = request
        .yes_reservation_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .or(request.yes_order_id.as_deref().filter(|s| !s.is_empty()));
    if let Some(yes_order_id) = yes_order_id {
        let updated = database.mark_order_filled(yes_order_id).await?;
        if !updated {
            warn!(
                "Order {} not found for settlement {}, skipping YES order fill update",
                yes_order_id, settlement_id
            );
        }
    } else {
        warn!(
            "Missing YES canonical order id (yes_reservation_id/yes_order_id) for settlement {}, skipping order fill update",
            settlement_id
        );
    }

    let no_order_id = request
        .no_reservation_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .or(request.no_order_id.as_deref().filter(|s| !s.is_empty()));
    if let Some(no_order_id) = no_order_id {
        let updated = database.mark_order_filled(no_order_id).await?;
        if !updated {
            warn!(
                "Order {} not found for settlement {}, skipping NO order fill update",
                no_order_id, settlement_id
            );
        }
    } else {
        warn!(
            "Missing NO canonical order id (no_reservation_id/no_order_id) for settlement {}, skipping order fill update",
            settlement_id
        );
    }
    
    info!("✅ Settlement complete: {}", settlement_id);
    
    Ok(signature.to_string())
}