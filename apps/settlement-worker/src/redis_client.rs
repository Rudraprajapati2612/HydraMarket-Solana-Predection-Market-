use anyhow::{Ok, Result};
use redis::aio::{Connection, MultiplexedConnection};
use redis::{AsyncCommands, Client};
use tracing::{error, info};

use crate::types::MintRequest;


pub struct RedisClient{
    client : Client,
    mint_queue_key : String 
}

impl RedisClient {
    pub fn new(url:&str,queue_key:&str)->Result<Self>{
        let client = Client::open(url)?;

        Ok(Self { client,
             mint_queue_key: queue_key.to_string()
        })
    }

    pub async  fn get_connection(&self)->Result<MultiplexedConnection>{
        Ok(self.client.get_multiplexed_async_connection().await?)
    }

    pub async fn pop_mint_request(&self, timeout: f64) -> Result<Option<MintRequest>> {
        let mut conn = self.get_connection().await?;
        
        // BRPOP returns (key, value) or None if timeout
        let result: Option<(String, String)> = conn
            .brpop(&self.mint_queue_key, timeout)
            .await?;
        
        match result {
            Some((_, json)) => {
                let request: MintRequest = serde_json::from_str(&json)?;
                Ok(Some(request))
            }
            None => Ok(None),
        }
    }

    pub async fn is_processed(&self,settlement_id:&str) -> Result<bool>{
        let mut conn = self.get_connection().await?;

        let key = format!("processed:settlement:{}",settlement_id);

        let exist = conn.exists(key).await?;

        Ok(exist)
    }

    pub async  fn marked_processed(&self,settlement_id:&str,tx_signature:&str) -> Result<()>{
        let mut conn = self.get_connection().await?;

        let key = format!("processed:settlement:{}",settlement_id);

        let _: () = conn.set_ex(&key, tx_signature, 86400).await?;
        
        info!("Marked settlement {} as processed", settlement_id);
        Ok(())
    }

    pub async fn push_failed(&self,request:&MintRequest,err_msg:&str)->Result<()>{
        let mut conn = self.get_connection().await?;
        let retry_data = serde_json::json!({
            "request":request,
            "error" : err_msg,
            "timestamp":chrono::Utc::now().to_rfc3339()
        });

        let _: () = conn
        .lpush("mint:failed", serde_json::to_string(&retry_data)?)
        .await?;
        
        error!("❌ Pushed failed settlement to retry queue: {}", request.trade_id);
        Ok(())
    }
    
}


