/*
  Warnings:

  - The values [BUY_YES,BUY_NO,SELL_YES,SELL_NO] on the enum `OrderSide` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `outcome` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderOutcome" AS ENUM ('NO', 'YES');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('SECONDARY', 'COMPLEMENTARY');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderSide_new" AS ENUM ('YES', 'NO');
ALTER TABLE "orders" ALTER COLUMN "side" TYPE "OrderSide_new" USING ("side"::text::"OrderSide_new");
ALTER TYPE "OrderSide" RENAME TO "OrderSide_old";
ALTER TYPE "OrderSide_new" RENAME TO "OrderSide";
DROP TYPE "public"."OrderSide_old";
COMMIT;

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'OPEN';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "outcome" "OrderOutcome" NOT NULL;

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "price" DECIMAL(5,4) NOT NULL,
    "trade_type" "TradeType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_market_id_idx" ON "trades"("market_id");

-- CreateIndex
CREATE INDEX "trades_buyer_id_idx" ON "trades"("buyer_id");

-- CreateIndex
CREATE INDEX "trades_seller_id_idx" ON "trades"("seller_id");
