use anyhow::{Result};
use dashmap::DashMap;
use ordered_float::OrderedFloat;
use rust_decimal::Decimal;
use tonic::transport::Body;
use std::collections::{BTreeMap,VecDeque};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use crate::order::{self, Order, OrderSide, Outcome};

type PriceLevel = BTreeMap<Decimal,VecDeque<Order>>;

pub struct  OrderBook{
    pub market_id :String,

    pub yes_bids : Arc<RwLock<PriceLevel>>,
    pub yes_asks : Arc<RwLock<PriceLevel>>,
    pub no_bids : Arc<RwLock<PriceLevel>>,
    pub no_asks : Arc<RwLock<PriceLevel>>,

    pub orders : Arc<DashMap<Uuid,Order>>

}

impl  Clone for OrderBook {
    fn clone(&self) -> Self {
        Self{ 
            market_id : self.market_id.clone(),
            yes_bids : Arc::clone(&self.yes_bids),
            yes_asks : Arc::clone(&self.yes_asks),
            no_bids: Arc::clone(&self.no_bids),
            no_asks : Arc::clone(&self.no_asks),
            orders : Arc::clone(&self.orders)
        }
    }
}

impl OrderBook{
    pub fn new(market_id:String)->Self{
        Self{ 
            market_id,
            yes_bids:  Arc::new(RwLock::new(BTreeMap::new())),
            yes_asks : Arc::new(RwLock::new(BTreeMap::new())),
            no_bids:   Arc::new(RwLock::new(BTreeMap::new())),
            no_asks :  Arc::new(RwLock::new(BTreeMap::new())),
            orders :  Arc::new(DashMap::new())
        }
    }

    // Higest buy price 
    pub fn best_bid(&self,outcome:Outcome)->Option<Decimal>{
        let bids = self.get_bids(outcome);
        let book = bids.read().unwrap();

        book.iter().rev()
             .find(|(_,orders)| !orders.is_empty())
             .map(|(price,_)| *price)
    }
    // Best sell order means Lowes amoung all the price 
    pub fn best_ask(&self,outcome:Outcome)->Option<Decimal>{
        let asks = self.get_asks(outcome);

        let book = asks.read().unwrap();

        book.iter()
            .find(|(_,orders)| !orders.is_empty())
            .map(|(price,_)| *price)
    }


    pub fn add_order(&self,order:Order) {
        // it checks that in which order book we need to add the order or we can say the change the orderbook?
        let book = self.get_side_mut(order.side, order.outcome);
        // Then in this we will give a write Permission to That order book 
        let mut book_guard = book.write().unwrap(); 

        book_guard.entry(order.price)
                  .or_insert_with(VecDeque::new).
                  push_back(order.clone());

        self.orders.insert(order.order_id, order);
    }

    pub fn remove_order(&self, order_id: Uuid) -> Option<Order> {
        // O(1) lookup in DashMap
        let (_, order) = self.orders.remove(&order_id)?;
        
        // O(log n) lookup in BTreeMap + O(n) removal from VecDeque
        let book = self.get_side_mut(order.side, order.outcome);
        let mut book_guard = book.write().unwrap();
        
        if let Some(queue) = book_guard.get_mut(&order.price) {
            queue.retain(|o| o.order_id != order_id);
            
            // Clean up empty price levels
            if queue.is_empty() {
                book_guard.remove(&order.price);
            }
        }
        
        Some(order)
    }
    // get best sell price it means it get Lowest sell price 
    pub fn pop_best_ask(&self,outcome:Outcome) -> Option<Order>{
        let ask = &self.get_asks(outcome);
        let mut book = ask.write().unwrap();

        let best_price = book.iter()
                                 .find(|(_,orders)| !orders.is_empty())
                                 .map(|(price, _)| *price)?;
         
        let queue = book.get_mut(&best_price)?;
        let order = queue.pop_front()?;
        
        // Clean up empty level
        if queue.is_empty() {
            book.remove(&best_price);
        }
        
        // Remove from orders map
        self.orders.remove(&order.order_id);
        
        Some(order)
    }

    /// Pop best bid (for sell order matching)
    /// Returns the front order at the best bid price
    pub fn pop_best_bid(&self, outcome: Outcome) -> Option<Order> {
        let bids = self.get_bids(outcome);
        let mut book = bids.write().unwrap();
        
        // Find highest price with orders (reverse iteration)
        let best_price = book
            .iter()
            .rev()
            .find(|(_, orders)| !orders.is_empty())
            .map(|(price, _)| *price)?;
        
        let queue = book.get_mut(&best_price)?;
        let order = queue.pop_front()?;
        
        // Clean up empty level
        if queue.is_empty() {
            book.remove(&best_price);
        }
        
        // Remove from orders map
        self.orders.remove(&order.order_id);
        
        Some(order)
    }


