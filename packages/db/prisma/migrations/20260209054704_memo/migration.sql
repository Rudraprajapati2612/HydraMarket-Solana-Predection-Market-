/*
  Warnings:

  - You are about to drop the `user_wallets` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tx_hash]` on the table `deposits` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deposie_memo` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('HOT', 'COLD');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- DropForeignKey
ALTER TABLE "user_wallets" DROP CONSTRAINT "user_wallets_user_id_fkey";

-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "memo" TEXT,
ALTER COLUMN "from_address" DROP NOT NULL,
ALTER COLUMN "block_time" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deposie_memo" TEXT NOT NULL;

-- DropTable
DROP TABLE "user_wallets";

-- CreateTable
CREATE TABLE "platform_wallets" (
    "id" TEXT NOT NULL,
    "wallet_type" "WalletType" NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "destination_address" TEXT NOT NULL,
    "tx_hash" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3) NOT NULL,
    "failure_reason" TEXT,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_wallets_address_key" ON "platform_wallets"("address");

-- CreateIndex
CREATE INDEX "platform_wallets_wallet_type_idx" ON "platform_wallets"("wallet_type");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_tx_hash_key" ON "withdrawals"("tx_hash");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_requested_at_idx" ON "withdrawals"("user_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_tx_hash_key" ON "deposits"("tx_hash");

-- CreateIndex
CREATE INDEX "deposits_memo_idx" ON "deposits"("memo");

-- CreateIndex
CREATE INDEX "user_deposie_memo_idx" ON "user"("deposie_memo");

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
