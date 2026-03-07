import {Elysia,t} from "elysia";

import {MarketService} from "market-service/market"
import { authPlugin } from "../plugins/auth";
import { AppError } from "../types";
import {prisma} from "db/client"
const marketService = new MarketService();

export const marketRoutes = new Elysia({prefix:'/markets'})
        .use(authPlugin())
       .post('/',async({user,body})=>{
        if (!user) {
            throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
          }
          
          if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
            throw new AppError(
              'Forbidden: Admin access required',
              403,
              'FORBIDDEN'
            );
          }
      
          console.log(`🎯 Admin ${user.username} creating market: ${body.question}`);

          const result = await marketService.createMarket({
            question: body.question,
            description: body.description,
            category: body.category,
            expiresAt: new Date(body.expiresAt),
            resolutionSource: body.resolutionSource,
            creatorId: user.userId,
          });
          
          return {
            success: true,
            data : result,
            message: 'Market created successfully',
          };
       },{
        body: t.Object({
            question: t.String({ minLength: 10, maxLength: 200 }),
            description: t.String({ minLength: 20, maxLength: 2000 }),
            category: t.String(),
            expiresAt: t.String(), // ISO date
            resolutionSource: t.String(),
          }),
       })


       .get('/', async ({ query }) => {
        const markets = await marketService.listMarket({
          state: query.state,
          category: query.category,
          limit: query.limit,
          offset: query.offset,
        });
        
        return {
          success: true,
          data: markets,
        };
      }, {
        query: t.Object({
          state: t.Optional(t.String()),
          category: t.Optional(t.String()),
          limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Number({ minimum: 0 })),
        }),
      })
      
      /**
       * GET /markets/:id - Get market details
       */
      .get('/:id', async ({ params }) => {
        const market = await marketService.getMarket(params.id);
        
        if (!market) {
          throw new Error('Market not found');
        }
        
        return {
          success: true,
          data: market,
        };
      })

      .get('/:id/price', async ({ params }) => {
        const market = await prisma.market.findUnique({
          where:  { id: params.id },
          select: { id: true, state: true, outcome: true },
        });
        if (!market) return { success: false, error: 'Market not found' };
    
        const [yesBestAsk, yesBestBid, noBestAsk, noBestBid] = await Promise.all([
          prisma.order.findFirst({
            where:   { marketId: params.id, outcome: 'YES', side: 'SELL', status: 'OPEN' },
            orderBy: { price: 'asc' },
            select:  { price: true },
          }),
          prisma.order.findFirst({
            where:   { marketId: params.id, outcome: 'YES', side: 'BUY', status: 'OPEN' },
            orderBy: { price: 'desc' },
            select:  { price: true },
          }),
          prisma.order.findFirst({
            where:   { marketId: params.id, outcome: 'NO', side: 'SELL', status: 'OPEN' },
            orderBy: { price: 'asc' },
            select:  { price: true },
          }),
          prisma.order.findFirst({
            where:   { marketId: params.id, outcome: 'NO', side: 'BUY', status: 'OPEN' },
            orderBy: { price: 'desc' },
            select:  { price: true },
          }),
        ]);
    
        const mid = (bid: any, ask: any) =>
          bid && ask ? (Number(bid.price) + Number(ask.price)) / 2
          : bid      ? Number(bid.price)
          : ask      ? Number(ask.price)
          : null;
    
        const yesMid = mid(yesBestBid, yesBestAsk);
        const noMid  = mid(noBestBid,  noBestAsk);
    
        return {
          success: true,
          data: {
            marketId: params.id,
            yes: {
              bestBid:  yesBestBid ? Number(yesBestBid.price) : null,
              bestAsk:  yesBestAsk ? Number(yesBestAsk.price) : null,
              midPrice: yesMid,
              spread:   yesBestBid && yesBestAsk
                ? Number(yesBestAsk.price) - Number(yesBestBid.price) : null,
            },
            no: {
              bestBid:  noBestBid ? Number(noBestBid.price) : null,
              bestAsk:  noBestAsk ? Number(noBestAsk.price) : null,
              midPrice: noMid,
              spread:   noBestBid && noBestAsk
                ? Number(noBestAsk.price) - Number(noBestBid.price) : null,
            },
            // e.g. 60 means "60% chance YES"
            impliedProbabilityYes: yesMid ? Math.round(yesMid * 100) : null,
            impliedProbabilityNo:  noMid  ? Math.round(noMid  * 100) : null,
          },
        };
      },{
        params : t.Object({
          id : t.String()
        })
      })
      
      .get('/:id/trades', async ({ params, query }) => {
        const limit = Math.min(Number((query as any).limit ?? 50), 200);
    
        const market = await prisma.market.findUnique({
          where: { id: params.id }, select: { id: true },
        });
        if (!market) return { success: false, error: 'Market not found' };
    
        const trades = await prisma.order.findMany({
          where:   { marketId: params.id, status: { in: ['FILLED', 'PARTIAL'] } },
          orderBy: { updatedAt: 'desc' },
          take:    limit,
          select:  { id: true, outcome: true, side: true, price: true, amount: true, updatedAt: true },
        });
    
        return {
          success: true,
          data: trades.map(t => ({
            id:        t.id,
            outcome:   t.outcome,   // YES | NO
            side:      t.side,      // BUY | SELL
            price:     Number(t.price),
            amount:    Number(t.amount),
            timestamp: t.updatedAt,
          })),
        };
      })

      .get('/:id/positions', async ({ params, user }) => {
        if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    
        const position = await prisma.position.findUnique({
          where:   { userId_marketId: { userId: user.userId, marketId: params.id } },
          include: { market: true },
        });
    
        if (!position) return { success: true, data: null };
    
        const yes     = Number(position.yesTokens);
        const no      = Number(position.noTokens);
        const outcome = position.market.outcome;
    
        let pendingPayout = 0;
        if (outcome === 'YES')          pendingPayout = yes;
        else if (outcome === 'NO')      pendingPayout = no;
        else if (outcome === 'INVALID') pendingPayout = yes + no;
    
        return {
          success: true,
          data: {
            marketId:       params.id,
            marketQuestion: position.market.question,
            marketState:    position.market.state,
            marketOutcome:  outcome,
            yesTokens:      yes,
            noTokens:       no,
            isClaimed:      position.isClaimed,
            claimedAt:      position.claimedAt,
            claimTxHash:    position.claimTxHash,
            // Non-null only if market resolved + user won + not yet claimed
            pendingPayout:  pendingPayout > 0 && !position.isClaimed ? pendingPayout : null,
          },
        };
      },{
        params : t.Object({
          id : t.String()
        })
      })

      .get('/:id/stats', async ({ params }) => {
        const market = await prisma.market.findUnique({
          where: { id: params.id }, select: { id: true },
        });
        if (!market) return { success: false, error: 'Market not found' };
    
        const [openOrders, filledOrders, participants, volume] = await Promise.all([
          prisma.order.count({ where: { marketId: params.id, status: 'OPEN' } }),
          prisma.order.count({ where: { marketId: params.id, status: 'FILLED' } }),
          prisma.position.count({ where: { marketId: params.id } }),
          prisma.order.aggregate({
            where: { marketId: params.id, status: 'FILLED' },
            _sum:  { amount: true },
          }),
        ]);
    
        return {
          success: true,
          data: {
            marketId:     params.id,
            openOrders,
            filledOrders,
            participants,
            totalVolume:  Number(volume._sum.amount ?? 0),
          },
        };
      });