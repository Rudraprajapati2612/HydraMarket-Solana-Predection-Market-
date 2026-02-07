/*
  Warnings:

  - You are about to drop the column `updated_at` on the `deposits` table. All the data in the column will be lost.
  - The `status` column on the `deposits` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- DropIndex
DROP INDEX "deposits_user_id_updated_at_idx";

-- AlterTable
ALTER TABLE "deposits" DROP COLUMN "updated_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "DepositStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "DepositeStatus";

-- CreateIndex
CREATE INDEX "deposits_user_id_created_at_idx" ON "deposits"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");
