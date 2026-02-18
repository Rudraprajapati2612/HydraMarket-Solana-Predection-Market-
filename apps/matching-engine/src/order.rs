use chrono::{DateTime,Utc};
use rust_decimal::Decimal;
use serde::{Serialize,Deserialize};
use uuid::Uuid;
#[derive(Debug, Clone, Serialize, Deserialize)]

pub struct  Order{
    pub order_id : Uuid,
    pub user_id : Uuid,
    pub market_id : Uuid,
    pub side : OrderSide,
    pub outcome : Outcome,
    pub order_type : OrderType,
    pub price : Decimal,
    pub quantity : Decimal,
    pub filled : Decimal,
    pub order_status : OrderStatus,
    pub reservation_id : Option<String>,
    pub created_at : DateTime<Utc>,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]

pub enum OrderSide {
    BUY,    
    SELL
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Outcome {
    YES,
    NO,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum  OrderType {
    LIMIT,
    MARKET,
    POSTONLY,    
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]

pub enum OrderStatus {
    PENDING,
    OPEN,
    PARTIAL,
    FILLED,
    CANCELLED,    
}

impl  Order {
    
    pub fn remaining(&self)->Decimal{
        self.quantity - self.filled
    }

    pub fn is_filled(&self) -> bool{
        self.filled >= self.quantity
    }
}