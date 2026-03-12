import {Elysia,t} from "elysia";
import { authPlugin } from "../plugins/auth";
import {prisma} from "db/client"

const toNumber = (value: unknown) => Number(value ?? 0);

const getPendingPayout = (outcome: string | null, yesTokens: number, noTokens: number, isClaimed: boolean) => {
  if (isClaimed) return 0;
  if (outcome === "YES") return yesTokens;
  if (outcome === "NO") return noTokens;
  if (outcome === "INVALID") return yesTokens + noTokens;
  return 0;
};

export const portfolioRoutes = new Elysia()
  .use(authPlugin())

  .get('/portfolio/summary', async ({ user }) => {
    if (!user) throw new Error('Unauthorized');

    const [ledgers, positions, claimable] = await Promise.all([
      prisma.ledger.findMany({
        where: { userId: user.userId },
        select: {
          asset: true,
          available: true,
          reserved: true,
        },
      }),
      prisma.position.findMany({
        where: { userId: user.userId },
        include: {
          market: {
            select: {
              state: true,
              outcome: true,
            },
          },
        },
      }),
      prisma.position.findMany({
        where: {
          userId: user.userId,
          isClaimed: false,
          market: { state: 'RESOLVED' },
        },
        include: {
          market: {
            select: {
              outcome: true,
            },
          },
        },
      }),
    ]);

    const usdcLedger = ledgers.find((ledger) => ledger.asset === "USDC");
    const available = usdcLedger ? toNumber(usdcLedger.available) : 0;
    const reserved = usdcLedger ? toNumber(usdcLedger.reserved) : 0;
    const totalBalance = available + reserved;

    const claimablePayouts = claimable.reduce((sum, position) => {
      const yesTokens = toNumber(position.yesTokens);
      const noTokens = toNumber(position.noTokens);
      return sum + getPendingPayout(position.market.outcome, yesTokens, noTokens, position.isClaimed);
    }, 0);

    const claimableMarketsCount = claimable.filter((position) => {
      const yesTokens = toNumber(position.yesTokens);
      const noTokens = toNumber(position.noTokens);
      return getPendingPayout(position.market.outcome, yesTokens, noTokens, position.isClaimed) > 0;
    }).length;

    const totalPositions = positions.length;
    const activePositions = positions.filter((position) => position.market.state !== "RESOLVED").length;

    return {
      success: true,
      data: {
        totalBalance,
        available,
        reserved,
        claimablePayouts,
        claimableMarketsCount,
        allocation: {
          availablePercent: totalBalance === 0 ? 0 : (available / totalBalance) * 100,
          reservedPercent: totalBalance === 0 ? 0 : (reserved / totalBalance) * 100,
        },
        positions: {
          total: totalPositions,
          active: activePositions,
          resolved: totalPositions - activePositions,
        },
        currency: "USDC",
      },
    };
  })

  .get('/portfolio/activity', async ({ user, query }) => {
    if (!user) throw new Error('Unauthorized');

    const limit = Math.min(Number(query.limit ?? 20), 100);

    const [deposits, withdrawals, orders, claims] = await Promise.all([
      prisma.deposit.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          asset: true,
          amount: true,
          status: true,
          txHash: true,
          createdAt: true,
          confirmedAt: true,
        },
      }),
      prisma.withdrawal.findMany({
        where: { userId: user.userId },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          asset: true,
          amount: true,
          status: true,
          txHash: true,
          requestedAt: true,
          processedAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId: user.userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          market: {
            select: {
              question: true,
            },
          },
        },
      }),
      prisma.position.findMany({
        where: {
          userId: user.userId,
          isClaimed: true,
          claimedAt: { not: null },
        },
        orderBy: { claimedAt: 'desc' },
        take: limit,
        include: {
          market: {
            select: {
              question: true,
              outcome: true,
            },
          },
        },
      }),
    ]);

    const activity = [
      ...deposits.map((deposit) => ({
        id: deposit.id,
        type: "DEPOSIT",
        asset: deposit.asset,
        amount: toNumber(deposit.amount),
        status: deposit.status,
        timestamp: deposit.confirmedAt ?? deposit.createdAt,
        reference: deposit.txHash,
        title: `Deposit ${deposit.asset}`,
        description: `Deposit ${deposit.status.toLowerCase()}`,
      })),
      ...withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        type: "WITHDRAWAL",
        asset: withdrawal.asset,
        amount: toNumber(withdrawal.amount),
        status: withdrawal.status,
        timestamp: withdrawal.processedAt ?? withdrawal.requestedAt,
        reference: withdrawal.txHash,
        title: `Withdrawal ${withdrawal.asset}`,
        description: `Withdrawal ${withdrawal.status.toLowerCase()}`,
      })),
      ...orders.map((order) => ({
        id: order.id,
        type: "ORDER",
        asset: "USDC",
        amount: toNumber(order.amount),
        status: order.status,
        timestamp: order.updatedAt,
        reference: order.marketId,
        title: `${order.side} ${order.outcome}`,
        description: order.market.question,
      })),
      ...claims.map((claim) => ({
        id: claim.id,
        type: "CLAIM",
        asset: "USDC",
        amount: getPendingPayout(
          claim.market.outcome,
          toNumber(claim.yesTokens),
          toNumber(claim.noTokens),
          false,
        ),
        status: "CLAIMED",
        timestamp: claim.claimedAt!,
        reference: claim.claimTxHash,
        title: `Claim ${claim.market.outcome ?? "UNKNOWN"}`,
        description: claim.market.question,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return {
      success: true,
      data: activity,
    };
  }, {
    query: t.Object({
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    }),
  })

  .get('/portfolio', async ({ user, query }) => {
    if (!user) throw new Error('Unauthorized');

    const filter      = (query as any).filter ?? 'all';
    const whereClause: any = { userId: user.userId };

    if (filter === 'open')     whereClause.market     = { state: { in: ['OPEN', 'PAUSED', 'RESOLVING'] } };
    if (filter === 'resolved') whereClause.market     = { state: 'RESOLVED' };
    if (filter === 'claimed')  whereClause.isClaimed  = true;

    const positions = await prisma.position.findMany({
      where:   whereClause,
      include: { market: true },
      orderBy: { market: { createdAt: 'desc' } },
    });

    const data = positions.map(p => {
      const yes     = Number(p.yesTokens);
      const no      = Number(p.noTokens);
      const outcome = p.market.outcome;

      const pending = getPendingPayout(outcome, yes, no, p.isClaimed);

      return {
        marketId:       p.marketId,
        marketQuestion: p.market.question,
        marketState:    p.market.state,
        marketOutcome:  outcome,
        expireAt:       p.market.expiresAt,
        yesTokens:      yes,
        noTokens:       no,
        totalTokens:    yes + no,
        isClaimed:      p.isClaimed,
        claimedAt:      p.claimedAt,
        pendingPayout:  pending > 0 && !p.isClaimed ? pending : null,
        result:
          p.market.state !== 'RESOLVED' ? 'PENDING'
          : pending > 0                 ? 'WIN'
          : (yes + no) > 0              ? 'LOSS'
          : 'PUSH',
      };
    });

    return {
      success: true,
      data,
      summary: {
        totalPositions: data.length,
        openPositions:  data.filter(p => p.result === 'PENDING').length,
        wins:           data.filter(p => p.result === 'WIN').length,
        losses:         data.filter(p => p.result === 'LOSS').length,
        totalClaimable: data.reduce((sum, p) => sum + (p.pendingPayout ?? 0), 0),
      },
    };
  });
