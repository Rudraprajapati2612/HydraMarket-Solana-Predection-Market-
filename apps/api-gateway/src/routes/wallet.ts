// apps/api-gateway/src/routes/wallet.ts
// 
// Register this in your main app:
//   import { walletRoutes } from './routes/wallet';
//   app.use(walletRoutes);

import { Elysia, t } from 'elysia';
import { prisma } from 'db/client';
import { authPlugin } from '../plugins/auth';
import { PublicKey } from '@solana/web3.js';

export const walletRoutes = new Elysia()
  .use(authPlugin())

  // POST /users/wallet
  // Saves the user's Solana wallet address to DB
  // Called from frontend whenever Phantom connects
  .post('/users/wallet',
    async ({ user, body }) => {
      if (!user) throw new Error('Unauthorized');

      // Validate it's a real Solana pubkey before saving
      try {
        new PublicKey(body.walletAddress);
      } catch {
        return { success: false, error: 'Invalid Solana wallet address' };
      }

      await prisma.user.update({
        where: { id: user.userId },
        data:  { walletAddress: body.walletAddress },
      });

      console.log(`✅ Wallet linked: user=${user.userId} wallet=${body.walletAddress}`);
      return { success: true, data: { walletAddress: body.walletAddress } };
    },
    {
      body: t.Object({
        walletAddress: t.String(),
      }),
    },
  )

  // GET /users/wallet
  // Check if user has a wallet linked (useful for debugging)
  .get('/users/wallet', async ({ user }) => {
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
      where:  { id: user.userId },
      select: { walletAddress: true },
    });

    return {
      success: true,
      data: {
        walletAddress: dbUser?.walletAddress ?? null,
        linked: !!dbUser?.walletAddress,
      },
    };
  });