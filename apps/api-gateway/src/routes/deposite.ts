import {Elysia,ELYSIA_FORM_DATA,t} from "elysia";
import { BalanceService } from "user-services/balance";
import { authPlugin } from "../plugins/auth";
import { AppError } from "../types";
import {prisma} from "db/client"
const balanceService =  new BalanceService();


export const depositeRoute = new Elysia({prefix:'/deposit'})


    .use(authPlugin())
    // get deposite/instruction 
    .get('/instruction',async({user})=>{
        if(!user){
            throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }
        const instruction = await balanceService.getDepositInstructions(user.userId);

        return {
            success : true,
            data : instruction
        }
    })

    // get user deposite history 
    .get('/',async({user,query})=>{
        if(!user){
            throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }
        const deposits = await balanceService.getDepositeHistory(user.userId, {
            status: query.status || "",
            limit: query.limit,
            offset: query.offset,
          });
          
          return {
            success: true,
            ...deposits,
          };
    },{
        query: t.Object({
            status: t.Optional(t.Union([
              t.Literal('PENDING'),
              t.Literal('CONFIRMED'),
              t.Literal('FAILED'),
            ])),
            limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
            offset: t.Optional(t.Number({ minimum: 0 })),
          }),
    })

    .get('/:id', async ({ user, params }) => {
        if(!user){
            throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        const deposit = await prisma.deposit.findFirst({
          where: {
            id: params.id,
            userId: user.userId,
          },
        });
        
        if (!deposit) {
          throw new Error('Deposit not found');
        }
        
        return {
          success: true,
          data: {
            id: deposit.id,
            asset: deposit.asset,
            amount: Number(deposit.amount),
            txHash: deposit.txHash,
            memo: deposit.memo,
            fromAddress: deposit.fromAddress,
            toAddress: deposit.toAddress,
            status: deposit.status,
            blockTime: deposit.blockTime,
            confirmedAt: deposit.confirmedAt,
            createdAt: deposit.createdAt,
          },
        };
      });

