import { Elysia, t } from "elysia";
import { prisma } from "db/client";
import { authPlugin } from "../plugins/auth";
import { AppError } from "../types";

const DASHBOARD_RANGES = {
  "1H": 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
} as const;

type DashboardRange = keyof typeof DASHBOARD_RANGES;

type PositionWithMarket = {
  marketId: string;
  yesTokens: number;
  noTokens: number;
  avgYesPrice: number | null;
  avgNoPrice: number | null;
  isClaimed: boolean;
  market: {
    id: string;
    question: string;
    state: string;
    outcome: string | null;
    expiresAt: Date;
  };
};

const toNumber = (value: unknown) => Number(value ?? 0);

const getMarketMidPrices = async (marketIds: string[]) => {
  const uniqueMarketIds = [...new Set(marketIds)];

  if (uniqueMarketIds.length === 0) {
    return new Map<string, { yesMid: number | null; noMid: number | null }>();
  }

  const orders = await prisma.order.findMany({
    where: {
      marketId: { in: uniqueMarketIds },
      status: "OPEN",
    },
    select: {
      marketId: true,
      outcome: true,
      side: true,
      price: true,
    },
  });

  const book = new Map<
    string,
    {
      yesBestBid: number | null;
      yesBestAsk: number | null;
      noBestBid: number | null;
      noBestAsk: number | null;
    }
  >();

  for (const order of orders) {
    const current = book.get(order.marketId) ?? {
      yesBestBid: null,
      yesBestAsk: null,
      noBestBid: null,
      noBestAsk: null,
    };

    const price = toNumber(order.price);
    const isYes = order.outcome === "YES";
    const isBuy = order.side === "BUY";

    if (isYes && isBuy) {
      current.yesBestBid = current.yesBestBid === null ? price : Math.max(current.yesBestBid, price);
    } else if (isYes) {
      current.yesBestAsk = current.yesBestAsk === null ? price : Math.min(current.yesBestAsk, price);
    } else if (isBuy) {
      current.noBestBid = current.noBestBid === null ? price : Math.max(current.noBestBid, price);
    } else {
      current.noBestAsk = current.noBestAsk === null ? price : Math.min(current.noBestAsk, price);
    }

    book.set(order.marketId, current);
  }

  const midpoint = (bid: number | null, ask: number | null) => {
    if (bid !== null && ask !== null) return (bid + ask) / 2;
    if (bid !== null) return bid;
    if (ask !== null) return ask;
    return null;
  };

  return new Map(
    uniqueMarketIds.map((marketId) => {
      const entry = book.get(marketId);
      return [
        marketId,
        {
          yesMid: midpoint(entry?.yesBestBid ?? null, entry?.yesBestAsk ?? null),
          noMid: midpoint(entry?.noBestBid ?? null, entry?.noBestAsk ?? null),
        },
      ];
    }),
  );
};

const getPendingPayout = (position: PositionWithMarket) => {
  if (position.isClaimed || position.market.state !== "RESOLVED" || !position.market.outcome) {
    return 0;
  }

  if (position.market.outcome === "YES") return position.yesTokens;
  if (position.market.outcome === "NO") return position.noTokens;
  if (position.market.outcome === "INVALID") return position.yesTokens + position.noTokens;
  return 0;
};

const getStake = (position: PositionWithMarket) =>
  position.yesTokens * (position.avgYesPrice ?? 0) + position.noTokens * (position.avgNoPrice ?? 0);

const getCurrentValue = (
  position: PositionWithMarket,
  prices: Map<string, { yesMid: number | null; noMid: number | null }>,
) => {
  if (position.market.state === "RESOLVED") {
    return getPendingPayout(position) + (position.isClaimed ? 0 : 0);
  }

  const price = prices.get(position.marketId) ?? { yesMid: null, noMid: null };
  const yesPrice = price.yesMid ?? position.avgYesPrice ?? 0;
  const noPrice = price.noMid ?? position.avgNoPrice ?? 0;

  return position.yesTokens * yesPrice + position.noTokens * noPrice;
};

