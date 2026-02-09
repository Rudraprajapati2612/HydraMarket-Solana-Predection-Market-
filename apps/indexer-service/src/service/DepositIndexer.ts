import "dotenv/config"
import { Connection, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { prisma } from "db/client"

import Redis  from  "ioredis"

import {isValidFormat,normalizeMemo} from "user-services/utils"


const USDC_DECIMALS = 6;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class DepositeIndexer {
    private  connection  : Connection;
    private  hotWallet : PublicKey;
    private usdcMint : PublicKey;
    private isRunning  = false;

    constructor(rpcUrl:string,hotWalletAddress:string,usdcMintAddress:string){
        this.connection = new Connection(rpcUrl,'confirmed');
        this.hotWallet = new PublicKey(hotWalletAddress);
        this.usdcMint = new PublicKey(usdcMintAddress);
    }

    async start(){
        console.log('🔍 Starting deposit indexer (MEMO-BASED)...');
        console.log(`   Monitoring hot wallet: ${this.hotWallet.toBase58()}`);
        console.log(`   USDC Mint: ${this.usdcMint.toBase58()}\n`);
        
        this.isRunning = true;
        
        this.connection.onLogs(
            this.hotWallet,
            async(logs,ctx) =>{ //unique identifier for transaction 
                console.log("New Transaction Is detected",logs.signature); //in this signature think it as a transaction hash
                await this.handleTransaction(logs.signature);
            },
            'confirmed'
        );

        console.log(' Deposit indexer running!\n');
    
    // Also poll for recent transactions
        this.pollForDeposits();
    }

    stop(){
        this.isRunning = false;
        console.log("Deposite Index Stop");
    }


    private async  handleTransaction(signature : string) {
        try{    
            const processed = await redis.get(`indexed:tx:${signature}`);
            if(processed){
                console.log(`Already Proceed ${signature}`);
                return;
            }

            // marke as processing 

            await redis.setex(`indexed:tx:${signature}`,86400,'processing');

            // Fetch Transaction 

            console.log("Fetching Transaction");
                // So we use the signature to fetch whole details  of the transaction
            const tx = await this.connection.getParsedTransaction(signature,{
                maxSupportedTransactionVersion : 0,
            });

            if(!tx||!tx.meta){
                console.log("Transaction Not Found");
                return;
                
            }
            // it checks does this transaction contain usdc Transfer to my hot wallet 
            const depositInfo = await this.parseUSDCTransfer(tx);

            if(!depositInfo){
                console.log("Not a Usdc Deposite");
                return;
            }
            console.log(`USDC deposite detected: ${depositInfo.amount} USDC`);

            // Extract memo

            const memo = this.extractMemo(tx);

            if(!memo){
                console.log(`⚠️  NO MEMO FOUND!`);
                console.log(`   Amount: ${depositInfo.amount} USDC`);
                console.log(`   From: ${depositInfo.fromAddress || 'Unknown'}`);
                await this.storeNoMemoDeposit(signature, depositInfo);
                console.log(`   ➡️  Stored in manual review queue\n`);
                return;
            }
            
            const normalizedMemo = normalizeMemo(memo);
            console.log(`📝 Memo: "${normalizedMemo}"`);


            if(!isValidFormat(normalizedMemo)){
                console.log(`⚠️  Invalid memo format: "${normalizedMemo}"`);
                await this.storeInvalidMemoDeposit(signature, depositInfo, normalizedMemo);
                console.log(`    Stored in manual review queue\n`);
                return;
            }

            const user = await prisma.user.findUnique({
                where :{
                    depositeMemo : normalizedMemo
                }
            });

            if (!user) {
                console.log(`⚠️  Unknown memo: "${normalizedMemo}"`);
                await this.storeUnknownMemoDeposit(signature, depositInfo, normalizedMemo);
                console.log(`   ➡️  Stored in manual review queue\n`);
                return;
            }

            console.log(`👤 User: ${user.username} (${user.id})`);
            await this.processDeposit(user.id, depositInfo, normalizedMemo, signature, tx);
            await redis.setex(`indexed:tx:${signature}`, 86400, 'completed');
      
            console.log(` Deposit credited to ${user.username}\n`);
        }catch(error){
            console.error(` Error:`, error);
            await redis.lpush('deposits:failed', JSON.stringify({
            signature,
            error: error instanceof Error ? error.message : 'Unknown',
            timestamp: Date.now(),
        }));
            console.log();
        }
    }
    // type of ParsedTransactionWithMeta is  arrays of instructions == instructions[]
    private extractMemo(tx:ParsedTransactionWithMeta):string | null{
        const instructions = tx.transaction.message.instructions;
        // and types of instruction = ParsedInstruction ->Human readable  and it contain {program:"memo-program",programId:Pubkey,parsed:string}
        //   | PartiallyDecodedInstruction;  = raw {programId : Pubkey, accounts : string[] data : string}
        for (const instruction of instructions){
            if('program' in instruction && instruction.program === 'spl-memo'){
                if('parsed' in instruction){
                    return instruction.parsed as string
                }
            }
            // direct check for memo program 
            if('programId' in instruction){
                const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
                if('data' in instruction && instruction.data === 'string'){
                    const decoded = Buffer.from(instruction.data, 'base64').toString('utf-8');
                    return decoded.trim();
                }
            }
        }
        return null
    }

    private parseUSDCTransfer(tx: ParsedTransactionWithMeta): {
        fromAddress: string | null;
        toAddress: string;
        amount: number;
      } | null {
        if (!tx.meta || tx.meta.err) return null;
        
        const instructions = tx.transaction.message.instructions;
        
        for (const instruction of instructions) {
          if ('parsed' in instruction && instruction.program === 'spl-token') {
            const parsed = instruction.parsed;
            
            if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
              const info = parsed.info;
              
              // Check USDC mint
              if (info.mint && info.mint !== this.usdcMint.toBase58()) {
                continue;
              }
              
              // Check destination is hot wallet
              if (info.destination !== this.hotWallet.toBase58()) {
                continue;
              }
              
              const rawAmount = parsed.type === 'transferChecked'
                ? info.tokenAmount.amount
                : info.amount;
              
              const amount = parseInt(rawAmount) / Math.pow(10, USDC_DECIMALS);
              
              return {
                fromAddress: info.source || null,
                toAddress: info.destination,
                amount,
              };
            }
          }
        }
        
        return null;
      }
  
      private async processDeposit(
        userId: string,
        depositInfo: any,
        memo: string,
        signature: string,
        tx: ParsedTransactionWithMeta
      ) {
        await prisma.$transaction(async (prisma) => {
          // Create deposit record
          await prisma.deposit.create({
            data: {
              userId,
              asset: 'USDC',
              amount: depositInfo.amount,
              txHash: signature,
              memo,
              fromAddress: depositInfo.fromAddress,
              toAddress: this.hotWallet.toBase58(),
              status: 'CONFIRMED',
              blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
              confirmedAt: new Date(),
            },
          });
          
          // Get current balance
          let ledger = await prisma.ledger.findUnique({
            where: { userId_asset: { userId, asset: 'USDC' } },
          });
          
          const balanceBefore = ledger ? Number(ledger.available) : 0;
          
          // Update ledger
          if (ledger) {
            ledger = await prisma.ledger.update({
              where: { userId_asset: { userId, asset: 'USDC' } },
              data: { available: { increment: depositInfo.amount } },
            });
          } else {
            ledger = await prisma.ledger.create({
              data: {
                userId,
                asset: 'USDC',
                available: depositInfo.amount,
                reserved: 0,
              },
            });
          }
          
          const balanceAfter = Number(ledger.available);
          
          console.log(`💾 Balance: ${balanceBefore} → ${balanceAfter} USDC`);
          
          // Audit log
          await prisma.ledgerChange.create({
            data: {
              userId,
              asset: 'USDC',
              changeType: 'DEPOSIT',
              amount: depositInfo.amount,
              balanceBefore,
              balanceAfter,
              referenceId: signature,
              referenceType: 'DEPOSIT',
              metadata: JSON.stringify({ memo }),
            },
          });
        });
        
        // Invalidate cache
        await redis.del(`balance:${userId}:USDC`);
      }

      private async storeNoMemoDeposit(signature: string, info: any) {
        await redis.lpush('deposits:no_memo', JSON.stringify({
          signature,
          ...info,
          timestamp: Date.now(),
        }));
      }

      private async storeInvalidMemoDeposit(signature: string, info: any, memo: string) {
        await redis.lpush('deposits:invalid_memo', JSON.stringify({
          signature,
          memo,
          ...info,
          timestamp: Date.now(),
        }));
      }

      private async storeUnknownMemoDeposit(signature: string, info: any, memo: string) {
        await redis.lpush('deposits:unknown_memo', JSON.stringify({
          signature,
          memo,
          ...info,
          timestamp: Date.now(),
        }));
      }

      private async pollForDeposits() {
        while (this.isRunning) {
          try {
            const signatures = await this.connection.getSignaturesForAddress(
              this.hotWallet,
              { limit: 10 }
            );
            
            for (const sig of signatures) {
              await this.handleTransaction(sig.signature);
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
          
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
}