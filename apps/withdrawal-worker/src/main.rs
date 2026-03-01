use anyhow::Result;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};
use spl_token::instruction as token_instruction;
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_postgres::{Client as PgClient, NoTls};
use tracing::{error, info, warn};

mod types;
mod config;

use config::Config;
use types::{Withdrawal, WithdrawalStatus};

// ============================================================
// DATABASE
// ============================================================

struct Database {
    client: Arc<Mutex<PgClient>>,
}

impl Database {
    async fn connect(database_url: &str) -> Result<Self> {
        let (client, connection) = tokio_postgres::connect(database_url, NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Database connection error: {}", e);
            }
        });

        info!("Connected to PostgreSQL");

        Ok(Self {
            client: Arc::new(Mutex::new(client)),
        })
    }

    /// Fetch pending withdrawals using SELECT FOR UPDATE SKIP LOCKED
    /// to prevent multiple workers from picking up the same withdrawal.
    /// Also atomically marks them as PROCESSING so no other worker can claim them.
    async fn claim_pending_withdrawals(&self) -> Result<Vec<Withdrawal>> {
        let mut client = self.client.lock().await;

        // Single atomic transaction: fetch + immediately mark as PROCESSING
        let tx = client.transaction().await?;

        let rows = tx
            .query(
                r#"
                SELECT id, user_id, asset, amount, destination_address, status, requested_at
                FROM withdrawals
                WHERE status = 'PENDING'
                ORDER BY requested_at ASC
                LIMIT 10
                FOR UPDATE SKIP LOCKED
                "#,
                &[],
            )
            .await?;

        if rows.is_empty() {
            tx.commit().await?;
            return Ok(vec![]);
        }

        let mut withdrawals = Vec::new();

        for row in &rows {
            let id: String = row.get(0);

            // Mark as PROCESSING atomically within the same transaction
            tx.execute(
                "UPDATE withdrawals SET status = 'PROCESSING' WHERE id = $1",
                &[&id],
            )
            .await?;

            withdrawals.push(Withdrawal {
                id,
                user_id: row.get(1),
                asset: row.get(2),
                amount: row.get::<_, Decimal>(3).to_string(),
                destination_address: row.get(4),
                status: WithdrawalStatus::Processing,
                requested_at: row.get(6),
            });
        }

        tx.commit().await?;

        Ok(withdrawals)
    }

    /// Mark withdrawal as CONFIRMED and release the reserved balance
    /// in a SINGLE atomic transaction to prevent partial updates.
    async fn confirm_withdrawal(
        &self,
        withdrawal_id: &str,
        user_id: &str,
        asset: &str,
        amount: &str,
        tx_hash: &str,
    ) -> Result<()> {
        let mut client = self.client.lock().await;
        let tx = client.transaction().await?;

        // 1. Update withdrawal status
        tx.execute(
            r#"
            UPDATE withdrawals
            SET status = 'CONFIRMED', tx_hash = $1, processed_at = NOW()
            WHERE id = $2
            "#,
            &[&tx_hash, &withdrawal_id],
        )
        .await?;

        // 2. Release reserved balance (funds already left the platform on-chain)
        let amount_decimal = Decimal::from_str(amount)?;
        tx.execute(
            r#"
            UPDATE ledger
            SET reserved = reserved - $1
            WHERE user_id = $2 AND asset = $3
            "#,
            &[&amount_decimal, &user_id, &asset],
        )
        .await?;

        tx.commit().await?;

        info!(
            "✅ Withdrawal {} confirmed. Reserved balance released for user {}.",
            withdrawal_id, user_id
        );

        Ok(())
    }

    /// Mark withdrawal as FAILED and return funds to available balance
    /// in a SINGLE atomic transaction.
    async fn fail_withdrawal(
        &self,
        withdrawal_id: &str,
        user_id: &str,
        asset: &str,
        amount: &str,
        failure_reason: &str,
    ) -> Result<()> {
        let mut client = self.client.lock().await;
        let tx = client.transaction().await?;

        // 1. Update withdrawal status
        tx.execute(
            r#"
            UPDATE withdrawals
            SET status = 'FAILED', failure_reason = $1, processed_at = NOW()
            WHERE id = $2
            "#,
            &[&failure_reason, &withdrawal_id],
        )
        .await?;

        // 2. Return funds: move from reserved back to available.
        //    Funds never left the platform, so we restore the available balance.
        let amount_decimal = Decimal::from_str(amount)?;
        tx.execute(
            r#"
            UPDATE ledger
            SET available = available + $1,
                reserved  = reserved  - $1
            WHERE user_id = $2 AND asset = $3
            "#,
            &[&amount_decimal, &user_id, &asset],
        )
        .await?;

        tx.commit().await?;

        warn!(
            "❌ Withdrawal {} failed. Funds returned to available balance for user {}.",
            withdrawal_id, user_id
        );

        Ok(())
    }
}

