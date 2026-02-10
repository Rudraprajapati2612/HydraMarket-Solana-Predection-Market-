import { Elysia } from "elysia";
import { DepositIndexer } from "./DepositIndexer";

let indexer: DepositIndexer | null = null;

export function setIndexer(idx: DepositIndexer) {
  indexer = idx;
}

function isValidSignature(sig: string) {
    return typeof sig === "string" && sig.length > 80;
  }
  

export const webhookRoute = new Elysia()
.post("/webhooks/helius", async ({ body }) => {
    console.log("\n📨 Received Helius webhook");
  
    if (!indexer) {
      console.error("❌ Indexer not initialized!");
      return { success: false, error: "Indexer not ready" };
    }
  
    const webhook = body as any;
  
    try {
      if (Array.isArray(webhook)) {
        for (const tx of webhook) {
          if (isValidSignature(tx?.signature)) {
            console.log(`🔔 Processing: ${tx.signature.slice(0, 16)}...`);
            await indexer.processTransactionDirectly(tx.signature);
          } else {
            console.warn("⚠️ Skipping invalid signature:", tx?.signature);
          }
        }
      } else if (isValidSignature(webhook?.signature)) {
        console.log(`🔔 Processing: ${webhook.signature.slice(0, 16)}...`);
        await indexer.processTransactionDirectly(webhook.signature);
      } else {
        console.warn("⚠️ Invalid webhook payload:", webhook);
      }
  
      return { success: true };
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      return { success: false, error: String(error) };
    }
  });
  