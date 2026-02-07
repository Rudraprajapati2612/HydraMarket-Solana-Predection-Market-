import Redis from "ioredis";
import { AppError } from "../types";

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('✅ Redis connected for rate limiting'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

export async function checkRateLimit(
  request: Request,
  max: number,
  window: number,
  server?: any // Optional Elysia server context
): Promise<void> {
  // Try to get IP from multiple sources
  let ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip');

  // Fallback to server context if available
  if (!ip && server?.requestIP) {
    ip = server.requestIP(request)?.address || 'localhost';
  }

  // Final fallback
  if (!ip) {
    ip = 'localhost';
  }

  const path = new URL(request.url).pathname;
  const key = `rateLimit:${ip}:${path}`;

  console.log('🔥 Rate limit check:', { ip, path, max, window, key });

  try {
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    console.log('📊 Current count:', count, '/ Max:', max);

    if (count >= max) {
      console.log('❌ RATE LIMIT EXCEEDED!');
      throw new AppError(
        'Too many requests, please try again later',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    await redis.incr(key);
    
    if (count === 0) {
      await redis.expire(key, window);
      console.log('⏰ Setting expiry:', window, 'seconds');
    }

    console.log('✅ Request allowed, new count:', count + 1);

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('❌ Redis error in rate limit:', error);
  }
}

process.on('SIGINT', async () => {
  console.log('Closing Redis connection...');
  await redis.quit();
  process.exit(0);
});