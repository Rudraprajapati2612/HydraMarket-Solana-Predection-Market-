/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'RESERVE', 'RELEASE', 'TRADE_BUY', 'TRADE_SELL');

-- CreateEnum
CREATE TYPE "DepositeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "user_id" TEXT NOT NULL,
    "wallet_index" BIGINT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ledger" (
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "available" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_pkey" PRIMARY KEY ("user_id","asset")
);

-- CreateTable
CREATE TABLE "ledger_changes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "balance_before" DECIMAL(20,8) NOT NULL,
    "balance_after" DECIMAL(20,8) NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "status" "DepositeStatus" NOT NULL DEFAULT 'PENDING',
    "block_time" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_wallet_index_key" ON "user_wallets"("wallet_index");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_address_key" ON "user_wallets"("address");

-- CreateIndex
CREATE INDEX "user_wallets_address_idx" ON "user_wallets"("address");

-- CreateIndex
CREATE INDEX "ledger_user_id_idx" ON "ledger"("user_id");

-- CreateIndex
CREATE INDEX "ledger_changes_user_id_created_at_idx" ON "ledger_changes"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ledger_changes_reference_id_idx" ON "ledger_changes"("reference_id");

-- CreateIndex
CREATE INDEX "deposits_user_id_updated_at_idx" ON "deposits"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "deposits_tx_hash_idx" ON "deposits"("tx_hash");

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