const getPositionLabel = (position: PositionWithMarket) => {
  if (position.yesTokens > 0 && position.noTokens > 0) return "HEDGED // YES+NO";
  if (position.yesTokens > 0) return "LONG // YES";
  if (position.noTokens > 0) return "LONG // NO";
  return "FLAT";
};

const getTradeStatus = (position: PositionWithMarket) => {
  if (position.market.state === "RESOLVED") {
    const payout = getPendingPayout(position);
    if (position.isClaimed) return "CLAIMED";
    if (payout > 0) return "WON";
    return "LOST";
  }

  if (position.market.state === "OPEN" || position.market.state === "PAUSED" || position.market.state === "RESOLVING") {
    return "OPEN";
  }

  return position.market.state;
};

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin())
  .guard({
    isAuthenticated: true,
  })

  .get("/summary", async ({ user }) => {
    if (!user) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const [ledgers, positions] = await Promise.all([
      prisma.ledger.findMany({
        where: { userId: user.userId },
        select: { asset: true, available: true, reserved: true },
      }),
      prisma.position.findMany({
        where: { userId: user.userId },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              state: true,
              outcome: true,
              expiresAt: true,
            },
          },
        },
      }),
    ]);

    const normalizedPositions: PositionWithMarket[] = positions.map((position) => ({
      marketId: position.marketId,
      yesTokens: toNumber(position.yesTokens),
      noTokens: toNumber(position.noTokens),
      avgYesPrice: position.avgYesPrice === null ? null : toNumber(position.avgYesPrice),
      avgNoPrice: position.avgNoPrice === null ? null : toNumber(position.avgNoPrice),
      isClaimed: position.isClaimed,
      market: position.market,
    }));

    const prices = await getMarketMidPrices(normalizedPositions.map((position) => position.marketId));

    const walletBalance = ledgers.reduce((sum, ledger) => {
      if (ledger.asset !== "USDC") return sum;
      return sum + toNumber(ledger.available) + toNumber(ledger.reserved);
    }, 0);

    const activePositions = normalizedPositions.filter(
      (position) =>
        position.market.state !== "RESOLVED" &&
        (position.yesTokens > 0 || position.noTokens > 0),
    ).length;

    const pendingPayouts = normalizedPositions.reduce(
      (sum, position) => sum + getPendingPayout(position),
      0,
    );

    const totalPnl = normalizedPositions.reduce((sum, position) => {
      const stake = getStake(position);
      const currentValue = getCurrentValue(position, prices);
      return sum + (currentValue - stake);
    }, 0);

    return {
      success: true,
      data: {
        walletBalance,
        activePositions,
        pendingPayouts,
        totalPnl,
        currency: "USDC",
      },
    };
  }, {
    detail: {
      summary: "Get dashboard summary",
      tags: ["Dashboard"],
    },
  })

  .get("/performance", async ({ user, query }) => {
    if (!user) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const range = query.range as DashboardRange;
    const now = Date.now();
    const rangeMs = DASHBOARD_RANGES[range];
    const startAt = new Date(now - rangeMs);

    const [changes, currentLedger] = await Promise.all([
      prisma.ledgerChange.findMany({
        where: {
          userId: user.userId,
          asset: "USDC",
          createdAt: { gte: startAt },
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          balanceAfter: true,
          balanceBefore: true,
          changeType: true,
        },
      }),
      prisma.ledger.findUnique({
        where: {
          userId_asset: {
            userId: user.userId,
            asset: "USDC",
          },
        },
        select: {
          available: true,
          reserved: true,
        },
      }),
    ]);

    const currentEquity = currentLedger
      ? toNumber(currentLedger.available) + toNumber(currentLedger.reserved)
      : 0;

    let baseline = currentEquity;
    if (changes.length > 0) {
      baseline = toNumber(changes[0]!.balanceBefore);
    }

    const points = [
      {
        timestamp: startAt.toISOString(),
        equity: baseline,
        pnl: 0,
      },
      ...changes.map((change) => {
        const equity = toNumber(change.balanceAfter);
        return {
          timestamp: change.createdAt.toISOString(),
          equity,
          pnl: equity - baseline,
          event: change.changeType,
        };
      }),
    ];

    const lastPoint = points[points.length - 1];
    if (!lastPoint || lastPoint.timestamp !== new Date(now).toISOString()) {
      points.push({
        timestamp: new Date(now).toISOString(),
        equity: currentEquity,
        pnl: currentEquity - baseline,
      });
    }

    return {
      success: true,
      data: {
        range,
        points,
        summary: {
          startEquity: baseline,
          endEquity: currentEquity,
          absoluteChange: currentEquity - baseline,
          percentChange: baseline === 0 ? 0 : ((currentEquity - baseline) / baseline) * 100,
        },
      },
    };
  }, {
    query: t.Object({
      range: t.Union([t.Literal("1H"), t.Literal("24H"), t.Literal("7D")], {
        default: "24H",
      }),
    }),
    detail: {
      summary: "Get dashboard performance series",
      tags: ["Dashboard"],
    },
  })

  .get("/active-trades", async ({ user }) => {
    if (!user) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const positions = await prisma.position.findMany({
      where: {
        userId: user.userId,
        OR: [
          { yesTokens: { gt: 0 } },
          { noTokens: { gt: 0 } },
        ],
      },
      include: {
        market: {
          select: {
            id: true,
            question: true,
            state: true,
            outcome: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const normalizedPositions: PositionWithMarket[] = positions.map((position) => ({
      marketId: position.marketId,
      yesTokens: toNumber(position.yesTokens),
      noTokens: toNumber(position.noTokens),
      avgYesPrice: position.avgYesPrice === null ? null : toNumber(position.avgYesPrice),
      avgNoPrice: position.avgNoPrice === null ? null : toNumber(position.avgNoPrice),
      isClaimed: position.isClaimed,
      market: position.market,
    }));

    const prices = await getMarketMidPrices(normalizedPositions.map((position) => position.marketId));

    const latestOrders = await prisma.order.findMany({
      where: {
        userId: user.userId,
        marketId: { in: normalizedPositions.map((position) => position.marketId) },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        marketId: true,
        outcome: true,
        updatedAt: true,
      },
    });

    const latestOrderByMarket = new Map<string, { outcome: string; updatedAt: Date }>();
    for (const order of latestOrders) {
      if (!latestOrderByMarket.has(order.marketId)) {
        latestOrderByMarket.set(order.marketId, {
          outcome: order.outcome,
          updatedAt: order.updatedAt,
        });
      }
    }

    const data = normalizedPositions.map((position) => {
      const stake = getStake(position);
      const currentValue = getCurrentValue(position, prices);
      const currentPnl = currentValue - stake;
      const latestOrder = latestOrderByMarket.get(position.marketId);

      return {
        marketId: position.marketId,
        assetId: latestOrder?.outcome
          ? `${latestOrder.outcome}_${position.marketId.slice(0, 6).toUpperCase()}`
          : `MKT_${position.marketId.slice(0, 6).toUpperCase()}`,
        question: position.market.question,
        stake,
        position: getPositionLabel(position),
        currentPnl,
        status: getTradeStatus(position),
        claimable: getPendingPayout(position),
        marketState: position.market.state,
        expiresAt: position.market.expiresAt,
        updatedAt: latestOrder?.updatedAt?.toISOString() ?? position.market.expiresAt.toISOString(),
      };
    });

    return {
      success: true,
      data,
    };
  }, {
    detail: {
      summary: "Get active trades for dashboard",
      tags: ["Dashboard"],
    },
  });
