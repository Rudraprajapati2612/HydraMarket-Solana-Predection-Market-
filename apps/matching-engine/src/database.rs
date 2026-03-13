use anyhow::Result;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use std::str::FromStr;
use tokio_postgres::{Client, NoTls};
use tracing::info;
use uuid::Uuid;

use crate::order::{Order, OrderSide, OrderStatus, OrderType, Outcome};

pub struct Database {
    client: Client,
}

pub struct RestingOrderRecord {
    pub order: Order,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self> {
        let (client, connection) = tokio_postgres::connect(database_url, NoTls).await?;

        tokio::spawn(async move {
            if let Err(error) = connection.await {
                eprintln!("Database connection error: {}", error);
            }
        });

        info!("✅ Matching engine connected to PostgreSQL");

        Ok(Self { client })
    }

    pub async fn load_resting_orders(&self) -> Result<Vec<RestingOrderRecord>> {
        let rows = self.client
            .query(
                r#"
                SELECT
                    id,
                    user_id,
                    market_id,
                    side::text AS side,
                    outcome::text AS outcome,
                    price::text AS price,
                    quantity::text AS quantity,
                    filled_quantity::text AS filled_quantity,
                    status::text AS status,
                    created_at
                FROM orders
                WHERE status IN ('OPEN', 'PARTIAL')
                ORDER BY created_at ASC
                "#,
                &[],
            )
            .await?;

        let mut orders = Vec::with_capacity(rows.len());

        for row in rows {
            let order_id: Uuid = row.get("id");
            let user_id: String = row.get("user_id");
            let market_id: String = row.get("market_id");
            let side = match row.get::<_, String>("side").as_str() {
                "BUY" => OrderSide::BUY,
                "SELL" => OrderSide::SELL,
                other => anyhow::bail!("Unsupported order side in replay: {}", other),
            };
            let outcome = match row.get::<_, String>("outcome").as_str() {
                "YES" => Outcome::YES,
                "NO" => Outcome::NO,
                other => anyhow::bail!("Unsupported order outcome in replay: {}", other),
            };
            let status = match row.get::<_, String>("status").as_str() {
                "OPEN" => OrderStatus::OPEN,
                "PARTIAL" => OrderStatus::PARTIAL,
                other => anyhow::bail!("Unsupported order status in replay: {}", other),
            };
            let reservation_id: Option<String> = row.get("reservation_id");
            let price = Decimal::from_str(&row.get::<_, String>("price"))?;
            let quantity = Decimal::from_str(&row.get::<_, String>("quantity"))?;
            let filled = Decimal::from_str(&row.get::<_, String>("filled_quantity"))?;
            let created_at: DateTime<Utc> = row.get("created_at");

            orders.push(RestingOrderRecord {
                order: Order {
                    order_id,
                    user_id,
                    market_id: market_id.clone(),
                    side,
                    outcome,
                    order_type: OrderType::LIMIT,
                    price,
                    quantity,
                    filled,
                    order_status: status,
                    reservation_id:None,
                    created_at,
                },
            });
        }

        Ok(orders)
    }
}
