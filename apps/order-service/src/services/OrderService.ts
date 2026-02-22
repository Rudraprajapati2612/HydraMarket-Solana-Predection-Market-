
import { prisma } from "db/client";
import Redis from "ioredis";
import { BalanceService } from "user-services/balance";
import { MatchingEngineClient } from "../client/MatchingEngineClient";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const balanceService = new BalanceService();

const matchingEngine = new MatchingEngineClient(
  process.env.MATCHING_ENGINE_URL || "localhost:50052"
);

export class OrderService {
  async placeOrder(params: {
    userId: string;
    marketId: string;
    side: "BUY" | "SELL";
    outcome: "YES" | "NO";
    orderType: "LIMIT" | "MARKET" | "POSTONLY";
    amount: number;
    price: number;
  }) {
    console.log("📝 placeOrder", params);

    const market = await prisma.market.findUnique({
      where: { id: params.marketId },
    });

    if (!market || market.state !== "OPEN") {
      throw new Error("Market not available");
    }

    const quantity = params.amount / params.price;

    // BUY → need USDC
    if (params.side === "BUY") {
      const hasFunds = await balanceService.hasSufficientBalance(
        params.userId,
        "USDC",
        params.amount
      );
      if (!hasFunds) {
        throw new Error("Insufficient USDC balance");
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // BUY → reserve USDC
      if (params.side === "BUY") {
        await tx.ledger.update({
          where: {
            userId_asset: {
              userId: params.userId,
              asset: "USDC",
            },
          },
          data: {
            available: { decrement: params.amount },
            reserved: { increment: params.amount },
          },
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId: params.userId,
          marketId: params.marketId,
          side: params.side,
          outcome: params.outcome,
          amount: params.amount,
          price: params.price,
          quantity,
          status: "PENDING",
        },
      });

      return createdOrder;
    });

    console.log(`✅ Order created: ${order.id}`);

    try {
      const result = await matchingEngine.placeOrder({
        user_id: params.userId,
        market_id: params.marketId,
        side: params.side,
        outcome: params.outcome,
        order_type: params.orderType,
        price: params.price.toString(),
        quantity: quantity.toString(),
        reservation_id: order.id,
      });

      console.log(
        `🎯 Matching: ${result.trades.length} trades, ${result.complementary_matches.length} complementary`
      );

      // Complementary → mint flow
      for (const cmatch of result.complementary_matches) {
        await redis.lpush(
          "mint:queue",
          JSON.stringify({
            trade_id: cmatch.trade_id,
            market_id: cmatch.market_id,
            yes_user_id: cmatch.yes_buyer_id,
            no_user_id: cmatch.no_buyer_id,
            pairs: cmatch.quantity,
            yes_price: cmatch.yes_price,
            no_price: cmatch.no_price,
            market_pda: market.marketPda,
            escrow_vault_pda: market.escrowVaultPda,
            yes_token_mint: market.yesTokenMint,
            no_token_mint: market.noTokenMint,
            timestamp: cmatch.timestamp,
          })
        );

        await prisma.order.update({
          where: { id: order.id },
          data: { status: "MATCHED" },
        });
      }

      // Secondary trades
      for (const trade of result.trades) {
        console.log("RAW TRADE FROM GRPC:", trade);
        await this.executeSecondaryTrade(trade,params.marketId);

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FILLED",
            filledQuantity: { increment: Number(trade.quantity) },
          },
        });
      }

      if (
        result.trades.length === 0 &&
        result.complementary_matches.length === 0
      ) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "OPEN" },
        });
      }

      return {
        orderId: order.id,
        matchingEngineOrderId: result.order_id,
        status: result.status,
      };
    } catch (err) {
      console.error("❌ Matching failed", err);

      // Rollback BUY reserve
      if (params.side === "BUY") {
        await prisma.$transaction(async (tx) => {
          await tx.ledger.update({
            where: {
              userId_asset: {
                userId: params.userId,
                asset: "USDC",
              },
            },
            data: {
              available: { increment: params.amount },
              reserved: { decrement: params.amount },
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: { status: "FAILED" },
          });
        });
      }

      throw err;
    }
  }

  private async executeSecondaryTrade(trade: any,marketId:string) {
    console.log("FULL TRADE OBJECT:", JSON.stringify(trade));
  console.log("OUTCOME TYPE:", typeof trade.outcome, "VALUE:", trade.outcome);
    const buyerId = trade.buyer_id;
    const sellerId = trade.seller_id;
    const quantity = Number(trade.quantity);
    const price = Number(trade.price);
    const amount = quantity * price;
    const outcome = (
      trade.outcome?.toString() ||
      trade["outcome"]?.toString()
    )?.toUpperCase();
    
    if (outcome !== "YES" && outcome !== "NO") {
      console.error("BAD TRADE PAYLOAD", JSON.stringify(trade));
      throw new Error(`Invalid or missing trade.outcome: ${outcome}`);
    }
    if (!marketId) {
        throw new Error("Invariant violation: marketId missing in secondary trade");
    }

      if (!["YES", "NO"].includes(outcome)) {
        throw new Error(`Invalid trade outcome: ${outcome}`);
      }
    await prisma.$transaction(async (tx) => {
      // Buyer pays USDC
      await tx.ledger.update({
        where: {
          userId_asset: {
            userId: buyerId,
            asset: "USDC",
          },
        },
        data: {
          reserved: { decrement: amount },
        },
      });

      // Seller receives USDC
      await tx.ledger.update({
        where: {
          userId_asset: {
            userId: sellerId,
            asset: "USDC",
          },
        },
        data: {
          available: { increment: amount },
        },
      });

      // Buyer position (create empty, update once)
      const buyerPosition = await tx.position.upsert({
        where: {
          userId_marketId: {
            userId: buyerId,
            marketId,
          },
        },
        create: {
          userId: buyerId,
          marketId,
          yesTokens: 0,
          noTokens: 0,
        },
        update: {},
      });

      if (outcome === "YES") {
        const oldQty = Number(buyerPosition.yesTokens);
        const oldAvg = Number(buyerPosition.avgYesPrice || 0);
        const newQty = oldQty + quantity;
        const newAvg =
          oldQty > 0
            ? (oldQty * oldAvg + quantity * price) / newQty
            : price;

        await tx.position.update({
          where: {
            userId_marketId: {
              userId: buyerId,
              marketId,
            },
          },
          data: {
            yesTokens: { increment: quantity },
            avgYesPrice: newAvg,
          },
        });
      } else {
        const oldQty = Number(buyerPosition.noTokens);
        const oldAvg = Number(buyerPosition.avgNoPrice || 0);
        const newQty = oldQty + quantity;
        const newAvg =
          oldQty > 0
            ? (oldQty * oldAvg + quantity * price) / newQty
            : price;

        await tx.position.update({
          where: {
            userId_marketId: {
              userId: buyerId,
              marketId,
            },
          },
          data: {
            noTokens: { increment: quantity },
            avgNoPrice: newAvg,
          },
        });
      }

      // Seller position
      const sellerPosition = await tx.position.findUnique({
        where: {
          userId_marketId: {
            userId: sellerId,
            marketId,
          },
        },
      });

      if (!sellerPosition) {
        throw new Error("Seller has no position");
      }

      await tx.position.update({
        where: {
          userId_marketId: {
            userId: sellerId,
            marketId,
          },
        },
        data:
          outcome === "YES"
            ? { yesTokens: { decrement: quantity } }
            : { noTokens: { decrement: quantity } },
      });

      await tx.trade.create({
        data: {
          id: trade.trade_id,
          marketId,
          outcome,
          buyerId,
          sellerId,
          quantity,
          price,
          tradeType: "SECONDARY",
        },
      });

      console.log("✅ Secondary trade committed");
    });
  }

  async getUserOrders(userId: string, marketId?: string) {
    return await prisma.order.findMany({
        where: {
            userId,
            ...(marketId && { marketId }),  // Only filter by marketId if provided
        },
        include: {
            market: {
                select: {
                    id: true,
                    question: true,
                    state: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    })
}

async getOrderbook(marketId: string, outcome: 'YES' | 'NO') {
    return await matchingEngine.getOrderbook({
        market_id: marketId,
        outcome,
    });
}
}


