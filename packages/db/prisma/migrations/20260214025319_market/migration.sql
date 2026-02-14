-- CreateEnum
CREATE TYPE "MarketState" AS ENUM ('OPEN', 'CLOSE', 'CREATED', 'RESOLVED', 'RESOLVING', 'PAUSED');

-- CreateEnum
CREATE TYPE "MarketOutcome" AS ENUM ('YES', 'NO', 'INVALID');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY_YES', 'BUY_NO', 'SELL_YES', 'SELL_NO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "market_pda" TEXT NOT NULL,
    "escrow_vault_pda" TEXT NOT NULL,
    "yes_token_mint" TEXT NOT NULL,
    "no_token_mint" TEXT NOT NULL,
    "state" "MarketState" NOT NULL DEFAULT 'CLOSE',
    "outcome" "MarketOutcome",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "price" DECIMAL(5,4) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "filled_quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "yes_tokens" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "no_tokens" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "avg_yes_price" DECIMAL(5,4),
    "avg_no_price" DECIMAL(5,4),
    "yes_token_account" TEXT,
    "no_token_account" TEXT,
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "claim_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mint_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "yes_recipient_id" TEXT NOT NULL,
    "no_recipient_id" TEXT NOT NULL,
    "pairs" INTEGER NOT NULL,
    "collateral_amount" DECIMAL(20,6) NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "mint_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markets_market_id_key" ON "markets"("market_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_market_id_idx" ON "orders"("market_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "positions_user_id_idx" ON "positions"("user_id");

-- CreateIndex
CREATE INDEX "positions_market_id_idx" ON "positions"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_user_id_market_id_key" ON "positions"("user_id", "market_id");

-- CreateIndex
CREATE UNIQUE INDEX "mint_transactions_tx_hash_key" ON "mint_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "mint_transactions_user_id_idx" ON "mint_transactions"("user_id");

-- CreateIndex
CREATE INDEX "mint_transactions_status_idx" ON "mint_transactions"("status");

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_id_fkey" FOREIGN KEY ("id") REFERENCES "markets"("market_id") ON DELETE RESTRICT ON UPDATE CASCADE;
