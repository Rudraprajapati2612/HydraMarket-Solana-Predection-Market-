use anyhow::Ok;
use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct  MintRequest{
    pub trade_id : String,
    pub market_id : String,
    pub yes_user_id : String,
    pub no_user_id : String,
    pub pairs : String,
    pub usdc_vault:String,
    pub yes_price : String,
    pub no_price : String,
    pub market_pda : String,
    #[serde(default)]
    pub yes_order_id: Option<String>,
    #[serde(default)]
    pub no_order_id : Option<String>,
    #[serde(default)]
    pub yes_reservation_id: Option<String>,
    #[serde(default)]
    pub no_reservation_id: Option<String>,
    pub escrow_vault_pda : String,
    pub yes_token_mint : String,
    pub no_token_mint : String,
    pub timestamp : Option<String>
}

impl  MintRequest  {
    pub fn pairs_as_u64(&self) -> anyhow::Result<u64>{
        Ok(self.pairs.parse()?)
    }

    pub fn collateral_amount(&self)->anyhow::Result<u64>{
        
        let pairs = self.pairs_as_u64()?;

        Ok(pairs * 1_000_000)
    }
}