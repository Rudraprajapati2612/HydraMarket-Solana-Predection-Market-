use chrono::{Date, DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::order::{OrderSide, Outcome};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct  Trade{
    pub trade_id : Uuid,
    pub market_id : String,
    pub outcome : Outcome,
    pub trade_type : TradeType,
    pub buyer_id : String,
    pub seller_id : String,
    pub quantity : Decimal,
    pub price  : Decimal,
    pub buyer_order_id : Uuid,
    pub seller_order_id : Uuid,
    pub buyer_reservation_id : Option<String>,
    pub seller_reservation_id : Option<String>,
    pub timestamp : DateTime<Utc>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradeType {
    SECONDARY,      // Transfer existing tokens (no blockchain)
    COMPLEMENTARY,      
}

impl  TradeType {
    pub fn determine(
        buyer_side : OrderSide,
        buyer_outcome : Outcome,
        seller_side : OrderSide,
        seller_outcome : Outcome
    )->Self{
        match(buyer_side,seller_side,buyer_outcome,seller_outcome){
            (OrderSide::BUY,OrderSide::BUY,Outcome::YES,Outcome::NO)=>{
                TradeType::COMPLEMENTARY
            }

            (OrderSide::BUY,OrderSide::SELL,Outcome::NO,Outcome::YES)=>{
                TradeType::COMPLEMENTARY
            }

            (OrderSide::BUY,OrderSide::SELL,a,b) if a == b =>{
                TradeType::SECONDARY
            }

            _=> TradeType::SECONDARY
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct  ComplementaryMatch{
    pub trade_id : Uuid,
    pub market_id : String,
    pub yes_buyer_id : String,
    pub no_buyer_id : String,
    pub quantity : Decimal,
    pub yes_price: Decimal,
    pub no_price : Decimal,
    pub yes_order_id : Uuid,
    pub no_order_id : Uuid,
    pub yes_reservation_id : Option<String>,
    pub no_reservation_id : Option<String>,
    pub timestamp : DateTime<Utc>, 
}

impl ComplementaryMatch {
    pub fn collateral_required(&self) -> Decimal {
        self.quantity // 1:1 ratio (1 token = 1 USDC collateral)
    }
}
