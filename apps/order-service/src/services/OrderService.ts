
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
  private normalizeQuantity(value: number) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private normalizeAmount(value: number) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private deriveOrderStatus(quantity: number, filledQuantity: number) {
    if (filledQuantity >= quantity - 0.000001) {
      return "FILLED";
    }

    if (filledQuantity > 0) {
      return "PARTIAL";
    }

    return "OPEN";
  }

  private async applyTradeFillToOrder(
    tx: any,
    orderId: string | undefined,
    fillQuantity: number
  ) {
    if (!orderId || fillQuantity <= 0) {
      return;
    }

    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        quantity: true,
        filledQuantity: true,
      },
    });

    if (!existingOrder) {
      console.warn(`Order fill update skipped, order not found: ${orderId}`);
      return;
    }

    const totalQuantity = Number(existingOrder.quantity);
    const nextFilledQuantity = this.normalizeQuantity(
      Number(existingOrder.filledQuantity) + fillQuantity
    );

    await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        filledQuantity: nextFilledQuantity,
        status: this.deriveOrderStatus(totalQuantity, nextFilledQuantity),
      },
    });
  }

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

    const quantity = this.normalizeQuantity(params.amount / params.price);

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
        order_id: order.id,
      });

      console.log(
        `🎯 Matching: ${result.trades.length} trades, ${result.complementary_matches.length} complementary`
      );

      // Complementary → mint flow
      for (const cmatch of result.complementary_matches) {
        const yesCanonicalOrderId = cmatch.yes_reservation_id;
        const noCanonicalOrderId = cmatch.no_reservation_id;

        await redis.lpush(
          "mint:queue",
          JSON.stringify({
            trade_id: cmatch.trade_id,
            market_id: cmatch.market_id,
            yes_user_id: cmatch.yes_buyer_id,
            no_user_id: cmatch.no_buyer_id,
            // Canonical DB order IDs from reservation_id; do not use matching-engine internal order_id.
            yes_order_id: yesCanonicalOrderId,
            no_order_id: noCanonicalOrderId,
            yes_reservation_id: yesCanonicalOrderId,
            no_reservation_id: noCanonicalOrderId,
            pairs: String(Math.round(Number(cmatch.quantity))),  // ✅ String, not number
            yes_price: String(Number(cmatch.yes_price)),         // ✅ String
            no_price: String(Number(cmatch.no_price)),
            market_pda: market.marketPda,
            escrow_vault_pda: market.escrowVaultPda,
            usdc_vault: market.usdcVault,
            yes_token_mint: market.yesTokenMint,
            no_token_mint: market.noTokenMint,
            timestamp: new Date().toISOString(),
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
        await this.executeSecondaryTrade(trade, params.marketId);
      }

      if (
        result.trades.length === 0 &&
        result.complementary_matches.length === 0
      ) {
        if (params.orderType === "MARKET") {
          await prisma.$transaction(async (tx) => {
            if (params.side === "BUY") {
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
            }

            await tx.order.update({
              where: { id: order.id },
              data: { status: "CANCELLED" },
            });
          });

          return {
            orderId: order.id,
            matchingEngineOrderId: result.order_id,
            status: "CANCELLED",
            reason: "NO_LIQUIDITY",
          };
        }

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

  private async executeSecondaryTrade(trade: any, marketId: string) {
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
    const buyerReservationId =
      trade.buyer_reservation_id?.toString() ||
      trade["buyer_reservation_id"]?.toString();
    const sellerReservationId =
      trade.seller_reservation_id?.toString() ||
      trade["seller_reservation_id"]?.toString();
    const buyerOrderId =
      trade.buyer_order_id?.toString() ||
      trade["buyer_order_id"]?.toString();
    const sellerOrderId =
      trade.seller_order_id?.toString() ||
      trade["seller_order_id"]?.toString();

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
      console.log("SECONDARY FILL IDs:", {
        buyerOrderId,
        sellerOrderId,
        buyerReservationId,
        sellerReservationId,
        quantity,
      });
      await this.applyTradeFillToOrder(tx, buyerOrderId, quantity);   
      await this.applyTradeFillToOrder(tx, sellerOrderId, quantity);  

      console.log("✅ Secondary trade committed");
    });
  }

  async cancelOrder(params: { userId: string; orderId: string }) {
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        userId: params.userId,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status === "FILLED" || order.status === "CANCELLED") {
      throw new Error("ORDER_NOT_CANCELLABLE");
    }

    try {
      await matchingEngine.cancelOrder({
        market_id: order.marketId,
        order_id: order.id,
      });
    } catch (error: any) {
      console.warn(
        `Engine cancel failed for order ${params.orderId}, proceeding with DB cancel`,
        error?.message ?? error
      );
    }

    const filledAmount = this.normalizeAmount(
      Number(order.filledQuantity) * Number(order.price)
    );
    const releasableAmount = this.normalizeAmount(
      Math.max(0, Number(order.amount) - filledAmount)
    );

    await prisma.$transaction(async (tx) => {
      if (order.side === "BUY" && releasableAmount > 0) {
        await tx.ledger.update({
          where: {
            userId_asset: {
              userId: params.userId,
              asset: "USDC",
            },
          },
          data: {
            reserved: { decrement: releasableAmount },
            available: { increment: releasableAmount },
          },
        });

        await tx.reconciliationLog.create({
          data: {
            userId: params.userId,
            marketId: order.marketId,
            txSignature: `order-cancel:${order.id}`,
            type: "ORDER_CANCEL",
            status: "RESOLVED",
            metadata: JSON.stringify({
              orderId: order.id,
              releasedAmount: releasableAmount,
              side: order.side,
              outcome: order.outcome,
            }),
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
    });

    return {
      orderId: order.id,
      status: "CANCELLED",
      releasedAmount: releasableAmount,
    };
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
    try {
      return await matchingEngine.getOrderbook({
        market_id: marketId,
        outcome,
      });
    } catch (error: any) {
      if (error?.code === 5) {
        return {
          bids: [],
          asks: [],
        };
      }

      throw error;
    }
  }
}
