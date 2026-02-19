use anyhow::{Context, Result};
use chrono::Utc;
use rust_decimal::Decimal;
use tracing::{info, warn};
use uuid::Uuid;

use crate::order::{Order, OrderSide, OrderStatus, OrderType, Outcome};
use crate::orderbook::OrderBook;
use crate::trade::{ComplementaryMatch, Trade, TradeType};

pub struct Matcher {
    orderbook: OrderBook,
}

impl Matcher {
    pub fn new(orderbook: OrderBook) -> Self {
        Self { orderbook }
    }
    
    /// Main entry point: place an order and try to match
    pub fn place_order(&self, mut order: Order) -> Result<MatchResult> {
        info!(
            "Placing order: {} {:?} {:?} @ {} (qty: {})",
            order.user_id, order.side, order.outcome, order.price, order.quantity
        );
        
        // 1. Validate order
        self.validate_order(&order)?;
        
        // 2. Check for self-trade
        if self.orderbook.would_self_trade(
            &order.user_id,
            order.side,
            order.outcome,
            order.price
        ) {
            warn!("Self-trade detected for user {}", order.user_id);
            return Err(anyhow::anyhow!("Self-trade not allowed"));
        }
        
        // 3. Try to match order
        let mut trades = Vec::new();
        let mut complementary_matches = Vec::new();
        
        match order.order_type {
            OrderType::MARKET => {
                // Match immediately at best available price
                self.match_market_order(&mut order, &mut trades)?;
            }
            OrderType::LIMIT => {
                // Try to match, add remainder to book
                self.match_limit_order(&mut order, &mut trades, &mut complementary_matches)?;
            }
            OrderType::POSTONLY => {
                // Only add to book, never take liquidity
                // (skip matching)
            }
        }
        
        // 4. Add remaining quantity to orderbook
        if order.remaining() > Decimal::ZERO && !order.is_filled() {
            order.order_status = if order.filled > Decimal::ZERO {
                OrderStatus::PARTIAL
            } else {
                OrderStatus::OPEN
            };
            
            self.orderbook.add_order(order.clone());
        } else if order.is_filled() {
            order.order_status = OrderStatus::FILLED;
        }
        
        Ok(MatchResult {
            order,
            trades,
            complementary_matches,
        })
    }
    
    /// Match a MARKET order (execute immediately at best price)
    fn match_market_order(&self, order: &mut Order, trades: &mut Vec<Trade>) -> Result<()> {
        while order.remaining() > Decimal::ZERO {
            // ✅ CORRECT: Use best_bid/best_ask methods
            let best_price = match order.side {
                OrderSide::BUY => self.orderbook.best_ask(order.outcome),
                OrderSide::SELL => self.orderbook.best_bid(order.outcome),
            };
            
            match best_price {
                Some(price) => {
                    self.execute_trade_at_price(order, price, trades)?;
                }
                None => {
                    // No liquidity available
                    warn!("No liquidity for market order: {}", order.order_id);
                    break;
                }
            }
        }
        
        Ok(())
    }
    
    /// Match a LIMIT order (match at price or better, add remainder to book)
    fn match_limit_order(
        &self,
        order: &mut Order,
        trades: &mut Vec<Trade>,
        complementary: &mut Vec<ComplementaryMatch>,
    ) -> Result<()> {
        // First, try complementary matching (BUY YES + BUY NO)
        if order.side == OrderSide::BUY {
            self.try_complementary_match(order, complementary)?;
        }
        
        // Then, try secondary matching (existing tokens)
        while order.remaining() > Decimal::ZERO {
            // ✅ CORRECT: Compare Decimal to Decimal
            let can_match = match order.side {
                OrderSide::BUY => {
                    // BUY: match with SELL at or below our price
                    self.orderbook
                        .best_ask(order.outcome)
                        .map(|ask| ask <= order.price)
                        .unwrap_or(false)
                }
                OrderSide::SELL => {
                    // SELL: match with BUY at or above our price
                    self.orderbook
                        .best_bid(order.outcome)
                        .map(|bid| bid >= order.price)
                        .unwrap_or(false)
                }
            };
            
            if can_match {
                let price = match order.side {
                    OrderSide::BUY => self.orderbook.best_ask(order.outcome).unwrap(),
                    OrderSide::SELL => self.orderbook.best_bid(order.outcome).unwrap(),
                };
                
                self.execute_trade_at_price(order, price, trades)?;
            } else {
                break;
            }
        }
        
        Ok(())
    }
    
