// process-tx.ts
import "dotenv/config";
import { DepositIndexer } from "../src/service/DepositIndexer"; // adjust path

async function main() {
  const indexer = new DepositIndexer(
    process.env.SOLANA_RPC_URL!,
    "6oktp2QmgQgmxKxzBfgTGD11T1VwmQx8Gxkg8gcUMG72",
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  );

  await indexer.processTransactionManually(
    "26jhfNqSwpVQfv7NFBsQirjxrzJ5Yxs9bMq4Rxzb4DJN1kAJmVnt7P1DDqTbw8nVU8oDSH2XqaumPbiVfWZEa4Qp"
  );
}

main().catch(console.error);