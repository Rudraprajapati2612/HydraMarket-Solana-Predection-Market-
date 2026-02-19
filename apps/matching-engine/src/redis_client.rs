use anyhow::{Ok, Result};
use redis::aio::Connection;
use redis::{AsyncCommands, Client};
use tracing::info;


pub struct RedisClient{
    client : Client
}

impl RedisClient{
    pub fn new(url : &str)->Result<Self>{
        let client = Client::open(url)?;
        Ok(Self { client })
    }

    pub async fn get_connection(&self) -> Result<Connection>{
        Ok(self.client.get_async_connection().await?)
    }

    pub async  fn ping(&self) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let pong: String = redis::cmd("PING").query_async(&mut conn).await?;
        info!("Redis PING: {}", pong);
        Ok(())
    }

    pub async fn cache_trade(&self,market_id:&str,trade_json:&str)-> Result<()>{
        let mut conn = self.get_connection().await?;
        let key = format!("trades:recent:{}", market_id);
        
        let _: () = conn.lpush(&key, trade_json).await?;
        let _: () = conn.ltrim(&key, 0, 49).await?;
        
        Ok(())
    }
}

