import { Elysia, t } from 'elysia';
import { prisma } from 'db/client';
import { BalanceService } from 'user-services/balance';
import { authPlugin } from '../plugins/auth';
import { AppError } from '../types';
const balanceService = new BalanceService();

export const withdrawalRoutes = new Elysia({ prefix: '/withdrawals' })

  /**
   * POST /withdrawals
   * Request a withdrawal
   */

  .use(authPlugin())
  .post('/', async ({ user, body }) => {

    if(!user){
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    console.log(`💸 Withdrawal request from ${user.userId}`);

    // Validate input
    if (body.amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    // Validate destination address (basic Solana pubkey check)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.destinationAddress)) {
      return { success: false, error: 'Invalid Solana address' };
    }

    try {
      // Check balance
      const balance = await balanceService.getBalance(user.userId, body.asset);

      if (balance.available < body.amount) {
        return {
          success: false,
          error: 'Insufficient balance',
        };
      }

      // Create withdrawal request in database
      const withdrawal = await prisma.$transaction(async (tx) => {
        // Reserve the amount
        await tx.ledger.update({
          where: {
            userId_asset: {
              userId: user.userId,
              asset: body.asset,
            },
          },
          data: {
            available: {
              decrement: body.amount,
            },
            reserved: {
              increment: body.amount,
            },
          },
        });

        // Create withdrawal record
        return await tx.withdrawal.create({
          data: {
            userId: user.userId,
            asset: body.asset,
            amount: body.amount,
            destinationAddress: body.destinationAddress,
            status: 'PENDING',
          },
        });
      });

      console.log(`✅ Withdrawal created: ${withdrawal.id}`);

      return {
        success: true,
        data: {
          withdrawalId: withdrawal.id,
          asset: withdrawal.asset,
          amount: withdrawal.amount,
          destinationAddress: withdrawal.destinationAddress,
          status: withdrawal.status,
          requestedAt: withdrawal.requestedAt,
        },
      };
    } catch (error) {
      console.error('❌ Withdrawal creation failed:', error);
      return {
        success: false,
        error: 'Failed to create withdrawal',
      };
    }
  }, {
    body: t.Object({
      asset: t.String(),
      amount: t.Number(),
      destinationAddress: t.String(),
    }),
  })

  /**
   * GET /withdrawals
   * Get user's withdrawal history
   */
  .get('/', async ({ user }) => {

    if(!user){
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: user.userId,
      },
      orderBy: {
        requestedAt: 'desc',
      },
      take: 50,
    });

    return {
      success: true,
      data: withdrawals,
    };
  })

  /**
   * GET /withdrawals/:id
   * Get withdrawal details
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
      return { success: false, error: 'Withdrawal not found' };
    }

    return {
      success: true,
      data: withdrawal,
    };
  });