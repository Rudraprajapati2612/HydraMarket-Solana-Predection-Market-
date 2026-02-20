import { prisma } from "db/client"
import Redis from "ioredis";
import { BalanceService } from "user-services/balance"
import { MatchingEngineClient } from "../client/MatchingEngineClient"

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const balanceService = new BalanceService();
const matchingEngine = new MatchingEngineClient(
  process.env.MATCHING_ENGINE_URL || 'localhost:50052'
);

export class OrderService {
    async placeOrder(params: {
        userId: string;
        marketId: string;
        side: 'BUY' | 'SELL';
        outcome: 'YES' | 'NO';
        orderType: 'LIMIT' | 'MARKET' | 'POSTONLY';
        amount: number;
        price: number;
    }) {
        console.log(`📝 OrderService.placeOrder:`, params);

        // ✅ FIX 1: Use 'id' field, not 'marketId'
        const market = await prisma.market.findUnique({
            where: { id: params.marketId }
        })

        if (!market || market.state !== 'OPEN') {
            throw new Error("Market not available for trading")
        }

        const quantity = params.amount / params.price

        const hasFund = await balanceService.hasSufficientBalance(
            params.userId,
            'USDC',
            params.amount
        );

        if (!hasFund) {
            throw new Error("Insufficient balance")
        }

        // Reserve funds and create order
        const order = await prisma.$transaction(async (tx) => {
            await tx.ledger.update({
                where: {
                    userId_asset: {
                        userId: params.userId,
                        asset: 'USDC'
                    }
                },
                data: {
                    available: { decrement: params.amount },
                    reserved: { increment: params.amount }
                }
            })

            const newOrder = await tx.order.create({
                data: {
                    userId: params.userId,
                    marketId: params.marketId,
                    side: params.side,
                    outcome: params.outcome,
                    amount: params.amount,
                    price: params.price,
                    quantity,
                    status: 'PENDING',
                }
            })

            await balanceService.invalidateCache(params.userId, 'USDC');

            return newOrder;
        })

        console.log(`✅ Order created in DB: ${order.id}`);

        try {
            const matchResult = await matchingEngine.placeOrder({
                user_id: params.userId,
                market_id: params.marketId,
                side: params.side,
                outcome: params.outcome,
                order_type: params.orderType,
                price: params.price.toString(),
                quantity: quantity.toString(),
                reservation_id: order.id,
            });

            console.log(`🎯 Matching result: ${matchResult.trades.length} trades, ${matchResult.complementary_matches.length} complementary`);

            // Handle complementary matches
            for (const cmatch of matchResult.complementary_matches) {
                console.log(`✅ Complementary match detected: ${cmatch.quantity} pairs`);

                await redis.lpush('mint:queue', JSON.stringify({
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
                }));

                console.log(`📤 Pushed to mint:queue for Settlement Worker`);

                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'MATCHED' },
                })
            }

            // Handle secondary trades
            for (const trade of matchResult.trades) {
                console.log(`✅ Secondary trade: ${trade.buyer_id} ← ${trade.seller_id} (${trade.quantity} @ ${trade.price})`);

                await this.executeSecondaryTrade(trade);

                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: 'FILLED',
                        filledQuantity: parseFloat(trade.quantity),
                    },
                });
            }

            // ✅ FIX 2: Status should be 'OPEN', not 'PARTIAL'
            if (matchResult.trades.length === 0 && matchResult.complementary_matches.length === 0) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'OPEN' },  // ✅ Changed from 'PARTIAL'
                });

                console.log(`📋 Order added to orderbook (no immediate match)`);
            }

            return {
                orderId: order.id,
                matchingEngineOrderId: matchResult.order_id,
                status: matchResult.status,
                trades: matchResult.trades,
                complementaryMatches: matchResult.complementary_matches,
            };

        } catch (e) {
            console.error('❌ Matching engine error:', e);

            // Rollback
            await prisma.$transaction(async (tx) => {
                await tx.ledger.update({
                    where: {
                        userId_asset: {
                            userId: params.userId,
                            asset: 'USDC',
                        },
                    },
                    data: {
                        available: { increment: params.amount },
                        reserved: { decrement: params.amount },
                    },
                });

                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'FAILED' },
                });
            });

            throw new Error('Failed to place order in matching engine');
        }
    }

    private async executeSecondaryTrade(trade: any) {
        const buyerUserId = trade.buyer_id;
        const sellerUserId = trade.seller_id;
        const quantity = parseFloat(trade.quantity);
        const price = parseFloat(trade.price);
        const amount = quantity * price;
        const outcome = trade.outcome;
        const marketId = trade.market_id;

        await prisma.$transaction(async (tx) => {
            // Buyer pays USDC
            await tx.ledger.update({
                where: {
                    userId_asset: {
                        userId: buyerUserId,
                        asset: 'USDC'
                    }
                },
                data: {
                    reserved: { decrement: amount }
                }
            })

            // Seller receives USDC
            await tx.ledger.update({
                where: {
                    userId_asset: {
                        userId: sellerUserId,
                        asset: 'USDC',
                    },
                },
                data: {
                    available: { increment: amount },
                },
            });

            // Buyer's position
            const buyerPosition = await tx.position.upsert({
                where: {
                    userId_marketId: {
                        userId: buyerUserId,
                        marketId: marketId
                    }
                },
                create: {
                    userId: buyerUserId,
                    marketId: marketId,
                    yesTokens: outcome === 'YES' ? quantity : 0,
                    noTokens: outcome === 'NO' ? quantity : 0,
                    avgYesPrice: outcome === 'YES' ? price : null,
                    avgNoPrice: outcome === 'NO' ? price : null,
                },
                update: {}
            })

            // Update buyer's tokens
            if (outcome === 'YES') {
                const oldYesTokens = Number(buyerPosition.yesTokens);
                const oldAvgPrice = Number(buyerPosition.avgYesPrice || 0);
                const newYesTokens = oldYesTokens + quantity;

                const newAvgPrice = oldYesTokens > 0
                    ? (oldYesTokens * oldAvgPrice + quantity * price) / newYesTokens
                    : price;

                await tx.position.update({
                    where: {
                        userId_marketId: {
                            userId: buyerUserId,
                            marketId: marketId
                        }
                    },
                    data: {
                        yesTokens: { increment: quantity },
                        avgYesPrice: newAvgPrice,
                    }
                })
            } else {
                const oldNoTokens = Number(buyerPosition.noTokens);
                const oldAvgPrice = Number(buyerPosition.avgNoPrice || 0);
                const newNoTokens = oldNoTokens + quantity;

                const newAvgPrice = oldNoTokens > 0
                    ? (oldNoTokens * oldAvgPrice + quantity * price) / newNoTokens
                    : price;

                await tx.position.update({
                    where: {
                        userId_marketId: {
                            userId: buyerUserId,
                            marketId: marketId,
                        },
                    },
                    data: {
                        noTokens: { increment: quantity },
                        avgNoPrice: newAvgPrice,
                    },
                });
            }

            // Seller's position
            const sellerPosition = await tx.position.findUnique({
                where: {
                    userId_marketId: {
                        userId: sellerUserId,
                        marketId: marketId
                    }
                }
            })

            if (!sellerPosition) {
                throw new Error("Seller does not have position in this market")
            }

            // Update seller's tokens
            if (outcome === 'YES') {
                await tx.position.update({
                    where: {
                        userId_marketId: {
                            userId: sellerUserId,
                            marketId: marketId
                        }
                    },
                    data: {
                        yesTokens: { decrement: quantity }
                    }
                })
            } else {
                await tx.position.update({
                    where: {
                        userId_marketId: {
                            userId: sellerUserId,
                            marketId: marketId
                        }
                    },
                    data: {
                        noTokens: { decrement: quantity }
                    }
                })
            }

            // Record trade
            await tx.trade.create({
                data: {
                    id: trade.trade_id,
                    marketId: trade.market_id,
                    outcome: outcome,
                    buyerId: buyerUserId,
                    sellerId: sellerUserId,
                    quantity: quantity,
                    price: price,
                    tradeType: 'SECONDARY',
                }
            })

            console.log(`✅ Secondary trade executed in database`);
        })
    }

    // ✅ FIX 3: Make public and marketId optional
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