-- DropForeignKey
ALTER TABLE "positions" DROP CONSTRAINT "positions_id_fkey";

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
