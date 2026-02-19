use anyhow::Result;
use dashmap::DashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

mod config;
mod order;
mod orderbook;
mod matcher;
mod trade;
mod redis_client;
mod grpc_server;

use config::Config;
use orderbook::OrderBook;
use redis_client::RedisClient;
use grpc_server::start_grpc_server;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    
    info!("🚀 Starting Matching Engine (Rust)");
    
    // Load config
    let config = Config::from_env()?;
    
    // Initialize Redis
    let redis = Arc::new(RedisClient::new(&config.redis_url)?);
    redis.ping().await?;
    info!("✅ Redis connected: {}", config.redis_url);
    
    // Create orderbooks (shared state)
    let orderbooks: Arc<DashMap<String, Arc<OrderBook>>> = Arc::new(DashMap::new());
    
    info!("✅ Matching engine ready");
    
    // Start gRPC server
    let addr: SocketAddr = format!("0.0.0.0:{}", config.grpc_port).parse()?;
    info!("🌐 gRPC server starting on {}", addr);
    
    start_grpc_server(addr, orderbooks, redis).await?;
    
    Ok(())
}