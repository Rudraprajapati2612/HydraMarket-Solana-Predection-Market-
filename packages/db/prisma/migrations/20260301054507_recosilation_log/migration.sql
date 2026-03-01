-- CreateTable
CREATE TABLE "reconciliation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "tx_signature" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_logs_status_idx" ON "reconciliation_logs"("status");

-- CreateIndex
CREATE INDEX "reconciliation_logs_user_id_idx" ON "reconciliation_logs"("user_id");
