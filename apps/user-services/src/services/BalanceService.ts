import "dotenv/config"
import {prisma} from "db/client"

import Redis  from "ioredis"
import { resolve } from "bun"

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export class BalanceService{
    async getBalance(userId : string,asset: string = 'USDC'){
        const cacheKey = `balance:${userId}:${asset}`
        const cached = await redis.get(cacheKey);

        if(cached){
            console.log("Balance From Cache",userId);
            return JSON.parse(cached)
        }

        let ledger = await prisma.ledger.findUnique({
            where: {
                userId_asset:{
                    userId,asset 
                }
            }
        })

        if(!ledger){
            ledger = await prisma.ledger.create({
                data:{
                    userId,
                    asset,
                    available : 0,
                    reserved : 0
                },
            });
        }
        
        const balance = {
            asset,
            available : Number(ledger.available),
            reserved : Number(ledger.reserved),
            total : Number(ledger.available)+Number(ledger.reserved),
            updatedAt : ledger.updatedAt
        }

        await redis.setex(cacheKey,30,JSON.stringify(balance));

        return balance;
    
    }

    async getAllBalances(userId:string){
        const ledger = await prisma.ledger.findMany({
            where:{
                userId
            }
        });

        return ledger.map(ledger=>({
            asset : ledger.asset,
            available : Number(ledger.available),
            reserved : Number(ledger.reserved),
            total : Number(ledger.available) + Number(ledger.reserved),
            updatedAt : ledger.updatedAt
        }));
    }

    async getBalanceHistory(userId : string,
        filters?:{
        asset?:string,
        changeType : string,
        limit ? : number,
        offset ?: number
    }){
        const limit = Math.min(filters?.limit || 50,100);

        const offset = filters?.offset || 0;

        const where : any ={userId};

        if(filters?.asset){
            where.asset = filters.asset;
        }

        if(filters?.changeType){
            where.changeType = filters.changeType
        }

        const [changes,total] = await Promise.all([
            prisma.ledgerChange.findMany({
                where,
                orderBy : {createdAt:'desc'},
                take : limit,skip:offset
            }),
            prisma.ledgerChange.count({where})
        ]);

        return {
            data : changes.map(changes=>({
                id : changes.id,
                asset : changes.asset,
                changesType : changes.changeType,
                amount : Number(changes.amount),
                balanceBefore : Number(changes.balanceBefore),
                balanceAfter : Number(changes.balanceAfter),
                referenceId : changes.referenceId,
                referenceType : changes.referenceType,
                metadata : changes.metadata ? JSON.parse(changes.metadata) : null,
                createdAt : changes.createdAt
            })),

            pagination:{
                total,
                limit,
                offset,
                hasMore : offset + limit < total
            },
        };
    }

    async getDepositInstructions(userId: string) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { depositeMemo: true },
        });
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const hotWalletAddress = process.env.HOT_WALLET_ADDRESS;
        
        return {
          depositAddress: hotWalletAddress,
          depositMemo: user.depositeMemo,
          asset: 'USDC',
          network: 'Solana',
          instructions: [
            '1. Open your Solana wallet (Phantom, Solflare, etc.)',
            '2. Send USDC to the deposit address below',
            `3. CRITICAL: Include this memo in your transaction: ${user.depositeMemo}`,
            '4. Wait for blockchain confirmation (usually < 1 minute)',
            '5. Your balance will update automatically',
          ],
          warnings: [
            '⚠️ Deposits without the memo will be delayed and require manual processing',
            '⚠️ Only send USDC on Solana network',
            '⚠️ Minimum deposit: 1 USDC',
          ],
        };
      }
      
    async getDepositeHistory(userId : string,
        filters?:{
            status : string,
            limit?: number,
            offset? : number
        }
    ){
        const limit = Math.min(filters?.limit||50,100);
        const offset = filters?.offset || 0 ;

        const where : any = {userId}
        if(filters?.status){
            where.status = filters.status
        }

        const [deposits,total] = await Promise.all([
            prisma.deposit.findMany({
                where,
                orderBy : {createdAt:'desc'},
                take : limit,
                skip : offset
            }),
            prisma.deposit.count({where})
        ]);

        return {
            data : deposits.map(deposits=>({
                id : deposits.id,
                asset : deposits.asset,
                amount : deposits.amount,
                txHash : deposits.txHash,
                memo : deposits.memo,
                fromAddress : deposits.fromAddress,
                toAddress : deposits.toAddress,
                status : deposits.status,
                blockTime : deposits.blockTime,
                confirmedAt : deposits.confirmedAt,
                createdAt : deposits.createdAt,
            })),
            pagination :{
                total,
                limit,
                offset,
                hasMore : offset + limit < total
            }
        }
    }

    async getWithdrawalHistory(
        userId: string,
        filters?: {
          status?: string;
          limit?: number;
          offset?: number;
        }
    ){
        const limit = Math.min(filters?.limit || 50, 100);
        const offset = filters?.offset || 0;
        
        const where: any = { userId };
        
        if (filters?.status) {
          where.status = filters.status;
        }

        const [withdrawals, total] = await Promise.all([
            prisma.withdrawal.findMany({
              where,
              orderBy: { requestedAt: 'desc' },
              take: limit,
              skip: offset,
            }),
            prisma.withdrawal.count({ where }),
          ]);
          
          return {
            data: withdrawals.map(withdrawal => ({
              id: withdrawal.id,
              asset: withdrawal.asset,
              amount: Number(withdrawal.amount),
              destinationAddress: withdrawal.destinationAddress,
              txHash: withdrawal.txHash,
              status: withdrawal.status,
              requestedAt: withdrawal.requestedAt,
              processedAt: withdrawal.processedAt,
              failureReason: withdrawal.failureReason,
            })),
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + limit < total,
            },
          };
    }

    async hasSufficientBalance(userId:string,asset:string,amount : number):Promise<boolean>{
        const balance = await this.getBalance(userId,asset);
        return balance.available >= amount
    }

    async invalidateCache(userId : string,asset?:string){
        if(asset){
            await redis.del(`balance:${userId}:${asset}`);
        }else{
            const key = await redis.keys(`balance:${userId}:*`);
            if(key.length>0){
                await redis.del(...key);
            }
        }
    }
}