// ============================================================
// WITHDRAWAL PROCESSOR
// ============================================================

struct WithdrawalProcessor {
    rpc_client: Arc<RpcClient>,
    hot_wallet: Keypair,
    database: Arc<Database>,
}

impl WithdrawalProcessor {
    fn new(rpc_url: &str, hot_wallet: Keypair, database: Arc<Database>) -> Self {
        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            rpc_url.to_string(),
            CommitmentConfig::confirmed(),
        ));

        Self {
            rpc_client,
            hot_wallet,
            database,
        }
    }

    async fn process_withdrawal(&self, withdrawal: &Withdrawal) -> Result<()> {
        info!("💸 Processing withdrawal: {}", withdrawal.id);
        info!("   User: {}", withdrawal.user_id);
        info!("   Asset: {}", withdrawal.asset);
        info!("   Amount: {}", withdrawal.amount);
        info!("   Destination: {}", withdrawal.destination_address);

        // Parse destination address
        let destination = Pubkey::from_str(&withdrawal.destination_address)?;

        // Use rust_decimal for precision — no f64 involved
        let amount_decimal = Decimal::from_str(&withdrawal.amount)?;
        let decimals = self.get_token_decimals(&withdrawal.asset)?;
        let multiplier = Decimal::new(10i64.pow(decimals as u32), 0);
        let amount_raw = (amount_decimal * multiplier)
            .to_u64()
            .ok_or_else(|| anyhow::anyhow!("Amount overflow or negative: {}", withdrawal.amount))?;

        // Determine token mint
        let token_mint = self.get_token_mint(&withdrawal.asset)?;

        // Derive token accounts
        let hot_wallet_token_account =
            spl_associated_token_account::get_associated_token_address(
                &self.hot_wallet.pubkey(),
                &token_mint,
            );

        let destination_token_account =
            spl_associated_token_account::get_associated_token_address(
                &destination,
                &token_mint,
            );

        // Check if destination token account exists
        let account_exists = self
            .rpc_client
            .get_account(&destination_token_account)
            .is_ok();

        let mut instructions = Vec::new();

        // Create destination token account if needed
        if !account_exists {
            info!("📝 Creating destination token account for {}", destination);
            let create_ix =
                spl_associated_token_account::instruction::create_associated_token_account(
                    &self.hot_wallet.pubkey(),
                    &destination,
                    &token_mint,
                    &spl_token::id(),
                );
            instructions.push(create_ix);
        }

        // Build transfer instruction
        let transfer_ix = token_instruction::transfer(
            &spl_token::id(),
            &hot_wallet_token_account,
            &destination_token_account,
            &self.hot_wallet.pubkey(),
            &[],
            amount_raw,
        )?;

        instructions.push(transfer_ix);

        // Send with retry (fresh blockhash fetched on each attempt inside)
        match self.send_transaction_with_retry(&instructions, 3).await {
            Ok(signature) => {
                info!("✅ On-chain transfer confirmed: {}", signature);

                // Atomically: mark CONFIRMED + release reserved balance
                self.database
                    .confirm_withdrawal(
                        &withdrawal.id,
                        &withdrawal.user_id,
                        &withdrawal.asset,
                        &withdrawal.amount,
                        &signature.to_string(),
                    )
                    .await?;

                Ok(())
            }
            Err(e) => {
                error!(
                    "❌ On-chain transfer failed for withdrawal {}: {}",
                    withdrawal.id, e
                );

                // Atomically: mark FAILED + restore available balance
                self.database
                    .fail_withdrawal(
                        &withdrawal.id,
                        &withdrawal.user_id,
                        &withdrawal.asset,
                        &withdrawal.amount,
                        &e.to_string(),
                    )
                    .await?;

                Err(e)
            }
        }
    }

    /// Retry loop that fetches a FRESH blockhash on every attempt
    /// to avoid "blockhash not found" errors after backoff delays.
    async fn send_transaction_with_retry(
        &self,
        instructions: &[solana_sdk::instruction::Instruction],
        max_retries: u32,
    ) -> Result<Signature> {
        let mut retries = 0;

        loop {
            // Always fetch a fresh blockhash before each attempt
            let recent_blockhash = self.rpc_client.get_latest_blockhash()?;

            let transaction = Transaction::new_signed_with_payer(
                instructions,
                Some(&self.hot_wallet.pubkey()),
                &[&self.hot_wallet],
                recent_blockhash,
            );

            match self.rpc_client.send_and_confirm_transaction(&transaction) {
                Ok(signature) => return Ok(signature),
                Err(e) => {
                    retries += 1;

                    if retries >= max_retries {
                        return Err(anyhow::anyhow!(
                            "Transaction failed after {} retries: {}",
                            max_retries,
                            e
                        ));
                    }

                    warn!(
                        "Transaction attempt {}/{} failed: {}. Retrying...",
                        retries, max_retries, e
                    );

                    // Exponential backoff: 2s, 4s, 8s, ...
                    tokio::time::sleep(tokio::time::Duration::from_secs(2u64.pow(retries)))
                        .await;
                }
            }
        }
    }

    /// Returns the on-chain mint address for a supported asset.
    fn get_token_mint(&self, asset: &str) -> Result<Pubkey> {
        match asset {
            "USDC" => Ok(Pubkey::from_str(
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
            )?),
            // Add YES/NO mints here when looked up from market/DB
            _ => Err(anyhow::anyhow!("Unknown asset: {}", asset)),
        }
    }

    /// Returns the number of decimals for a token so we can convert
    /// human-readable amounts to raw u64 without floating-point errors.
    fn get_token_decimals(&self, asset: &str) -> Result<u8> {
        match asset {
            "USDC" => Ok(6),
            // Add other tokens here as needed
            _ => Err(anyhow::anyhow!("Unknown asset decimals: {}", asset)),
        }
    }
}