    pub fn peek_best_ask(&self, outcome: Outcome) -> Option<Order> {
        let asks = self.get_asks(outcome);
        let book = asks.read().unwrap();
        
        book.iter()
            .find(|(_, orders)| !orders.is_empty())
            .and_then(|(_, orders)| orders.front().cloned())
    }
    
    /// Peek at best bid without removing
    pub fn peek_best_bid(&self, outcome: Outcome) -> Option<Order> {
        let bids = self.get_bids(outcome);
        let book = bids.read().unwrap();
        
        book.iter()
            .rev()
            .find(|(_, orders)| !orders.is_empty())
            .and_then(|(_, orders)| orders.front().cloned())
    }


    /// Get full orderbook depth (for UI display)
    pub fn get_depth(
        &self,
        outcome: Outcome,
        levels: usize,
    ) -> OrderbookDepth {
        let bids_book = self.get_bids(outcome);
        let asks_book = self.get_asks(outcome);
        
        let bids_guard = bids_book.read().unwrap();
        let asks_guard = asks_book.read().unwrap();
        
        // Top N bid levels (highest prices first)
        let bids: Vec<PriceLevelSummary> = bids_guard
            .iter()
            .rev()
            .filter(|(_, orders)| !orders.is_empty())
            .take(levels)
            .map(|(price, orders)| {
                let quantity: Decimal = orders.iter().map(|o| o.remaining()).sum();
                PriceLevelSummary {
                    price: *price,
                    quantity,
                    order_count: orders.len(),
                }
            })
            .collect();
        
        // Top N ask levels (lowest prices first)
        let asks: Vec<PriceLevelSummary> = asks_guard
            .iter()
            .filter(|(_, orders)| !orders.is_empty())
            .take(levels)
            .map(|(price, orders)| {
                let quantity: Decimal = orders.iter().map(|o| o.remaining()).sum();
                PriceLevelSummary {
                    price: *price,
                    quantity,
                    order_count: orders.len(),
                }
            })
            .collect();
        
        OrderbookDepth { bids, asks }
    }

    pub fn push_front(&self, order: Order) {
        let book = self.get_side_mut(order.side, order.outcome);
        let mut book_guard = book.write().unwrap();
        
        book_guard
            .entry(order.price)
            .or_insert_with(VecDeque::new)
            .push_front(order.clone());
        
        self.orders.insert(order.order_id, order);
    }

    pub fn would_self_trade(
        &self,
        user_id: &str,
        side: OrderSide,
        outcome: Outcome,
        price: Decimal,
    ) -> bool {
        let opposite = match side {
            OrderSide::BUY => self.get_asks(outcome),
            OrderSide::SELL => self.get_bids(outcome),
        };
        
        let book = opposite.read().unwrap();
        
        // For BUY: check asks at or below our price
        // For SELL: check bids at or above our price
        let mut range: Box<dyn Iterator<Item = (&Decimal, &VecDeque<Order>)>> = match side {
            OrderSide::BUY => Box::new(
                book.range(..=price)
            ),
            OrderSide::SELL => Box::new(
                book.range(price..)
            ),
        };
        
        range.any(|(_, orders)| {
            orders.iter().any(|o| o.user_id == user_id)
        })
    }

    fn get_bids(&self,outcome:Outcome)->&Arc<RwLock<PriceLevel>>{
        match  outcome {
            Outcome::YES => &self.yes_bids,
            Outcome::NO => &self.no_bids
        }
    }

    fn get_asks(&self,outcome:Outcome)->&Arc<RwLock<PriceLevel>>{
        match outcome {
            Outcome::YES => &self.yes_asks,
            Outcome::NO => &self.no_asks
        }
    }

    fn get_side_mut(&self,side:OrderSide,outcome:Outcome) -> &Arc<RwLock<PriceLevel>>{
        match  (side,outcome) {
            (OrderSide::BUY, Outcome::YES) => &self.yes_bids,
            (OrderSide::SELL,Outcome::YES) => &self.yes_asks,
            (OrderSide::BUY, Outcome::NO) => &self.no_bids,
            (OrderSide::SELL, Outcome::NO) => &self.no_asks,
        }
    }


}


#[derive(Debug, Clone)]
pub struct PriceLevelSummary {
    pub price: Decimal,
    pub quantity: Decimal,
    pub order_count: usize,
}

#[derive(Debug, Clone)]
pub struct OrderbookDepth {
    pub bids: Vec<PriceLevelSummary>,
    pub asks: Vec<PriceLevelSummary>,
}