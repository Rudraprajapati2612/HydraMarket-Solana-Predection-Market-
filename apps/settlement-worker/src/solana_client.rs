use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signature, Signer},
    transaction::Transaction,
};

use spl_associated_token_account;

use std::str::FromStr;
use std::sync::Arc;
use tracing::{info, warn};

pub struct SolanaClient {
    rpc_client: Arc<RpcClient>,
    treasury_keypair: Keypair,
    escrow_program_id: Pubkey,
    usdc_mint: Pubkey,
    market_registry_program_id: Pubkey,
}

impl SolanaClient {
    pub fn new(
        rpc_url: &str,
        treasury_keypair: Keypair,
        escrow_program_id: Pubkey,
        usdc_mint: Pubkey,
        market_registry_program_id: Pubkey,
    ) -> Self {
        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            rpc_url.to_string(),
            CommitmentConfig::confirmed(),
        ));

        Self {
            rpc_client,
            treasury_keypair,
            escrow_program_id,
            usdc_mint,
            market_registry_program_id,
        }
    }

    pub fn treasury_pubkey(&self) -> Pubkey {
        self.treasury_keypair.pubkey()
    }

    /// Mint YES/NO token pairs
    /// 
    /// Account layout must match MintPairs struct in contract EXACTLY:
    /// 1. authority (signer)
    /// 2. vault (mut)
    /// 3. market (unchecked)
    /// 4. market_registry_program
    /// 5. usdc_vault (mut) — vault's USDC token account
    /// 6. usdc_mint
    /// 7. hot_wallet_usdc (mut) — treasury's USDC ATA (the "from")
    /// 8. yes_token_mint (mut)
    /// 9. no_token_mint (mut)
    /// 10. yes_recipient (mut)
    /// 11. no_recipient (mut)
    /// 12. token_program
    pub async fn mint_pairs(
        &self,
        market_pda: &str,        // market registry account (for CPI)
        escrow_vault_pda: &str,  // escrow vault PDA
        usdc_vault : &str,
        yes_token_mint: &str,
        no_token_mint: &str,
        _yes_user_id: &str,      // not used for account derivation
        _no_user_id: &str,       // not used for account derivation
        pairs: u64,
    ) -> Result<(Signature, String, String)> {
        info!("🔨 Building mint_pairs transaction for {} pairs", pairs);

        // Parse pubkeys
        let market_account = Pubkey::from_str(market_pda)?;
        let escrow_vault = Pubkey::from_str(escrow_vault_pda)?;
        let yes_mint = Pubkey::from_str(yes_token_mint)?;
        let no_mint = Pubkey::from_str(no_token_mint)?;
        let usdc_mint = self.get_usdc_mint()?;

        // Treasury-owned ATAs for YES/NO tokens (platform holds them)
        let yes_token_account = spl_associated_token_account::get_associated_token_address(
            &self.treasury_pubkey(),
            &yes_mint,
        );
        let no_token_account = spl_associated_token_account::get_associated_token_address(
            &self.treasury_pubkey(),
            &no_mint,
        );

        info!("YES ATA: {}", yes_token_account);
        info!("NO ATA: {}", no_token_account);

        // Treasury's USDC ATA — this is hot_wallet_usdc in the contract
        let hot_wallet_usdc = spl_associated_token_account::get_associated_token_address(
            &self.treasury_pubkey(),
            &usdc_mint,
        );

        // Vault's USDC ATA — the contract transfers FROM hot_wallet INTO this
        // The vault PDA owns this account
        let queued_usdc_vault_ata = Pubkey::from_str(usdc_vault)?;
        let expected_usdc_vault_ata = spl_associated_token_account::get_associated_token_address(
            &escrow_vault,
            &usdc_mint,
        );
        if queued_usdc_vault_ata != expected_usdc_vault_ata {
            warn!(
                "⚠️ Queue usdc_vault {} mismatches derived vault ATA {}, using derived value",
                queued_usdc_vault_ata, expected_usdc_vault_ata
            );
        }
        let usdc_vault_ata = expected_usdc_vault_ata;

        info!("Hot wallet USDC: {}", hot_wallet_usdc);
        info!("Vault USDC ATA: {}", usdc_vault_ata);

        // Ensure YES/NO recipient ATAs exist (create if not)
        self.get_or_create_associated_token_account(&self.treasury_pubkey(), &usdc_mint).await?;
        self.get_or_create_associated_token_account(&self.treasury_pubkey(), &yes_mint).await?;
        self.get_or_create_associated_token_account(&self.treasury_pubkey(), &no_mint).await?;

        info!("✅ All token accounts ready");
        
        // Build the single mint_pairs instruction
        // NOTE: Do NOT add a separate USDC transfer instruction —
        // the contract handles the transfer internally via hot_wallet_usdc → usdc_vault
        let mint_pairs_ix = self.build_mint_pairs_instruction(
            &escrow_vault,
            &market_account,
            &usdc_vault_ata,
            &usdc_mint,
            &hot_wallet_usdc,
            &yes_mint,
            &no_mint,
            &yes_token_account,
            &no_token_account,
            pairs,
        )?;

        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;

        let transaction = Transaction::new_signed_with_payer(
            &[mint_pairs_ix],
            Some(&self.treasury_pubkey()),
            &[&self.treasury_keypair],
            recent_blockhash,
        );

        let signature = self.send_transaction_with_retry(&transaction, 3).await?;

        info!("✅ Transaction confirmed: {}", signature);

        Ok((
            signature,
            yes_token_account.to_string(),
            no_token_account.to_string(),
        ))
    }

    /// Build mint_pairs instruction matching the on-chain MintPairs account struct
    fn build_mint_pairs_instruction(
        &self,
        escrow_vault: &Pubkey,
        market_account: &Pubkey,
        usdc_vault_ata: &Pubkey,
        usdc_mint: &Pubkey,
        hot_wallet_usdc: &Pubkey,
        yes_mint: &Pubkey,
        no_mint: &Pubkey,
        yes_recipient: &Pubkey,
        no_recipient: &Pubkey,
        pairs: u64,
    ) -> Result<Instruction> {
        // Anchor discriminator: first 8 bytes of sha256("global:mint_pairs")
        // ⚠️  Verify this against your deployed program using:
        //     anchor idl parse --file your_program.json
        // or check the IDL for the correct discriminator
        let discriminator: [u8; 8] = [0x3f, 0xd8, 0x68, 0x4d, 0xd7, 0xbd, 0x53, 0x51];

        let mut data = Vec::new();
        data.extend_from_slice(&discriminator);
        data.extend_from_slice(&pairs.to_le_bytes());

        // Account order MUST match MintPairs struct field order exactly
        let accounts = vec![
            AccountMeta::new_readonly(self.treasury_pubkey(), true),         // authority (signer)
            AccountMeta::new(*escrow_vault, false),                          // vault
            AccountMeta::new_readonly(*market_account, false),               // market
            AccountMeta::new_readonly(self.market_registry_program_id, false), // market_registry_program
            AccountMeta::new(*usdc_vault_ata, false),                        // usdc_vault
            AccountMeta::new_readonly(*usdc_mint, false),                    // usdc_mint
            AccountMeta::new(*hot_wallet_usdc, false),                       // hot_wallet_usdc
            AccountMeta::new(*yes_mint, false),                              // yes_token_mint
            AccountMeta::new(*no_mint, false),                               // no_token_mint
            AccountMeta::new(*yes_recipient, false),                         // yes_recipient
            AccountMeta::new(*no_recipient, false),                          // no_recipient
            AccountMeta::new_readonly(spl_token::id(), false),               // token_program
        ];

        Ok(Instruction {
            program_id: self.escrow_program_id,
            accounts,
            data,
        })
    }

    /// Get or create associated token account
    pub async fn get_or_create_associated_token_account(
        &self,
        owner: &Pubkey,
        mint: &Pubkey,
    ) -> Result<Pubkey> {
        let token_account =
            spl_associated_token_account::get_associated_token_address(owner, mint);

        match self.rpc_client.get_account(&token_account) {
            Ok(_) => Ok(token_account),
            Err(_) => {
                info!("Creating ATA for owner={} mint={}", owner, mint);

                let create_ix =
                    spl_associated_token_account::instruction::create_associated_token_account(
                        &self.treasury_pubkey(),
                        owner,
                        mint,
                        &spl_token::id(),
                    );

                let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
                let transaction = Transaction::new_signed_with_payer(
                    &[create_ix],
                    Some(&self.treasury_pubkey()),
                    &[&self.treasury_keypair],
                    recent_blockhash,
                );

                self.send_transaction_with_retry(&transaction, 3).await?;
                Ok(token_account)
            }
        }
    }

    /// Send transaction with retry + exponential backoff
    pub async fn send_transaction_with_retry(
        &self,
        transaction: &Transaction,
        max_retries: u32,
    ) -> Result<Signature> {
        let mut retries = 0;

        loop {
            match self.rpc_client.send_and_confirm_transaction(transaction) {
                Ok(sig) => return Ok(sig),
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
                    tokio::time::sleep(tokio::time::Duration::from_secs(2u64.pow(retries))).await;
                }
            }
        }
    }

    /// USDC mint configured from env
    fn get_usdc_mint(&self) -> Result<Pubkey> {
        Ok(self.usdc_mint)
    }
}
