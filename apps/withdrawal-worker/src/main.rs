use anyhow::Result;
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

struct Database{
    client : Arc<Mutex<PgClient>>
}


impl Database {
    async  fn connect(database_url:&str)->Result<Self>{
        let (client,connection) = tokio_postgres::connect(database_url, NoTls).await?;

        tokio::spawn(async move{
            if let Err(e) = connection.await {
                eprintln!("Database connection error {}",e)
            }
        });

        info!("Connected To Postgress");

        Ok(Self { client: Arc::new(Mutex::new(client)) })
    }

    async fn get_pending_withdrawals(&self) -> Result<Vec<Withdrawal>> {
        let client = self.client.lock().await;
        
        let rows = client
            .query(
                r#"
                SELECT id, user_id, asset, amount, destination_address, status, requested_at
                FROM withdrawals
                WHERE status = 'PENDING'
                ORDER BY requested_at ASC
                LIMIT 10
                "#,
                &[],
            )
            .await?;
        
        let mut withdrawals = Vec::new();
        
        for row in rows {
            withdrawals.push(Withdrawal {
                id: row.get(0),
                user_id: row.get(1),
                asset: row.get(2),
                amount: row.get::<_, rust_decimal::Decimal>(3).to_string(),
                destination_address: row.get(4),
                status: WithdrawalStatus::Pending,
                requested_at: row.get(6),
            });
        }
        
        Ok(withdrawals)
    }

        /// Update withdrawal status
        async fn update_withdrawal_status(
            &self,
            withdrawal_id: &str,
            status: WithdrawalStatus,
            tx_hash: Option<&str>,
            failure_reason: Option<&str>,
        ) -> Result<()> {
            let mut client = self.client.lock().await;
            let transaction = client.transaction().await?;
            
            let status_str = match status {
                WithdrawalStatus::Pending => "PENDING",
                WithdrawalStatus::Processing => "PROCESSING",
                WithdrawalStatus::Confirmed => "CONFIRMED",
                WithdrawalStatus::Failed => "FAILED",
            };
            
            transaction
                .execute(
                    r#"
                    UPDATE withdrawals
                    SET status = $1, tx_hash = $2, failure_reason = $3, processed_at = NOW()
                    WHERE id = $4
                    "#,
                    &[&status_str, &tx_hash, &failure_reason, &withdrawal_id],
                )
                .await?;
            
            transaction.commit().await?;
            
            Ok(())
        }
        
        /// Release reserved balance
        async fn release_reserved_balance(
            &self,
            user_id: &str,
            asset: &str,
            amount: &str,
        ) -> Result<()> {
            let client = self.client.lock().await;
            
            let amount_decimal = rust_decimal::Decimal::from_str(amount)?;
            
            client
                .execute(
                    r#"
                    UPDATE ledger
                    SET reserved = reserved - $1
                    WHERE user_id = $2 AND asset = $3
                    "#,
                    &[&amount_decimal, &user_id, &asset],
                )
                .await?;
            
            Ok(())
        }
}

struct WithdrawalProcessor {
    rpc_client: Arc<RpcClient>,
    hot_wallet: Keypair,
    database: Arc<Database>,
}

impl WithdrawalProcessor{
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
        
        // Update status to PROCESSING
        self.database
            .update_withdrawal_status(&withdrawal.id, WithdrawalStatus::Processing, None, None)
            .await?;
        
        // Parse destination address
        let destination = Pubkey::from_str(&withdrawal.destination_address)?;
        
        // Parse amount (assuming 6 decimals for USDC)
        let amount_f64: f64 = withdrawal.amount.parse()?;
        let amount_raw = (amount_f64 * 1_000_000.0) as u64;
        
        // Determine token mint
        let token_mint = self.get_token_mint(&withdrawal.asset)?;
        
        // Get hot wallet's token account
        let hot_wallet_token_account =
            spl_associated_token_account::get_associated_token_address(
                &self.hot_wallet.pubkey(),
                &token_mint,
            );
        
        // Get or create destination token account
        let destination_token_account =
            spl_associated_token_account::get_associated_token_address(&destination, &token_mint);
        
        // Check if destination token account exists
        let account_exists = self
            .rpc_client
            .get_account(&destination_token_account)
            .is_ok();
        
        let mut instructions = Vec::new();
        
        // Create destination token account if it doesn't exist
        if !account_exists {
            info!("📝 Creating destination token account");
            
            let create_ix =
                spl_associated_token_account::instruction::create_associated_token_account(
                    &self.hot_wallet.pubkey(),
                    &destination,
                    &token_mint,
                    &spl_token::id(),
                );
            
            instructions.push(create_ix);
        }
        
        // Transfer tokens
        let transfer_ix = token_instruction::transfer(
            &spl_token::id(),
            &hot_wallet_token_account,
            &destination_token_account,
            &self.hot_wallet.pubkey(),
            &[],
            amount_raw,
        )?;
        
        instructions.push(transfer_ix);
        
        // Get recent blockhash
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
        
        // Create and sign transaction
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&self.hot_wallet.pubkey()),
            &[&self.hot_wallet],
            recent_blockhash,
        );
        
        // Send transaction with retry
        match self.send_transaction_with_retry(&transaction, 3).await {
            Ok(signature) => {
                info!("✅ Withdrawal confirmed: {}", signature);
                
                // Update database
                self.database
                    .update_withdrawal_status(
                        &withdrawal.id,
                        WithdrawalStatus::Confirmed,
                        Some(&signature.to_string()),
                        None,
                    )
                    .await?;
                
                // Release reserved balance
                self.database
                    .release_reserved_balance(
                        &withdrawal.user_id,
                        &withdrawal.asset,
                        &withdrawal.amount,
                    )
                    .await?;
                
                info!("💰 Released reserved balance");
                
                Ok(())
            }
            Err(e) => {
                error!("❌ Withdrawal failed: {}", e);
                
                // Mark as failed
                self.database
                    .update_withdrawal_status(
                        &withdrawal.id,
                        WithdrawalStatus::Failed,
                        None,
                        Some(&e.to_string()),
                    )
                    .await?;
                
                Err(e)
            }
        }
    }

    async fn send_transaction_with_retry(
        &self,
        transaction: &Transaction,
        max_retries: u32,
    ) -> Result<Signature> {
        let mut retries = 0;
        
        loop {
            match self.rpc_client.send_and_confirm_transaction(transaction) {
                Ok(signature) => {
                    return Ok(signature);
                }
                Err(e) => {
                    retries += 1;
                    
                    if retries >= max_retries {
                        return Err(anyhow::anyhow!(
                            "Transaction failed after {} retries: {}",
                            max_retries,
                            e
                        ));
                    }
                    
                    warn!("Transaction failed (retry {}/{}): {}", retries, max_retries, e);
                    
                    // Exponential backoff
                    tokio::time::sleep(tokio::time::Duration::from_secs(2u64.pow(retries))).await;
                }
            }
        }
    }

    fn get_token_mint(&self, asset: &str) -> Result<Pubkey> {
        // This should be configurable or stored in database
        match asset {
            "USDC" => Ok(Pubkey::from_str("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")?),
            // For YES/NO tokens, you'd need to look up the mint from the market
            _ => Err(anyhow::anyhow!("Unknown asset: {}", asset)),
        }
    }

}

fn main() {
    println!("Hello, world!");
}
