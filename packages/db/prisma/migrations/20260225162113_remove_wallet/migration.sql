/*
  Warnings:

  - You are about to drop the column `withdrawal_address` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_withdrawal_address_idx";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "withdrawal_address";
