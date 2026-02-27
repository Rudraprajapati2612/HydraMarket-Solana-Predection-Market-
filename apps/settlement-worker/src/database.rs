use anyhow::Result;
use rust_decimal::Decimal;
use tokio_postgres::{Client, NoTls};
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

pub struct Database {
    client: Arc<Mutex<Client>>,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self> {
        let (client, connection) = tokio_postgres::connect(database_url, NoTls).await?;

        // Spawn connection handler in background
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Database connection error: {}", e);
            }
        });

        info!("✅ Connected to PostgreSQL");

        Ok(Self {
            client: Arc::new(Mutex::new(client)),
        })
    }

    /// Get or create token account from database
    pub async fn get_or_create_token_account(
        &self,
        user_id: &str,
        market_id: &str,
        token_type: &str, // "YES" or "NO"
    ) -> Result<Option<String>> {
        let client = self.client.lock().await;

        let column = if token_type == "YES" {
            "yes_token_account"
        } else {
            "no_token_account"
        };

        // Check if account already exists
        let query = format!(
            "SELECT {} FROM positions WHERE user_id = $1 AND market_id = $2",
            column
        );

        let row = client.query_opt(&query, &[&user_id, &market_id]).await?;

        if let Some(row) = row {
            if let Ok(Some(account)) = row.try_get::<_, Option<String>>(0) {
                return Ok(Some(account));
            }
        }

        // Account doesn't exist yet
        Ok(None)
    }

    /// Store token account addresses after minting
    pub async fn store_token_accounts(
        &self,
        user_id: &str,
        market_id: &str,
        yes_token_account: Option<&str>,
        no_token_account: Option<&str>,
    ) -> Result<()> {
        let mut client = self.client.lock().await;
        let transaction = client.transaction().await?;

        if let Some(yes_account) = yes_token_account {
            transaction
                .execute(
                    r#"
                INSERT INTO positions (id, user_id, market_id, yes_token_account, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                ON CONFLICT (user_id, market_id)
                DO UPDATE SET yes_token_account = $3, updated_at = NOW()
                "#,
                    &[&user_id, &market_id, &yes_account],
                )
                .await?;
        }

        if let Some(no_account) = no_token_account {
            transaction
                .execute(
                    r#"
                INSERT INTO positions (id, user_id, market_id, no_token_account, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                ON CONFLICT (user_id, market_id)
                DO UPDATE SET no_token_account = $3, updated_at = NOW()
                "#,
                    &[&user_id, &market_id, &no_account],
                )
                .await?;
        }

        transaction.commit().await?;

        info!("✅ Stored token accounts for user {} in market {}", user_id, market_id);

        Ok(())
    }

    /// Update positions after minting
    pub async fn update_positions(
        &self,
        yes_user_id: &str,
        no_user_id: &str,
        market_id: &str,
        pairs: u64,
        yes_price: &str,
        no_price: &str,
    ) -> Result<()> {
        let pairs_decimal = Decimal::from(pairs);
        let yes_price_decimal = Decimal::from_str(yes_price)?;
        let no_price_decimal = Decimal::from_str(no_price)?;

        let mut client = self.client.lock().await;
        let transaction = client.transaction().await?;

        // Update YES user position
        transaction
            .execute(
                r#"
            INSERT INTO positions (id, user_id, market_id, yes_tokens, no_tokens, avg_yes_price, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 0, $4, NOW())
            ON CONFLICT (user_id, market_id)
            DO UPDATE SET
                yes_tokens = positions.yes_tokens + $3,
                avg_yes_price = CASE
                    WHEN positions.yes_tokens = 0 THEN $4
                    ELSE (
                        (positions.yes_tokens * COALESCE(positions.avg_yes_price, 0) + $3 * $4) /
                        (positions.yes_tokens + $3)
                    )
                END,
                updated_at = NOW()
            "#,
                &[&yes_user_id, &market_id, &pairs_decimal, &yes_price_decimal],
            )
            .await?;

        // Update NO user position
        transaction
            .execute(
                r#"
            INSERT INTO positions (id, user_id, market_id, yes_tokens, no_tokens, avg_no_price, updated_at)
            VALUES (gen_random_uuid(), $1, $2, 0, $3, $4, NOW())
            ON CONFLICT (user_id, market_id)
            DO UPDATE SET
                no_tokens = positions.no_tokens + $3,
                avg_no_price = CASE
                    WHEN positions.no_tokens = 0 THEN $4
                    ELSE (
                        (positions.no_tokens * COALESCE(positions.avg_no_price, 0) + $3 * $4) /
                        (positions.no_tokens + $3)
                    )
                END,
                updated_at = NOW()
            "#,
                &[&no_user_id, &market_id, &pairs_decimal, &no_price_decimal],
            )
            .await?;

        transaction.commit().await?;

        info!("✅ Updated positions for users {} and {}", yes_user_id, no_user_id);

        Ok(())
    }
     
    
    
    
    
    
    /// Release reserved USDC
    pub async fn release_reservations(
        &self,
        yes_user_id: &str,
        no_user_id: &str,
        yes_amount: u64,
        no_amount: u64,
    ) -> Result<()> {
        let yes_amount_decimal = Decimal::from(yes_amount);
        let no_amount_decimal = Decimal::from(no_amount);

        let mut client = self.client.lock().await;
        let transaction = client.transaction().await?;

        // Release YES user's USDC
        let yes_rows = transaction
            .execute(
                "UPDATE ledger SET reserved = reserved - $1 WHERE user_id = $2 AND asset = 'USDC'",
                &[&yes_amount_decimal, &yes_user_id],
            )
            .await?;

        if yes_rows == 0 {
            return Err(anyhow::anyhow!("Failed to release reservation for user {}", yes_user_id));
        }

        // Release NO user's USDC
        let no_rows = transaction
            .execute(
                "UPDATE ledger SET reserved = reserved - $1 WHERE user_id = $2 AND asset = 'USDC'",
                &[&no_amount_decimal, &no_user_id],
            )
            .await?;

        if no_rows == 0 {
            return Err(anyhow::anyhow!("Failed to release reservation for user {}", no_user_id));
        }

        transaction.commit().await?;

        info!("✅ Released reservations for users {} and {}", yes_user_id, no_user_id);

        Ok(())
    }

    /// Update order status to FILLED
    pub async fn mark_orders_filled(
        &self,
        yes_user_id: &str,
        no_user_id: &str,
        market_id: &str,
    ) -> Result<()> {
        let client = self.client.lock().await;

        let rows = client
            .execute(
                r#"
            UPDATE orders
            SET status = 'FILLED', updated_at = NOW()
            WHERE user_id IN ($1, $2)
            AND market_id = $3
            AND status = 'MATCHED'
            AND created_at >= NOW() - INTERVAL '1 hour'
            "#,
                &[&yes_user_id, &no_user_id, &market_id],
            )
            .await?;

        info!("✅ Updated {} order(s) to FILLED status", rows);

        Ok(())
    }
}