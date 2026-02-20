/*
  Warnings:

  - The values [YES,NO] on the enum `OrderSide` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderSide_new" AS ENUM ('BUY', 'SELL');
ALTER TABLE "orders" ALTER COLUMN "side" TYPE "OrderSide_new" USING ("side"::text::"OrderSide_new");
ALTER TYPE "OrderSide" RENAME TO "OrderSide_old";
ALTER TYPE "OrderSide_new" RENAME TO "OrderSide";
DROP TYPE "public"."OrderSide_old";
COMMIT;
