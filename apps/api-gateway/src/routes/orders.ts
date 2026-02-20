import {Elysia,t} from "elysia";

import { OrderService } from "order-service/order";
import { authPlugin } from "../plugins/auth";
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
            orderType: 'LIMIT' 
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
      });