import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../lib/api";
import { cn } from "../lib/utils";
import { usePythPrice } from "../hooks/usePythPrice";

interface MarketDetails {
  id: string;
  question: string;
  description: string;
  category: string;
  state: string;
  expiresAt: string;
  outcome?: string | null;
}

interface PriceData {
  yes: {
    bestBid: number | null;
    bestAsk: number | null;
    midPrice: number | null;
    spread: number | null;
  };
  no: {
    bestBid: number | null;
    bestAsk: number | null;
    midPrice: number | null;
    spread: number | null;
  };
  impliedProbabilityYes: number | null;
}

interface StatsData {
  participants: number;
  totalVolume: number;
  openOrders: number;
}

interface OrderbookLevel {
  price: string;
  quantity: string;
}

interface OrdersResponse {
  id: string;
  outcome: "YES" | "NO";
  side: "BUY" | "SELL";
  price: number | string;
  quantity: number | string;
  filledQuantity: number | string;
  status: string;
  market?: {
    question: string;
  };
}

interface TradeRow {
  id: string;
  role?: "BUY" | "SELL";
  outcome: "YES" | "NO";
  quantity: number;
  price: number;
  total?: number;
  timestamp: string;
  marketQuestion?: string;
}

interface PositionData {
  yesTokens: number;
  noTokens: number;
  avgYesPrice: number | null;
  avgNoPrice: number | null;
  marketState?: string;
  marketOutcome?: string | null;
  isClaimed?: boolean;
  pendingPayout?: number | null;
}

interface BalanceRow {
  asset: string;
  available: number | string;
  reserved?: number | string;
}

const toNumber = (value: unknown) => Number(value || 0);

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const extractThresholdFromQuestion = (question: string) => {
  const match = question.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)(k)?/i);
  if (!match) return null;

  const value = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) return null;

  return match[2] ? value * 1000 : value;
};

const TradingTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [tradeSide, setTradeSide] = useState<"yes" | "no">("yes");
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [activeBottomTab, setActiveBottomTab] = useState<"orders" | "history" | "summary">("orders");
  const [chartMode, setChartMode] = useState<"token" | "btc">("token");
  const [orderBookSide, setOrderBookSide] = useState<"yes" | "no">("yes");
  const [marketAmount, setMarketAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [limitQuantity, setLimitQuantity] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<MarketDetails | null>(null);
  const [price, setPrice] = useState<PriceData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [yesOrderbook, setYesOrderbook] = useState<{ bids: OrderbookLevel[]; asks: OrderbookLevel[] }>({ bids: [], asks: [] });
  const [noOrderbook, setNoOrderbook] = useState<{ bids: OrderbookLevel[]; asks: OrderbookLevel[] }>({ bids: [], asks: [] });
  const [orders, setOrders] = useState<OrdersResponse[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRow[]>([]);
  const [chartTrades, setChartTrades] = useState<TradeRow[]>([]);
  const [position, setPosition] = useState<PositionData | null>(null);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const { current: btcPrice, isConnected, priceHistory } = usePythPrice();

  const loadTradingData = async (showLoader = false) => {
    if (!id) return;
    if (showLoader) setLoading(true);
    setError("");

    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

      const requests = [
        fetch(`${API_BASE_URL}/markets/${id}`),
        fetch(`${API_BASE_URL}/markets/${id}/price`),
        fetch(`${API_BASE_URL}/markets/${id}/stats`),
        fetch(`${API_BASE_URL}/markets/${id}/trades?limit=40`),
        fetch(`${API_BASE_URL}/orders/orderbook/${id}/YES`),
        fetch(`${API_BASE_URL}/orders/orderbook/${id}/NO`),
      ] as const;

      const authenticatedRequests = token
        ? [
            fetch(`${API_BASE_URL}/orders?marketId=${id}`, { headers: authHeaders }),
            fetch(`${API_BASE_URL}/markets/${id}/positions`, { headers: authHeaders }),
            fetch(`${API_BASE_URL}/balance`, { headers: authHeaders }),
          ]
        : [];

      const responses = await Promise.all([...requests, ...authenticatedRequests]);
      const payloads = await Promise.all(responses.map((response) => response.json()));

      const [
        marketPayload,
        pricePayload,
        statsPayload,
        tradesPayload,
        yesOrderbookPayload,
        noOrderbookPayload,
        ordersPayload,
        positionPayload,
        balancePayload,
      ] = payloads;

      if (!marketPayload?.success) throw new Error(marketPayload?.error || "Failed to load market");

      setMarket(marketPayload.data);
      setPrice(pricePayload?.success ? pricePayload.data : null);
      setStats(statsPayload?.success ? statsPayload.data : null);
      setChartTrades(tradesPayload?.success ? tradesPayload.data : []);
      setYesOrderbook(yesOrderbookPayload?.success ? yesOrderbookPayload.data : { bids: [], asks: [] });
      setNoOrderbook(noOrderbookPayload?.success ? noOrderbookPayload.data : { bids: [], asks: [] });
      setTradeHistory(
        tradesPayload?.success
          ? tradesPayload.data.map((trade: any) => ({
              id: trade.id,
              role: trade.side,
              outcome: trade.outcome,
              quantity: trade.amount,
              price: trade.price,
              total: Number(trade.amount) * Number(trade.price),
              timestamp: trade.timestamp,
            }))
          : []
      );

      if (token) {
        setOrders(ordersPayload?.success ? ordersPayload.data : []);
        setPosition(positionPayload?.success ? positionPayload.data : null);

        const usdcLedger = (balancePayload?.data as BalanceRow[] | undefined)?.find((entry) => entry.asset === "USDC");
        setBalance(usdcLedger ? toNumber(usdcLedger.available) + toNumber(usdcLedger.reserved) : 0);
      } else {
        setOrders([]);
        setPosition(null);
        setBalance(0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load trading data");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin-theme");
    const isDark = (saved as "light" | "dark" | null) !== "light";
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.classList.toggle("light", !isDarkMode);
    localStorage.setItem("admin-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    loadTradingData(true);
    const intervalId = window.setInterval(() => loadTradingData(false), 5000);
    return () => window.clearInterval(intervalId);
  }, [id, token]);

  useEffect(() => {
    const defaultPrice = price?.yes?.midPrice ?? price?.yes?.bestAsk ?? price?.yes?.bestBid;
    if (defaultPrice !== null && defaultPrice !== undefined) {
      setLimitPrice((defaultPrice * 100).toFixed(2));
    } else {
      setLimitPrice("50.00");
    }
  }, [price?.yes?.bestAsk, price?.yes?.bestBid, price?.yes?.midPrice]);

  const livePrice = useMemo(() => {
    if (!price) return 50;
    const yesMid = price.yes.midPrice ?? price.yes.bestBid ?? price.yes.bestAsk;
    return Number(((yesMid ?? 0.5) * 100).toFixed(2));
  }, [price]);

  const marketThreshold = useMemo(
    () => (market ? extractThresholdFromQuestion(market.question) : null),
    [market]
  );

  const selectedSidePrice = tradeSide === "yes" ? livePrice : 100 - livePrice;
  const isMarketOpen = market?.state === "OPEN";
  const visibleOrders = useMemo(
    () => orders.filter((order) => ["OPEN", "PARTIAL", "MATCHED", "PENDING"].includes(order.status)),
    [orders]
  );

  const activeOrderbook = orderBookSide === "yes" ? yesOrderbook : noOrderbook;
  const orderBookData = useMemo(() => {
    let askCumulative = 0;
    const asks = activeOrderbook.asks.map((entry) => {
      const size = Math.round(toNumber(entry.quantity));
      askCumulative += size;
      return { p: (toNumber(entry.price) * 100).toFixed(1), s: size, t: askCumulative };
    });

    let bidCumulative = 0;
    const bids = activeOrderbook.bids.map((entry) => {
      const size = Math.round(toNumber(entry.quantity));
      bidCumulative += size;
      return { p: (toNumber(entry.price) * 100).toFixed(1), s: size, t: bidCumulative };
    });

    return {
      asks,
      bids,
      maxCumulative: Math.max(askCumulative, bidCumulative, 1),
    };
  }, [activeOrderbook]);

  const chartData = useMemo(() => {
    return [...chartTrades]
      .reverse()
      .map((trade) => ({
        timestamp: trade.timestamp,
        price: toNumber(trade.price) * 100,
      }));
  }, [chartTrades]);

  const btcChartData = useMemo(
    () => priceHistory.map((point) => ({ timestamp: point.timestamp, price: point.price })),
    [priceHistory]
  );

  const totalCost = useMemo(() => {
    if (orderType === "market") {
      return toNumber(marketAmount);
    }
    return (toNumber(limitPrice) / 100) * toNumber(limitQuantity);
  }, [limitPrice, limitQuantity, marketAmount, orderType]);

  const estimatedShares = useMemo(() => {
    if (orderType === "market") {
      return selectedSidePrice > 0 ? toNumber(marketAmount) / (selectedSidePrice / 100) : 0;
    }
    return toNumber(limitQuantity);
  }, [marketAmount, limitQuantity, orderType, selectedSidePrice]);

  const positionSummary = useMemo(() => {
    if (!position) return null;
    const shares = tradeSide === "yes" ? position.yesTokens : position.noTokens;
    const avgEntry = tradeSide === "yes" ? position.avgYesPrice : position.avgNoPrice;
    const currentPrice = tradeSide === "yes" ? livePrice / 100 : (100 - livePrice) / 100;
    const unrealizedPnL = avgEntry !== null ? (currentPrice - avgEntry) * shares : 0;
    return {
      shares,
      avgEntryPrice: avgEntry !== null ? avgEntry * 100 : null,
      unrealizedPnL,
    };
  }, [position, tradeSide, livePrice]);

  const handleClaimPayout = async () => {
    if (!id || !token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/payouts/claim/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "Claim failed");
      }
      toast.success(`Claimed ${formatUsd(Number(data.data?.payout ?? 0))}`);
      loadTradingData(false);
    } catch (err: any) {
      toast.error(err.message || "Claim failed");
    }
  };

  const handlePlaceOrder = async () => {
    if (!id || !token) {
      navigate("/login");
      return;
    }

    if (!isMarketOpen) {
      toast.error("Trading is closed for this market");
      return;
    }

    const computedPrice = orderType === "market" ? selectedSidePrice / 100 : toNumber(limitPrice) / 100;
    const computedAmount = orderType === "market" ? toNumber(marketAmount) : (toNumber(limitPrice) / 100) * toNumber(limitQuantity);

    if (!computedPrice || computedPrice <= 0 || computedPrice >= 1) {
      toast.error("Invalid price");
      return;
    }

    if (!computedAmount || computedAmount <= 0) {
      toast.error("Invalid order amount");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          marketId: id,
          side: tradeAction.toUpperCase(),
          outcome: tradeSide.toUpperCase(),
          amount: Number(computedAmount.toFixed(6)),
          price: Number(computedPrice.toFixed(4)),
          orderType: orderType.toUpperCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "Order placement failed");
      }

      toast.success("Order submitted");
      setMarketAmount("");
      setLimitQuantity("");
      loadTradingData(false);
    } catch (err: any) {
      toast.error(err.message || "Order placement failed");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "Cancel failed");
      }
      toast.success("Order cancelled");
      loadTradingData(false);
    } catch (err: any) {
      toast.error(err.message || "Cancel failed");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono">LOADING_MARKET...</div>;
  }

  if (!market) {
    return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono">{error || "MARKET_NOT_FOUND"}</div>;
  }

  return (
    <div className={cn("min-h-screen font-sans selection:bg-cyan-500/30 overflow-x-hidden flex flex-col transition-colors duration-300", isDarkMode ? "bg-[#050505] text-white" : "bg-light-bg text-slate-900")}>
      <div className={cn("h-8 border-b flex items-center justify-between px-4 text-[10px] font-mono tracking-widest uppercase shrink-0 transition-colors", isDarkMode ? "border-white/5 bg-black/60 text-white/40" : "border-border-gray bg-slate-100 text-slate-500")}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>SYSTEM_STATUS // NOMINAL</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span>MARKET_ID: {market.id.slice(0, 8)}</span>
          <span className="text-cyan-400 font-bold">{market.category.toUpperCase()}</span>
        </div>
      </div>

      <div className={cn("h-10 border-b flex items-center justify-between px-4 text-[10px] font-mono shrink-0 transition-colors", isDarkMode ? "border-white/5 bg-black/40" : "border-border-gray bg-slate-50")}>
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 text-cyan-400 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
            <span>LIVE ORDERBOOK FEED</span>
          </div>
          <div className={cn("h-4 w-[1px] shrink-0", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
          <div className="flex items-center gap-2 shrink-0">
            <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>YES MID:</span>
            <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{livePrice.toFixed(1)}¢</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>VOL:</span>
            <span className="font-bold text-cyan-400">{formatUsd(toNumber(stats?.totalVolume))}</span>
          </div>
          {btcPrice ? (
            <>
              <div className={cn("h-4 w-[1px] shrink-0", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>BTC/USD:</span>
                <span className="font-bold text-amber-400">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(btcPrice)}
                </span>
              </div>
            </>
          ) : null}
        </div>
        <button onClick={() => navigate("/portfolio")} className="hidden sm:flex items-center gap-2 group cursor-pointer">
          <span className={cn("uppercase transition-colors", isDarkMode ? "text-white/40 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-700")}>Balance:</span>
          <span className="text-cyan-400 font-bold">${balance.toFixed(2)}</span>
        </button>
      </div>

      <div className={cn("p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-4 shrink-0 transition-colors", isDarkMode ? "border-white/5" : "border-border-gray")}>
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={() => navigate("/markets-terminal")} className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-white/5 text-white/60 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900")}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight mb-1 sm:mb-2 line-clamp-2">{market.question}</h1>
            <p className={cn("text-sm max-w-3xl", isDarkMode ? "text-white/50" : "text-slate-500")}>{market.description}</p>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest mt-3">
              <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Traders: {toNumber(stats?.participants)}</span>
              <span className="text-cyan-400">Open Orders: {toNumber(stats?.openOrders)}</span>
              <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold", market.state === "OPEN" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500" : "bg-slate-500/10 border border-slate-500/20 text-slate-400")}>
                {market.state}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsDarkMode((prev) => !prev)} className={cn("w-9 h-9 sm:w-10 sm:h-10 border flex items-center justify-center rounded-lg transition-all", isDarkMode ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" : "bg-slate-100 border-border-gray text-slate-500 hover:text-slate-900 hover:bg-slate-200")}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className={cn("border-b py-2 px-4 text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-200")}>
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-px bg-white/5 overflow-y-auto md:overflow-hidden">
        <div className={cn("md:col-span-3 flex flex-col transition-all duration-300", isDarkMode ? "bg-[#050505] border-white/5" : "bg-white border-border-gray")}>
          <div className={cn("flex items-center justify-between px-4 border-b shrink-0", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <div className="flex p-0.5 rounded border transition-colors">
              <button onClick={() => setOrderBookSide("yes")} className={cn("px-3 py-2 text-[10px] font-bold rounded transition-colors", orderBookSide === "yes" ? "bg-cyan-500/20 text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>YES</button>
              <button onClick={() => setOrderBookSide("no")} className={cn("px-3 py-2 text-[10px] font-bold rounded transition-colors", orderBookSide === "no" ? "bg-rose-500/20 text-rose-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>NO</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className={cn("grid grid-cols-3 text-[9px] font-mono uppercase mb-2 pb-1 border-b", isDarkMode ? "text-white/20 border-white/5" : "text-slate-400 border-slate-200")}>
              <span>Price(¢)</span>
              <span className="text-center">Size</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {orderBookData.asks.map((row, index) => (
                <div key={`ask-${index}`} className={cn("grid grid-cols-3 py-1 relative", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                  <div className="absolute inset-y-0 right-0 bg-rose-500/10" style={{ width: `${(row.t / orderBookData.maxCumulative) * 100}%` }} />
                  <span className="text-rose-500 relative z-10">{row.p}</span>
                  <span className={cn("text-center relative z-10", isDarkMode ? "text-white/60" : "text-slate-600")}>{row.s.toLocaleString()}</span>
                  <span className={cn("text-right relative z-10", isDarkMode ? "text-white/40" : "text-slate-400")}>{row.t.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {orderBookData.asks.length === 0 && orderBookData.bids.length === 0 ? (
              <div className={cn("py-8 text-center text-[9px] font-mono uppercase tracking-widest whitespace-pre-line", isDarkMode ? "text-white/20" : "text-slate-400")}>
                {market.state === "RESOLVED" ? "> MARKET_CLOSED\n  NO_ACTIVE_ORDERS" : "> AWAITING_ORDERS"}
              </div>
            ) : null}

            <div className={cn("my-4 py-3 px-4 border-y flex items-center justify-between rounded", isDarkMode ? "border-white/5 bg-[#1a1a2e]/40" : "border-border-gray bg-slate-100")}>
              <div className="text-2xl font-bold tracking-tighter text-cyan-400">{selectedSidePrice.toFixed(1)}¢</div>
              <div className="text-right text-[10px] font-mono">
                <div className={isDarkMode ? "text-white/20" : "text-slate-400"}>Spread</div>
                <div>{(((orderBookSide === "yes" ? price?.yes?.spread : price?.no?.spread) ?? 0) * 100).toFixed(2)}¢</div>
              </div>
            </div>

            <div className="space-y-1 font-mono text-xs">
              {orderBookData.bids.map((row, index) => (
                <div key={`bid-${index}`} className={cn("grid grid-cols-3 py-1 relative", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                  <div className="absolute inset-y-0 left-0 bg-emerald-500/10" style={{ width: `${(row.t / orderBookData.maxCumulative) * 100}%` }} />
                  <span className="text-emerald-500 relative z-10">{row.p}</span>
                  <span className={cn("text-center relative z-10", isDarkMode ? "text-white/60" : "text-slate-600")}>{row.s.toLocaleString()}</span>
                  <span className={cn("text-right relative z-10", isDarkMode ? "text-white/40" : "text-slate-400")}>{row.t.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("md:col-span-6 flex flex-col min-h-[300px] md:min-h-0 transition-colors", isDarkMode ? "bg-[#050505] border-x border-white/5" : "bg-white border-x border-border-gray")}>
          <div className={cn("px-4 border-b flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <button onClick={() => setChartMode("token")} className={cn("py-3", chartMode === "token" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>
              Price_History
            </button>
            <button onClick={() => setChartMode("btc")} className={cn("py-3", chartMode === "btc" ? "text-amber-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>
              BTC/USD_LIVE
            </button>
          </div>
          <div className="flex-1 relative p-4 sm:p-8 overflow-hidden">
            {chartMode === "token" && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} tick={{ fill: isDarkMode ? "#475569" : "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `${value.toFixed(0)}¢`} tick={{ fill: isDarkMode ? "#475569" : "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" width={50} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}¢`, "Price"]}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{
                      background: isDarkMode ? "#0f0f1a" : "#ffffff",
                      border: isDarkMode ? "1px solid #1e1e2e" : "1px solid #e2e8f0",
                      borderRadius: "4px",
                    }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#00d4ff" fill="rgba(0,212,255,0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : chartMode === "btc" && btcChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={btcChartData}>
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} tick={{ fill: isDarkMode ? "#475569" : "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`} tick={{ fill: isDarkMode ? "#475569" : "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" width={84} />
                  <Tooltip
                    formatter={(value: number) => [new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value), "BTC/USD"]}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{
                      background: isDarkMode ? "#0f0f1a" : "#ffffff",
                      border: isDarkMode ? "1px solid #1e1e2e" : "1px solid #e2e8f0",
                      borderRadius: "4px",
                    }}
                  />
                  {marketThreshold ? <ReferenceLine y={marketThreshold} stroke="#f59e0b" strokeDasharray="4 4" /> : null}
                  <Area type="monotone" dataKey="price" stroke="#f59e0b" fill="rgba(245,158,11,0.16)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={cn("h-full flex items-center justify-center text-[10px] font-mono uppercase tracking-widest", chartMode === "btc" ? "text-amber-400" : "text-cyan-400")}>
                {chartMode === "btc" ? "NO_BTC_PRICE_FEED" : "NO_TRADE_HISTORY_YET"}
              </div>
            )}
          </div>
        </div>

        <div className={cn("md:col-span-3 p-4 sm:p-6 flex flex-col gap-6 border-t md:border-t-0 transition-colors", isDarkMode ? "bg-[#050505] border-white/5" : "bg-white border-border-gray")}>
          {!isMarketOpen ? (
            <div className={cn("border rounded-lg p-4 text-center", isDarkMode ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50")}>
              <div className="text-amber-400 text-[10px] font-mono uppercase tracking-widest font-bold">
                {market.state === "RESOLVED" ? "MARKET_RESOLVED" : "TRADING_CLOSED"}
              </div>
              <div className={cn("text-[9px] font-mono mt-1 uppercase", isDarkMode ? "text-white/40" : "text-slate-500")}>
                Trading closed - outcome: {market.outcome ?? "PENDING"}
              </div>
              {position?.pendingPayout && position.pendingPayout > 0 ? (
                <button onClick={handleClaimPayout} className="mt-3 w-full py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-lg">
                  Claim {formatUsd(position.pendingPayout)}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className={cn(!isMarketOpen && "opacity-30 pointer-events-none")}>
          <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-xl border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
            <button onClick={() => setTradeAction("buy")} className={cn("py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", tradeAction === "buy" ? "bg-[#141420] border-b-2 border-cyan-400 text-white shadow-lg" : "bg-transparent text-[#475569]")}>Buy</button>
            <button onClick={() => setTradeAction("sell")} className={cn("py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", tradeAction === "sell" ? "bg-[#141420] border-b-2 border-rose-400 text-white shadow-lg" : "bg-transparent text-[#475569]")}>Sell</button>
          </div>

          <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-xl border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
            <button onClick={() => setTradeSide("yes")} className={cn("py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all border", tradeSide === "yes" ? (tradeAction === "buy" ? "bg-cyan-500 text-black border-cyan-500" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30") : isDarkMode ? "border-white/5 text-white/40" : "border-slate-200 text-slate-400")}>{tradeAction === "buy" ? "Buy Yes" : "Sell Yes"}</button>
            <button onClick={() => setTradeSide("no")} className={cn("py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all border", tradeSide === "no" ? (tradeAction === "buy" ? "bg-rose-500 text-white border-rose-500" : "bg-rose-500/20 text-rose-400 border-rose-500/30") : isDarkMode ? "border-white/5 text-white/40" : "border-slate-200 text-slate-400")}>{tradeAction === "buy" ? "Buy No" : "Sell No"}</button>
          </div>

          <div className={cn("flex items-center gap-6 border-b transition-colors", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <button onClick={() => setOrderType("limit")} className={cn("pb-3 text-[10px] font-bold uppercase tracking-widest relative", orderType === "limit" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>Limit</button>
            <button onClick={() => setOrderType("market")} className={cn("pb-3 text-[10px] font-bold uppercase tracking-widest relative", orderType === "market" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>Market</button>
          </div>

          <div className="space-y-6">
            {orderType === "market" ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                  <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Amount ($)</span>
                  <span className="text-cyan-400 font-bold">Price: {selectedSidePrice.toFixed(2)}¢</span>
                </div>
                <input value={marketAmount} onChange={(e) => setMarketAmount(e.target.value)} placeholder="0.00" className={cn("w-full h-12 border rounded-lg px-4 font-mono text-lg font-bold outline-none", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")} />
                <div className={cn("text-[10px] font-mono uppercase", isDarkMode ? "text-white/40" : "text-slate-500")}>Est. Shares: <span className={isDarkMode ? "text-white" : "text-slate-900"}>{estimatedShares.toFixed(2)}</span></div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Price per share</span>
                    <button onClick={() => setLimitPrice(selectedSidePrice.toFixed(2))} className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 rounded border border-cyan-500/20">[USE LIVE]</button>
                  </div>
                  <input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className={cn("w-full h-12 border rounded-lg px-4 font-mono text-lg font-bold outline-none", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Shares</span>
                  </div>
                  <input value={limitQuantity} onChange={(e) => setLimitQuantity(e.target.value)} placeholder="0 shares" className={cn("w-full h-12 border rounded-lg px-4 font-mono text-lg font-bold outline-none", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")} />
                </div>
              </>
            )}

            <div className={cn("pt-4 border-t space-y-3", isDarkMode ? "border-white/5" : "border-border-gray")}>
              <div className="flex justify-between text-[10px] font-mono uppercase">
                <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Total Cost</span>
                <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{formatUsd(totalCost)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono uppercase">
                <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Potential Return</span>
                <span className="text-emerald-500 font-bold">{formatUsd(estimatedShares * ((100 - selectedSidePrice) / 100))}</span>
              </div>

              <button onClick={handlePlaceOrder} disabled={isPlacingOrder} className={cn("w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all", isPlacingOrder && "opacity-70 cursor-not-allowed")}>
                {isPlacingOrder ? "EXECUTING..." : "Place Order"}
              </button>
            </div>

            <div className={cn("mt-auto pt-6 border-t font-mono", isDarkMode ? "border-white/5" : "border-border-gray")}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-4 text-cyan-400">YOUR_POSITION</div>
              {positionSummary ? (
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>{tradeSide.toUpperCase()} TOKENS:</span>
                    <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{positionSummary.shares.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>AVG_ENTRY:</span>
                    <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{positionSummary.avgEntryPrice !== null ? `${positionSummary.avgEntryPrice.toFixed(2)}¢` : "--"}</span>
                  </div>
                  {market.state === "RESOLVED" ? (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>STATUS:</span>
                      <span className="font-bold text-amber-400">
                        {position?.pendingPayout && position.pendingPayout > 0 ? `CLAIM ${formatUsd(position.pendingPayout)}` : "POSITION_CLOSED"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>UNREALIZED_PNL:</span>
                      <span className={cn("font-bold", positionSummary.unrealizedPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>{formatUsd(positionSummary.unrealizedPnL)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("text-[10px] uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>&gt; NO_POSITION</div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className={cn("border-t backdrop-blur-xl shrink-0 transition-colors", isDarkMode ? "border-white/5 bg-black/40" : "border-border-gray bg-white/80")}>
        <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 border-b gap-2", isDarkMode ? "border-white/5" : "border-border-gray")}>
          <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button onClick={() => setActiveBottomTab("orders")} className={cn("py-4 text-[10px] font-bold uppercase tracking-widest", activeBottomTab === "orders" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>
              Open_Orders ({visibleOrders.length})
            </button>
            <button onClick={() => setActiveBottomTab("history")} className={cn("py-4 text-[10px] font-bold uppercase tracking-widest", activeBottomTab === "history" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>
              Trade_History ({tradeHistory.length})
            </button>
            <button onClick={() => setActiveBottomTab("summary")} className={cn("py-4 text-[10px] font-bold uppercase tracking-widest", activeBottomTab === "summary" ? "text-cyan-400" : isDarkMode ? "text-white/40" : "text-slate-400")}>
              Position_Summary
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto max-h-[300px]">
          {activeBottomTab === "orders" && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={cn("text-[9px] font-mono uppercase tracking-widest border-b", isDarkMode ? "text-white/20 border-white/5" : "text-slate-400 border-slate-200")}>
                  <th className="pb-4 font-normal">Outcome</th>
                  <th className="pb-4 font-normal">Side</th>
                  <th className="pb-4 font-normal">Price</th>
                  <th className="pb-4 font-normal">Qty</th>
                  <th className="pb-4 font-normal">Fill</th>
                  <th className="pb-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                {visibleOrders.length === 0 ? (
                  <tr><td colSpan={6} className={cn("py-12 text-center uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>&gt; NO_OPEN_ORDERS</td></tr>
                ) : (
                  visibleOrders.map((order) => {
                    const quantity = toNumber(order.quantity);
                    const filledQuantity = toNumber(order.filledQuantity);
                    const fillPercent = quantity > 0 ? Math.round((filledQuantity / quantity) * 100) : 0;
                    return (
                      <tr key={order.id} className={cn("group transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                        <td className={cn("py-4 font-bold", isDarkMode ? "text-white/80" : "text-slate-700")}>{order.outcome}</td>
                        <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{order.side}</td>
                        <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{(toNumber(order.price) * 100).toFixed(2)}¢</td>
                        <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{quantity.toFixed(2)}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDarkMode ? "bg-white/5" : "bg-slate-100")}>
                              <div className="h-full bg-cyan-500" style={{ width: `${fillPercent}%` }} />
                            </div>
                            <span className={cn("text-[9px]", isDarkMode ? "text-white/40" : "text-slate-400")}>{fillPercent}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => cancelOrder(order.id)} className="text-rose-500 hover:text-rose-400 font-bold uppercase tracking-tighter transition-colors">Cancel</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeBottomTab === "history" && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={cn("text-[9px] font-mono uppercase tracking-widest border-b", isDarkMode ? "text-white/20 border-white/5" : "text-slate-400 border-slate-200")}>
                  <th className="pb-4 font-normal">Time</th>
                  <th className="pb-4 font-normal">Role</th>
                  <th className="pb-4 font-normal">Outcome</th>
                  <th className="pb-4 font-normal">Price</th>
                  <th className="pb-4 font-normal">Qty</th>
                  <th className="pb-4 font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                {tradeHistory.length === 0 ? (
                  <tr><td colSpan={6} className={cn("py-12 text-center uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>&gt; NO_TRADE_HISTORY</td></tr>
                ) : (
                  tradeHistory.map((trade) => (
                    <tr key={trade.id} className={cn(isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                      <td className={isDarkMode ? "text-white/60 py-4" : "text-slate-600 py-4"}>{new Date(trade.timestamp).toLocaleString()}</td>
                      <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{trade.role}</td>
                      <td className={cn("font-bold", trade.outcome === "YES" ? "text-cyan-400" : "text-rose-400")}>{trade.outcome}</td>
                      <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{(toNumber(trade.price) * 100).toFixed(2)}¢</td>
                      <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{toNumber(trade.quantity).toFixed(2)}</td>
                      <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{formatUsd(toNumber(trade.total))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeBottomTab === "summary" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={cn("p-4 border rounded-lg", isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                <div className={cn("text-[10px] uppercase tracking-widest mb-2", isDarkMode ? "text-white/40" : "text-slate-500")}>YES TOKENS</div>
                <div className="text-xl font-bold text-cyan-400">{position?.yesTokens?.toFixed(2) ?? "0.00"}</div>
              </div>
              <div className={cn("p-4 border rounded-lg", isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                <div className={cn("text-[10px] uppercase tracking-widest mb-2", isDarkMode ? "text-white/40" : "text-slate-500")}>NO TOKENS</div>
                <div className="text-xl font-bold text-rose-400">{position?.noTokens?.toFixed(2) ?? "0.00"}</div>
              </div>
              <div className={cn("p-4 border rounded-lg", isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                <div className={cn("text-[10px] uppercase tracking-widest mb-2", isDarkMode ? "text-white/40" : "text-slate-500")}>PENDING PAYOUT</div>
                <div className="text-xl font-bold text-emerald-400">{formatUsd(toNumber(position?.pendingPayout))}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingTerminal;
