import {Elysia,t} from "elysia";
import { BalanceService } from "user-services/balance";
import Redis from "ioredis";
import { prisma } from "db/client"
import { PublicKey } from "@solana/web3.js";
import { authPlugin } from "../plugins/auth";
import { publicRoutes } from "./public";
import { AppError } from "../types";

const balanceService = new BalanceService();
const redis = new Redis();


export const withdrawalRoute = new Elysia({prefix:'/withdrawal'})
.use(authPlugin())
.post('/request',async({user,body})=>{
    if(!user){
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    try{
        new PublicKey(body.destinationAddress);
    }catch(e){
        throw new Error("Invalid solana address")
    }

    const MIN_WITHDRAWAL = 5;

    if(body.amount < MIN_WITHDRAWAL){
        throw new Error(`Min Withdrawal is ${MIN_WITHDRAWAL} USDC`);
    }

    await prisma.$transaction(async(tx)=>{
        // Get current balance 

        const ledger = await tx.ledger.findUnique({
            where :{
                userId_asset:{
                    userId : user.userId,
                    asset : body.asset || 'USDC'
                }
            }
        });

        if(!ledger || Number(ledger.available)<body.amount){
            throw new Error("Insufficient Balance");
        }

        // Update Reserve Fund 
        await tx.ledger.update({
            where: {
              userId_asset: {
                userId: user.userId,
                asset: body.asset || 'USDC',
              },
            },
            data: {
              available: { decrement: body.amount },
              reserved: { increment: body.amount },
            },
        });
        // Create Withdrawal record 

        const withdrawal = await tx.withdrawal.create({
            data :{
                userId : user.userId,
                asset : body.asset || 'USDC',
                amount : body.amount,
                destinationAddress : body.destinationAddress,
                status : 'PENDING',
                requestedAt : new Date(),
            }
        })

        await balanceService.invalidateCache(user.userId, body.asset || 'USDC');
        console.log(`💸 Withdrawal requested: ${user.userId} → ${body.amount} ${body.asset || 'USDC'}`);

        await redis.lpush('withdrawal:queue', JSON.stringify({
            withdrawalId: withdrawal.id,
            userId: user.userId,
            amount: body.amount,
            asset: body.asset || 'USDC',
            destinationAddress: body.destinationAddress,
        }));
    });


    return {
        success : true,
        message : "withdrawal requested sucessfully Processing typically"
    };
},{
    body : t.Object({
        amount : t.Number({minimum : 5}),
        destinationAddress : t.String(),
        asset : t.Optional(t.String())
    }),
})


.get('/',async({user,query})=>{
    if(!user){
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const withdrawal = await balanceService.getWithdrawalHistory(user?.userId,{
        status : query.status,
        limit : query.limit,
        offset : query.offset
    })

    return {
        success : true ,
        ...withdrawal
    };
},{
    query : t.Object({
        status : t.Optional(t.Union([
            t.Literal('PENDING'),
            t.Literal('PROCESSING'),
            t.Literal('CONFIRMED'),
            t.Literal('FAILED')
        ])),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
    })
})

 /**
   * GET /withdrawals/:id
   * Get specific withdrawal details
   */
 .get('/:id', async ({ user, params }) => {
    if(!user){
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
      },
    });
    
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }
    
    return {
      success: true,
      data: {
        id: withdrawal.id,
        asset: withdrawal.asset,
        amount: Number(withdrawal.amount),
        destinationAddress: withdrawal.destinationAddress,
        txHash: withdrawal.txHash,
        status: withdrawal.status,
        requestedAt: withdrawal.requestedAt,
        processedAt: withdrawal.processedAt,
        failureReason: withdrawal.failureReason,
      },
    };
  });