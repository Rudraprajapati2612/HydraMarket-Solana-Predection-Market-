import {Elysia,t} from "elysia";
import {prisma} from "db/client"

import { AppError } from "../types";
import { authPlugin } from "../plugins/auth";
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS;
export const balanceRoute = new Elysia()
        .use(authPlugin())
        .get('/user-instruction',async ({user})=>{
            if(!user){
                throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
            }

            const userData = await prisma.user.findUnique({
                where : {id : user.userId}
            });


            if (!userData) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }
            return {
                success : true,
                data:{
                    depositAddress: HOT_WALLET_ADDRESS,
                    depositMemo: userData.depositeMemo,
                    instructions: [
                      '1. Open your Phantom or Solflare wallet',
                      '2. Send USDC to the deposit address',
                      `3. CRITICAL: Include memo: ${userData.depositeMemo}`,
                      '4. Wait for blockchain confirmation',
                      '5. Balance updates automatically',
                    ],
                    warning: '⚠️ Deposits without memo will be delayed and require manual verification!',
                }
            }
        },{
            isAuthenticated: true,
            detail: {
              summary: 'Get deposit instructions',
              tags: ['Balance'],
            },
        })

        .get('/balance',async({user})=>{
            if(!user){
                throw new AppError('Unauthorized',401,'UNAUTHORIZED')
            }

            const balance  = await prisma.ledger.findMany({
                where : {userId : user.userId}
            });

            return {
                success : true,
                data  : balance.map(b=>({
                    asset : b.asset,
                    available : Number(b.available),
                    reserved: Number(b.reserved),
                    total: Number(b.available) + Number(b.reserved),
                }))
            };
        },
        {
            isAuthenticated : true,
            detail : {
                summary : 'Get User balance',
                tags : ['Balance']
            }
        },
    )

    .get('/deposits',async({user,query})=>{
        if(!user){
            throw new AppError('Unauthorized',401,'UNAUTHORIZED');
        }

        const limit = Math.min(query.limit || 50,100);
        const offset = query.offset || 0;

        const deposite = await prisma.deposit.findMany({
            where:{
                userId : user.userId
            },
            orderBy:{createdAt : 'desc'},
            take : limit,
            skip : offset,
        });

        const total = await prisma.deposit.count({
            where :{userId : user.userId},
        })

        return{
            success : true,
            data: deposite.map(d=>({
                id : d.id,
                asset : d.asset,
                amount : Number(d.amount),
                txHash : d.txHash,
                memo : d.memo,
                status:d.status,
                createdAt : d.createdAt.toISOString(),
                confirmedAt : d.confirmedAt?.toISOString()
            })),
            pagination:{total, limit ,offset}
        }

        
    },
    {
        isAuthenticated : true,
        query : t.Object({
            limit : t.Optional(t.Number({minimum : 1 , maximum :100})),
            offset : t.Optional(t.Number({minimum :0}))
        }),
        detail :{
            summary : 'Get Deposite History',
            tags :['Balance']
        }
    }
)