    /// Try to match with a complementary order (BUY YES + BUY NO = mint pair)
    /// Try to match with a complementary order (BUY YES + BUY NO = mint pair)
fn try_complementary_match(
    &self,
    order: &mut Order,
    matches: &mut Vec<ComplementaryMatch>,
) -> Result<()> {
    if order.side != OrderSide::BUY {
        return Ok(());
    }
    
    // Get opposite outcome
    let opposite_outcome = match order.outcome {
        Outcome::YES => Outcome::NO,
        Outcome::NO => Outcome::YES,
    };
    
    // Get RwLock
    let opposite_bids = match opposite_outcome {
        Outcome::YES => &self.orderbook.yes_bids,
        Outcome::NO => &self.orderbook.no_bids,
    };
    
    // Lock for reading
    let book = opposite_bids.read().unwrap();
    
    // Find matching prices (must sum to 1.00)
    let our_price = order.price;
    let required_price = Decimal::ONE - our_price;
    
    // Collect order IDs to process (not full orders!)
    let mut order_ids_to_match: Vec<Uuid> = book
        .range(required_price..)
        .flat_map(|(_, orders)| orders.iter().map(|o| o.order_id))
        .collect();
    
    // Release read lock IMMEDIATELY
    drop(book);
    
    // ✅ FIX: Process each order ID only once
    for order_id in order_ids_to_match {
        if order.remaining() == Decimal::ZERO {
            break;
        }
        
        // Get current state of opposite order
        let opposite_order = match self.orderbook.orders.get(&order_id) {
            Some(o) => o.clone(),
            None => continue, // Order was already removed
        };
        
        if opposite_order.is_filled() {
            continue; // Skip already filled orders
        }
        
        // Calculate matched quantity
        let matched_qty = order.remaining().min(opposite_order.remaining());
        
        // Create complementary match
        let (yes_buyer, no_buyer, yes_order, no_order, yes_price, no_price) = 
            match order.outcome {
                Outcome::YES => (
                    order.user_id.clone(),
                    opposite_order.user_id.clone(),
                    order.order_id,
                    opposite_order.order_id,
                    order.price,
                    opposite_order.price,
                ),
                Outcome::NO => (
                    opposite_order.user_id.clone(),
                    order.user_id.clone(),
                    opposite_order.order_id,
                    order.order_id,
                    opposite_order.price,
                    order.price,
                ),
            };
        
        matches.push(ComplementaryMatch {
            trade_id: Uuid::new_v4(),
            market_id: order.market_id.clone(),
            yes_buyer_id: yes_buyer,
            no_buyer_id: no_buyer,
            quantity: matched_qty,
            yes_price,
            no_price,
            yes_order_id: yes_order,
            no_order_id: no_order,
            yes_reservation_id: order.reservation_id.clone(),
            no_reservation_id: opposite_order.reservation_id.clone(),
            timestamp: Utc::now(),
        });
        
        // ✅ FIX: Update taker order
        order.filled += matched_qty;
        
        // ✅ FIX: Update or remove maker order (simpler approach)
        if opposite_order.filled + matched_qty >= opposite_order.quantity {
            // Fully filled - just remove it
            self.orderbook.remove_order(opposite_order.order_id);
        } else {
            // Partially filled - update the filled amount in DashMap
            // The order stays in the BTreeMap price level
            if let Some(mut stored) = self.orderbook.orders.get_mut(&opposite_order.order_id) {
                stored.filled += matched_qty;
            }
            
            // ✅ IMPORTANT: Also update in the price level itself
            // We need to find it and update it in place
            let price = opposite_order.price;
            let bids = match opposite_outcome {
                Outcome::YES => &self.orderbook.yes_bids,
                Outcome::NO => &self.orderbook.no_bids,
            };
            
            let mut book = bids.write().unwrap();
            if let Some(orders_at_price) = book.get_mut(&price) {
                // Find the order in the VecDeque and update it
                for order_in_queue in orders_at_price.iter_mut() {
                    if order_in_queue.order_id == opposite_order.order_id {
                        order_in_queue.filled += matched_qty;
                        break;
                    }
                }
                
                // ✅ CRITICAL: Remove from queue if now filled
                if opposite_order.filled + matched_qty >= opposite_order.quantity {
                    orders_at_price.retain(|o| o.order_id != opposite_order.order_id);
                    
                    // Clean up empty price level
                    if orders_at_price.is_empty() {
                        book.remove(&price);
                    }
                }
            }
            drop(book);
        }
        
        info!(
            "Complementary match: {} YES + {} NO = {} pairs",
            yes_price, no_price, matched_qty
        );
    }
    
    Ok(())
}
    /// Execute a trade at a specific price
    fn execute_trade_at_price(
        &self,
        taker_order: &mut Order,
        price: Decimal,
        trades: &mut Vec<Trade>,
    ) -> Result<()> {
        // ✅ CORRECT: Use pop_best_ask/pop_best_bid methods
        let maker_order = match taker_order.side {
            OrderSide::BUY => self.orderbook.pop_best_ask(taker_order.outcome),
            OrderSide::SELL => self.orderbook.pop_best_bid(taker_order.outcome),
        };
        
        if let Some(mut maker_order) = maker_order {
            // Calculate matched quantity
            let matched_qty = taker_order.remaining().min(maker_order.remaining());
            
            // Determine trade type
            let trade_type = TradeType::determine(
                taker_order.side,
                taker_order.outcome,
                maker_order.side,
                maker_order.outcome,
            );
            
            // Create trade
            let (buyer_id, seller_id, buyer_order_id, seller_order_id, buyer_res, seller_res) = 
                match taker_order.side {
                    OrderSide::BUY => (
                        taker_order.user_id.clone(),
                        maker_order.user_id.clone(),
                        taker_order.order_id,
                        maker_order.order_id,
                        taker_order.reservation_id.clone(),
                        maker_order.reservation_id.clone(),
                    ),
                    OrderSide::SELL => (
                        maker_order.user_id.clone(),
                        taker_order.user_id.clone(),
                        maker_order.order_id,
                        taker_order.order_id,
                        maker_order.reservation_id.clone(),
                        taker_order.reservation_id.clone(),
                    ),
                };
            
            trades.push(Trade {
                trade_id: Uuid::new_v4(),
                market_id: taker_order.market_id.clone(),
                outcome: taker_order.outcome,
                trade_type,
                buyer_id,
                seller_id,
                quantity: matched_qty,
                price,
                buyer_order_id,
                seller_order_id,
                buyer_reservation_id: buyer_res,
                seller_reservation_id: seller_res,
                timestamp: Utc::now(),
            });
            
            // Update orders
            taker_order.filled += matched_qty;
            maker_order.filled += matched_qty;
            
            // Handle maker order
            if !maker_order.is_filled() {
                // Put back at front (partial fill)
                self.orderbook.push_front(maker_order);
            }
            // If fully filled, it's already removed (pop_best_* removed it)
            
            info!(
                "Trade executed: {:?} {:?} @ {} (qty: {})",
                trade_type, taker_order.outcome, price, matched_qty
            );
        }
        
        Ok(())
    }
    
