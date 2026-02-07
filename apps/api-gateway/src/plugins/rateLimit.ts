import Elysia from "elysia";
import Redis from "ioredis"

import { AppError } from "../types";
import { number } from "zod";

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

interface RateLimitConfig {
    max : number,
    window : number // in seconds 
}
export const rateLimitPlugins = new Elysia({name : 'rateLimit'})
       .derive(({request})=>{
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown';

        return{clientIp:ip};
       })

       .macro(({onBeforeHandle})=>({
            rateLimit(config:RateLimitConfig){
                onBeforeHandle(async({clientIp,path})=>{
                    const key = `rateLimit:${clientIp}:${path}`;

                    const current = await redis.get(key);
                    
                    const count = current ? parseInt(current):0
                    
                    if(count>=config.max){
                        throw new AppError(
                            'Too many request please try again later',
                            429,
                            'RATE_LIMIT_EXCEEDED'
                        );
                    }

                    const pipeline = redis.pipeline();
                    pipeline.incr(key);
                    if(!current){
                        pipeline.expire(key, config.window);
                    }
                    
                    await pipeline.exec();
                
                })
            }
       })

       );

       // Graceful shutdown
process.on('SIGINT', async () => {
    await redis.quit();
    process.exit(0);
  });