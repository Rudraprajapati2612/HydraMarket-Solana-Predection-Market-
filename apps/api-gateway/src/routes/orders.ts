import {Elysia,t} from "elysia";

import { OrderService } from "order-service/order";
import { authPlugin } from "../plugins/auth";
import { prisma } from "db/client";
import { AppError } from "../types";
const orderService = new OrderService();

export const orderRoutes = new Elysia({prefix:'/orders'})
    .use(authPlugin())
    .post('/', async ({ user, body }) => {
        if(!user){
            throw new Error("Invalid User ")
        }
        const result = await orderService.placeOrder({
            userId: user.userId,
            marketId: body.marketId,
            side: body.side,
            outcome: body.outcome,
            amount: body.amount,
            price: body.price,
            orderType: body.orderType as 'LIMIT' | 'MARKET' | 'POSTONLY'
        });
        
        return {
          success: true,
          data: result,
        };
      }, {
        body: t.Object({
          marketId: t.String(),
          side: t.Union([t.Literal('BUY'), t.Literal('SELL')]),
          outcome: t.Union([t.Literal('YES'), t.Literal('NO')]),
          amount: t.Number({ minimum: 1 }),
          price: t.Number({ minimum: 0.01, maximum: 0.99 }),
          orderType: t.Union([
            t.Literal('LIMIT'),
            t.Literal('MARKET'),
            t.Literal('POSTONLY')
          ]),
        }),
      })
      
      .get('/', async ({ user, query }) => {
        if(!user){
            throw new Error("User is absent")
        }
        const orders = await orderService.getUserOrders(
          user.userId,
          query.marketId
        );
        
        return {
          success: true,
          data: orders,
        };
      }, {
        query: t.Object({
          marketId: t.Optional(t.String()),
        }),
      })

      .get('/trades', async ({ user, query }) => {
        if (!user) {
          throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        const limit = Math.min(Number((query as any).limit ?? 50), 200);
        const marketId = (query as any).marketId;

        const trades = await prisma.trade.findMany({
          where: {
            ...(marketId ? { marketId } : {}),
            OR: [
              { buyerId: user.userId },
              { sellerId: user.userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        const marketIds = Array.from(new Set(trades.map((trade) => trade.marketId)));
        const markets = marketIds.length > 0
          ? await prisma.market.findMany({
              where: { id: { in: marketIds } },
              select: { id: true, question: true },
            })
          : [];
        const marketMap = new Map(markets.map((market) => [market.id, market.question]));

        return {
          success: true,
          data: trades.map((trade) => ({
            id: trade.id,
            marketId: trade.marketId,
            marketQuestion: marketMap.get(trade.marketId) ?? 'Unknown market',
            outcome: trade.outcome,
            role: trade.buyerId === user.userId ? 'BUY' : 'SELL',
            quantity: Number(trade.quantity),
            price: Number(trade.price),
            total: Number(trade.quantity) * Number(trade.price),
            tradeType: trade.tradeType,
            timestamp: trade.createdAt,
          })),
        };
      }, {
        query: t.Object({
          marketId: t.Optional(t.String()),
          limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
        }),
      })
      
      /**
       * GET /orders/orderbook/:marketId/:outcome - Get orderbook
       */
      .get('/orderbook/:marketId/:outcome', async ({ params }) => {
        const orderbook = await orderService.getOrderbook(
          params.marketId,
          params.outcome as 'YES' | 'NO'
        );
        
        return {
          success: true,
          data: orderbook,
        };
      })

      .post('/:id/cancel', async ({ user, params }) => {
        if (!user) {
          throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        const order = await prisma.order.findFirst({
          where: {
            id: params.id,
            userId: user.userId,
          },
        });

        if (!order) {
          throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (order.status === 'FILLED' || order.status === 'CANCELLED') {
          throw new AppError('Order cannot be cancelled', 400, 'ORDER_NOT_CANCELLABLE');
        }

        const filledAmount = Number(order.filledQuantity) * Number(order.price);
        const releasableAmount = Math.max(0, Number(order.amount) - filledAmount);

        await prisma.$transaction(async (tx) => {
          if (order.side === 'BUY' && releasableAmount > 0) {
            await tx.ledger.update({
              where: {
                userId_asset: {
                  userId: user.userId,
                  asset: 'USDC',
                },
              },
              data: {
                reserved: { decrement: releasableAmount },
                available: { increment: releasableAmount },
              },
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
        });

        return {
          success: true,
          data: {
            orderId: order.id,
            status: 'CANCELLED',
            releasedAmount: releasableAmount,
          },
        };
      }, {
        params: t.Object({
          id: t.String(),
        }),
      });