    fn validate_order(&self, order: &Order) -> Result<()> {
        if order.quantity <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Invalid quantity"));
        }
        
        if order.price < Decimal::ZERO || order.price > Decimal::ONE {
            return Err(anyhow::anyhow!("Price must be between 0 and 1"));
        }
        
        Ok(())
    }
}

pub struct MatchResult {
    pub order: Order,
    pub trades: Vec<Trade>,
    pub complementary_matches: Vec<ComplementaryMatch>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_complementary_match_btreemap() {
        let orderbook = OrderBook::new("market_test".to_string());
        let matcher = Matcher::new(orderbook);

        let alice = Order {
            order_id: Uuid::new_v4(),
            user_id: "alice".to_string(),
            market_id: "market_test".to_string(),
            side: OrderSide::BUY,
            outcome: Outcome::YES,
            order_type: OrderType::LIMIT,
            price: dec!(0.60),
            quantity: dec!(100),
            filled: dec!(0),
            order_status: OrderStatus::PENDING,
            reservation_id: Some("alice_res".to_string()),
            created_at: Utc::now(),
        };

        let bob = Order {
            order_id: Uuid::new_v4(),
            user_id: "bob".to_string(),
            market_id: "market_test".to_string(),
            side: OrderSide::BUY,
            outcome: Outcome::NO,
            order_type: OrderType::LIMIT,
            price: dec!(0.40),
            quantity: dec!(100),
            filled: dec!(0),
            order_status: OrderStatus::PENDING,
            reservation_id: Some("bob_res".to_string()),
            created_at: Utc::now(),
        };

        let _ = matcher.place_order(alice).unwrap();
        let result = matcher.place_order(bob).unwrap();

        assert!(!result.complementary_matches.is_empty());
        let cmatch = &result.complementary_matches[0];
        assert_eq!(cmatch.quantity, dec!(100));
        assert_eq!(cmatch.yes_price + cmatch.no_price, dec!(1.0));
    }
}