// ============================================================
// MAIN
// ============================================================

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    info!("💸 Starting Withdrawal Worker");

    dotenv::dotenv().ok();

    let config = Config::from_env()?;

    let database = Arc::new(Database::connect(&config.database_url).await?);

    let processor = WithdrawalProcessor::new(
        &config.solana_rpc_url,
        config.hot_wallet,
        Arc::clone(&database),
    );

    info!("✅ Withdrawal Worker ready");
    info!("   Hot wallet: {}", processor.hot_wallet.pubkey());
    info!("   Poll interval: {}ms", config.poll_interval_ms);

    loop {
        match processor.database.claim_pending_withdrawals().await {
            Ok(withdrawals) => {
                if !withdrawals.is_empty() {
                    info!("📋 Claimed {} pending withdrawal(s)", withdrawals.len());

                    for withdrawal in withdrawals {
                        if let Err(e) = processor.process_withdrawal(&withdrawal).await {
                            // Error already logged + DB updated inside process_withdrawal
                            error!(
                                "Withdrawal {} ended in failure (user funds restored): {}",
                                withdrawal.id, e
                            );
                        }
                    }
                }
            }
            Err(e) => {
                error!("❌ Failed to claim pending withdrawals: {}", e);
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(config.poll_interval_ms)).await;
    }
}