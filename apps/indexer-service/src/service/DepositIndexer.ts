// apps/indexer-service/src/service/DepositIndexer.ts

import "dotenv/config";
import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { prisma } from "db/client";
import Redis from "ioredis";

const USDC_DECIMALS = 6;
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export class DepositIndexer {
  private connection: Connection;
  private hotWallet: PublicKey;
  private usdcMint: PublicKey;
  private isRunning = false;
  private subscriptionId: number | null = null;

  constructor(
    rpcUrl: string,
    hotWalletAddress: string,
    usdcMintAddress: string
  ) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.hotWallet = new PublicKey(hotWalletAddress);
    this.usdcMint = new PublicKey(usdcMintAddress);
  }

  async start() {
    console.log("🔍 Starting deposit indexer (WEBSOCKET)...");
    console.log(`   Hot Wallet: ${this.hotWallet.toBase58()}`);
    console.log(`   USDC Mint: ${this.usdcMint.toBase58()}\n`);

    this.isRunning = true;

    // Subscribe to wallet logs
    await this.subscribeToWallet();

    console.log("✅ Deposit indexer running!\n");
  }

  stop() {
    this.isRunning = false;
    
    // Unsubscribe from WebSocket
    if (this.subscriptionId !== null) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      console.log("🔌 WebSocket unsubscribed");
    }
    
    console.log("🛑 Deposit indexer stopped");
  }

  private async subscribeToWallet() {
    console.log("📡 Subscribing to hot wallet logs...\n");

    // ✅ Subscribe to account logs (this triggers for ALL transactions!)
    this.subscriptionId = this.connection.onLogs(
      this.hotWallet,
      async (logs, ctx) => {
        // Skip failed transactions
        if (logs.err) {
          return;
        }

        console.log(`\n🔔 New transaction detected: ${logs.signature}`);
        await this.handleTransaction(logs.signature);
      },
      "confirmed"
    );

    console.log("✅ WebSocket subscription active!");
    console.log("   Listening for transactions...\n");
  }

  /**
   * Process transaction directly (for webhook/manual)
   */
  async processTransactionDirectly(signature: string) {
    await this.handleTransaction(signature);
  }

  /**
   * Manual processing
   */
  async processTransactionManually(signature: string) {
    console.log(`\n🎯 Manually processing: ${signature}\n`);
    await this.handleTransaction(signature);
  }

  private async handleTransaction(signature: string) {
    try {
      // Check if already processed
      const cacheKey = `indexed:tx:${signature}`;
      const processed = await redis.get(cacheKey);

      if (processed) {
        console.log(`   ⏭️  Already processed\n`);
        return;
      }

      console.log(`   📥 Processing transaction...`);

      // Mark as processing
      await redis.setex(cacheKey, 86400, "processing");

      // Fetch transaction
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) {
        console.log(`   ❌ Transaction not found\n`);
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      // Check if transaction succeeded
      if (tx.meta.err) {
        console.log(`   ❌ Transaction failed\n`);
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      // Parse USDC transfer
      const depositInfo = this.parseUSDCTransfer(tx);

      if (!depositInfo) {
        console.log(`   ⏭️  Not a USDC transfer\n`);
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      console.log(`   💰 USDC Transfer: ${depositInfo.amount} USDC`);

      // Extract memo
      const memo = this.extractMemo(tx);

      if (!memo) {
        console.log(`   ⚠️  NO MEMO FOUND!`);
        await this.storeNoMemoDeposit(signature, depositInfo);
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      const normalizedMemo = memo.trim().toUpperCase();
      console.log(`   📝 Memo: "${normalizedMemo}"`);

      // Validate memo format
      if (!this.isValidMemoFormat(normalizedMemo)) {
        console.log(`   ⚠️  Invalid memo format\n`);
        await this.storeInvalidMemoDeposit(
          signature,
          depositInfo,
          normalizedMemo
        );
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      // Find user by memo
      const user = await prisma.user.findUnique({
        where: { depositeMemo: normalizedMemo },
      });

      if (!user) {
        console.log(`   ⚠️  Unknown memo: "${normalizedMemo}"\n`);
        await this.storeUnknownMemoDeposit(
          signature,
          depositInfo,
          normalizedMemo
        );
        await redis.setex(cacheKey, 86400, "completed");
        return;
      }

      console.log(`   👤 User: ${user.username}`);

      // Process deposit
      await this.processDeposit(
        user.id,
        depositInfo,
        normalizedMemo,
        signature,
        tx
      );

      // Mark as completed
      await redis.setex(cacheKey, 86400, "completed");

      console.log(`   ✅ Deposit credited: ${depositInfo.amount} USDC\n`);

    } catch (error) {
      console.error(`   ❌ Error:`, error);
      await redis.lpush(
        "deposits:failed",
        JSON.stringify({
          signature,
          error: error instanceof Error ? error.message : "Unknown",
          timestamp: Date.now(),
        })
      );
      console.log();
    }
  }

  private extractMemo(tx: ParsedTransactionWithMeta): string | null {
    const instructions = tx.transaction.message.instructions;
    const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

    for (const instruction of instructions) {
      // Check for SPL memo
      if ("program" in instruction && instruction.program === "spl-memo") {
        if ("parsed" in instruction && instruction.parsed) {
          const memo =
            typeof instruction.parsed === "string"
              ? instruction.parsed
              : JSON.stringify(instruction.parsed);

          if (memo && memo.trim()) {
            return memo.trim();
          }
        }
      }

      // Check programId
      if ("programId" in instruction) {
        if (instruction.programId.toBase58() === MEMO_PROGRAM_ID) {
          if ("parsed" in instruction && instruction.parsed) {
            const parsed = instruction.parsed;
            if (typeof parsed === "string" && parsed.trim()) {
              return parsed.trim();
            }
          }
        }
      }
    }

    return null;
  }

  private parseUSDCTransfer(tx: ParsedTransactionWithMeta): {
    fromAddress: string | null;
    toAddress: string;
    amount: number;
  } | null {
    if (!tx.meta || tx.meta.err) return null;

    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
      if ("parsed" in instruction && instruction.program === "spl-token") {
        const parsed = instruction.parsed;

        if (parsed.type === "transfer" || parsed.type === "transferChecked") {
          const info = parsed.info;

          // Verify USDC mint
          if (parsed.type === "transferChecked") {
            if (info.mint !== this.usdcMint.toBase58()) {
              continue;
            }
          }

          const rawAmount =
            parsed.type === "transferChecked"
              ? info.tokenAmount.amount
              : info.amount;

          const amount = parseInt(rawAmount) / Math.pow(10, USDC_DECIMALS);

          return {
            fromAddress: info.source || null,
            toAddress: info.destination,
            amount,
          };
        }
      }
    }

    return null;
  }

  private isValidMemoFormat(memo: string): boolean {
    if (!memo || typeof memo !== "string") return false;
    const regex = /^DEP-[A-F0-9]{6}$/;
    return regex.test(memo.trim().toUpperCase());
  }

  private async processDeposit(
    userId: string,
    depositInfo: any,
    memo: string,
    signature: string,
    tx: ParsedTransactionWithMeta
  ) {
    await prisma.$transaction(async (prisma) => {
      // Create deposit
      await prisma.deposit.create({
        data: {
          userId,
          asset: "USDC",
          amount: depositInfo.amount,
          txHash: signature,
          memo,
          fromAddress: depositInfo.fromAddress,
          toAddress: depositInfo.toAddress,
          status: "CONFIRMED",
          blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
          confirmedAt: new Date(),
        },
      });

      // Get current balance
      let ledger = await prisma.ledger.findUnique({
        where: { userId_asset: { userId, asset: "USDC" } },
      });

      const balanceBefore = ledger ? Number(ledger.available) : 0;

      // Update ledger
      if (ledger) {
        ledger = await prisma.ledger.update({
          where: { userId_asset: { userId, asset: "USDC" } },
          data: { available: { increment: depositInfo.amount } },
        });
      } else {
        ledger = await prisma.ledger.create({
          data: {
            userId,
            asset: "USDC",
            available: depositInfo.amount,
            reserved: 0,
          },
        });
      }

      const balanceAfter = Number(ledger.available);

      console.log(`   💾 Balance: ${balanceBefore} → ${balanceAfter} USDC`);

      // Audit log
      await prisma.ledgerChange.create({
        data: {
          userId,
          asset: "USDC",
          changeType: "DEPOSIT",
          amount: depositInfo.amount,
          balanceBefore,
          balanceAfter,
          referenceId: signature,
          referenceType: "DEPOSIT",
          metadata: JSON.stringify({ memo }),
        },
      });
    });

    await redis.del(`balance:${userId}:USDC`);
  }

  private async storeNoMemoDeposit(signature: string, info: any) {
    await redis.lpush(
      "deposits:no_memo",
      JSON.stringify({ signature, ...info, timestamp: Date.now() })
    );
  }

  private async storeInvalidMemoDeposit(
    signature: string,
    info: any,
    memo: string
  ) {
    await redis.lpush(
      "deposits:invalid_memo",
      JSON.stringify({ signature, memo, ...info, timestamp: Date.now() })
    );
  }

  private async storeUnknownMemoDeposit(
    signature: string,
    info: any,
    memo: string
  ) {
    await redis.lpush(
      "deposits:unknown_memo",
      JSON.stringify({ signature, memo, ...info, timestamp: Date.now() })
    );
  }
}