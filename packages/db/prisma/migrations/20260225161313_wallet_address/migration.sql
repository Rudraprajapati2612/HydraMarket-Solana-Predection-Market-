-- AlterTable
ALTER TABLE "user" ADD COLUMN     "withdrawal_address" TEXT;

-- CreateIndex
CREATE INDEX "user_withdrawal_address_idx" ON "user"("withdrawal_address");
