use anyhow::Result;
use dashmap::DashMap;
use rust_decimal::Decimal;
use std::str::FromStr;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use tracing::info;
use uuid::Uuid;
use chrono::Utc;

use crate::matcher::Matcher;
use crate::order::{Order, OrderSide, OrderStatus, OrderType, Outcome};
use crate::orderbook::OrderBook;
use crate::redis_client::RedisClient;

pub mod matching_engine {
    tonic::include_proto!("matching_engine");
}

use matching_engine::matching_engine_server::{MatchingEngine, MatchingEngineServer};
use matching_engine::*;

pub struct MatchingEngineService {
    orderbooks: Arc<DashMap<String, Arc<OrderBook>>>,
    redis: Arc<RedisClient>,
}

#[tonic::async_trait]
impl MatchingEngine for MatchingEngineService {
    async fn place_order(
        &self,
        request: Request<PlaceOrderRequest>,
    ) -> Result<Response<PlaceOrderResponse>, Status> {
        let req = request.into_inner();
        
        info!("📥 PlaceOrder: {}, {}", req.user_id, req.market_id);
        
        // Get/create orderbook
        let orderbook = self.orderbooks
            .entry(req.market_id.clone())
            .or_insert_with(|| Arc::new(OrderBook::new(req.market_id.clone())))
            .clone();
        
        // Parse order
        let order = Order {
            order_id: Uuid::new_v4(),
            user_id: req.user_id,
            market_id: req.market_id,
            side: match req.side.as_str() {
                "BUY" => OrderSide::BUY,
                "SELL" => OrderSide::SELL,
                _ => return Err(Status::invalid_argument("Invalid side")),
            },
            outcome: match req.outcome.as_str() {
                "YES" => Outcome::YES,
                "NO" => Outcome::NO,
                _ => return Err(Status::invalid_argument("Invalid outcome")),
            },
            order_type: match req.order_type.as_str() {
                "LIMIT" => OrderType::LIMIT,
                "MARKET" => OrderType::MARKET,
                "POSTONLY" => OrderType::POSTONLY,
                _ => return Err(Status::invalid_argument("Invalid order type")),
            },
            price: Decimal::from_str(&req.price).map_err(|_| Status::invalid_argument("Invalid price"))?,
            quantity: Decimal::from_str(&req.quantity).map_err(|_| Status::invalid_argument("Invalid quantity"))?,
            filled: Decimal::ZERO,
            order_status: OrderStatus::PENDING,
            reservation_id: req.reservation_id,
            created_at: Utc::now(),
        };
        
        // Match
        let matcher = Matcher::new((*orderbook).clone());
        let result = matcher.place_order(order).map_err(|e| Status::internal(e.to_string()))?;
        
        info!("✅ Matched: trades={}, cmatch={}", result.trades.len(), result.complementary_matches.len());
        
        let trades = result
        .trades
        .iter()
        .map(|t| Trade {
            trade_id: t.trade_id.to_string(),
            buyer_id: t.buyer_id.clone(),
            seller_id: t.seller_id.clone(),
            quantity: t.quantity.to_string(),
            price: t.price.to_string(),
            market_id : t.market_id.to_string(),
            outcome : format!("{:?}",t.outcome),
            trade_type : format!("{:?}",t.trade_type),
            timestamp : t.timestamp.to_string()
        })
        .collect();
    
    // ✅ FIX: Actually build the complementary_matches array
    let complementary_matches = result
        .complementary_matches
        .iter()
        .map(|c| ComplementaryMatch {
            trade_id: c.trade_id.to_string(),
            yes_buyer_id: c.yes_buyer_id.clone(),
            no_buyer_id: c.no_buyer_id.clone(),
            quantity: c.quantity.to_string(),
            yes_price: c.yes_price.to_string(),
            no_price: c.no_price.to_string(),
            market_id : c.market_id.to_string(),
            timestamp : c.timestamp.to_string()
        })
        .collect();
    
        Ok(Response::new(PlaceOrderResponse {
            order_id: result.order.order_id.to_string(),
            status: format!("{:?}", result.order.order_status),
            trades,                      // ✅ Now populated
            complementary_matches,       // ✅ Now populated
        }))
    }
    
    async fn get_orderbook(
        &self,
        request: Request<GetOrderbookRequest>,
    ) -> Result<Response<GetOrderbookResponse>, Status> {
        let req = request.into_inner();
        let orderbook = self.orderbooks.get(&req.market_id).ok_or(Status::not_found("Market not found"))?;
        let outcome = match req.outcome.as_str() {
            "YES" => Outcome::YES,
            "NO" => Outcome::NO,
            _ => return Err(Status::invalid_argument("Invalid outcome")),
        };
        let depth = orderbook.get_depth(outcome, 10);
        Ok(Response::new(GetOrderbookResponse { bids: vec![], asks: vec![] }))
    }
}

pub async fn start_grpc_server(
    addr: std::net::SocketAddr,
    orderbooks: Arc<DashMap<String, Arc<OrderBook>>>,
    redis: Arc<RedisClient>,
) -> Result<()> {
    let service = MatchingEngineService { orderbooks, redis };
    tonic::transport::Server::builder()
        .add_service(MatchingEngineServer::new(service))
        .serve(addr)
        .await?;
    Ok(())
}