import {Elysia,t} from "elysia";

import {MarketService} from "market-service/market"
import { authPlugin } from "../plugins/auth";
import { AppError } from "../types";
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
      });
    