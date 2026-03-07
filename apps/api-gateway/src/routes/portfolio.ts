import {Elysia,t} from "elysia";
import { authPlugin } from "../plugins/auth";
import {prisma} from "db/client"
export const portfolioRoutes = new Elysia()
  .use(authPlugin())

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

      let pending = 0;
      if (outcome === 'YES')          pending = yes;
      else if (outcome === 'NO')      pending = no;
      else if (outcome === 'INVALID') pending = yes + no;

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