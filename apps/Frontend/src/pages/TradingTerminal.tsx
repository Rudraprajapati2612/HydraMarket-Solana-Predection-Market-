import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  BookOpen, 
  ShoppingCart, 
  Settings2, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wifi,
  Database,
  X,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
import { usePythPrice } from '../hooks/usePythPrice';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// --- Types ---

interface Order {
  id: string;
  marketId: string;
  marketQuestion: string;
  type: 'limit' | 'market';
  side: 'yes' | 'no';
  price: number; // in cents (0-100)
  quantity: number;
  filled: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: Date;
}

interface Trade {
  id: string;
  marketQuestion: string;
  timestamp: Date;
  side: 'yes' | 'no';
  price: number; // in cents
  quantity: number;
  total: number; // in dollars
}

interface Position {
  marketId: string;
  marketQuestion: string;
  side: 'yes' | 'no';
  shares: number;
  avgEntryPrice: number; // in cents
}

// --- Utilities ---

const calculateShares = (amount: number, price: number) => {
  if (price <= 0) return 0;
  return amount / (price / 100);
};

const calculateTotalCost = (quantity: number, price: number) => {
  return (quantity * price) / 100;
};

const calculatePnL = (position: Position, livePrice: number) => {
  const currentPrice = livePrice;
  const unrealizedPnL = (currentPrice - position.avgEntryPrice) / 100 * position.shares;
  const totalValue = (currentPrice / 100) * position.shares;
  return { unrealizedPnL, totalValue };
};

const extractThreshold = (question: string): number => {
  const match = question.match(/\$([0-9,]+(?:\.[0-9]+)?)/);
  if (!match) return 100000; // Default fallback
  return parseFloat(match[1].replace(/,/g, ''));
};

const CustomDot = (props: any) => {
  const { cx, cy, index, data } = props;
  if (index !== data.length - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#00d4ff" />
      <circle cx={cx} cy={cy} r={8} fill="#00d4ff" opacity={0.3} className="animate-ping" />
    </g>
  );
};

const TradingTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // --- UI State ---
  const [activeOrderTab, setActiveOrderTab] = useState<'book' | 'depth'>('book');
  const [activeChartTab, setActiveChartTab] = useState<'history' | 'flow'>('history');
  const [activeBottomTab, setActiveBottomTab] = useState<'orders' | 'history' | 'summary'>('orders');
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes');
  const [orderBookSide, setOrderBookSide] = useState<'yes' | 'no'>('yes');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [isOrderBookOpen, setIsOrderBookOpen] = useState(true); // For tablet/mobile
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isMarketResolved, setIsMarketResolved] = useState(false); // For demo
  const [lastOrderResult, setLastOrderResult] = useState<{ side: 'yes' | 'no', shares: number, price: number, cost: number } | null>(null);

  // --- Pyth Live Data ---
  const { current: btcPrice, previous: prevBtcPrice, priceHistory, isConnected, error: feedError } = usePythPrice();
  const marketQuestion = "Will Bitcoin exceed $100,000 before December 31, 2024?";
  const threshold = useMemo(() => extractThreshold(marketQuestion), [marketQuestion]);

  // --- Trading State ---
  const [livePrice, setLivePrice] = useState<number>(62.1); // Share price in cents
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [balance, setBalance] = useState<number>(10000);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // --- Form State ---
  const [marketAmount, setMarketAmount] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('62.1');
  const [limitQuantity, setLimitQuantity] = useState<string>('');

  // --- Derive Share Price from Live BTC ---
  useEffect(() => {
    if (btcPrice) {
      const derivedSharePrice = Math.min(Math.max((btcPrice / threshold) * 100, 1), 99);
      setLivePrice(Number(derivedSharePrice.toFixed(2)));
      setLastUpdated(new Date());
    }
  }, [btcPrice, threshold]);

  // --- Auto-fill Limit Orders ---
  useEffect(() => {
    const checkOpenOrders = () => {
      const filledOrders: Order[] = [];
      const remainingOrders: Order[] = [];

      openOrders.forEach(order => {
        let isFilled = false;
        if (order.side === 'yes') {
          if (livePrice <= order.price) isFilled = true;
        } else {
          // For NO, if price goes up, NO price goes down (100 - YES)
          const noPrice = 100 - livePrice;
          if (noPrice <= order.price) isFilled = true;
        }

        if (isFilled) {
          filledOrders.push({ ...order, status: 'filled', filled: order.quantity });
        } else {
          remainingOrders.push(order);
        }
      });

      if (filledOrders.length > 0) {
        setOpenOrders(remainingOrders);
        filledOrders.forEach(order => {
          executeTrade(order.side, order.price, order.quantity, order.marketQuestion);
          toast.success(`Limit order filled: ${order.quantity} shares @ ${order.price}¢`, {
            icon: '⚡',
          });
        });
      }
    };

    checkOpenOrders();
  }, [livePrice]);

  // --- Order Execution ---

  const executeTrade = (side: 'yes' | 'no', price: number, quantity: number, question: string) => {
    const totalCost = (quantity * price) / 100;
    
    // 1. Add to Trade History
    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      marketQuestion: question,
      timestamp: new Date(),
      side,
      price,
      quantity,
      total: totalCost
    };
    setTradeHistory(prev => [newTrade, ...prev]);

    // 2. Update Position
    setPositions(prev => {
      const existing = prev.find(p => p.side === side);
      if (existing) {
        const totalShares = existing.shares + quantity;
        const newAvgPrice = ((existing.shares * existing.avgEntryPrice) + (quantity * price)) / totalShares;
        return prev.map(p => p.side === side ? { ...p, shares: totalShares, avgEntryPrice: newAvgPrice } : p);
      } else {
        return [...prev, {
          marketId: id || 'btc-100k',
          marketQuestion: question,
          side,
          shares: quantity,
          avgEntryPrice: price
        }];
      }
    });

    // 3. Deduct Balance
    setBalance(prev => prev - totalCost);
  };

  const handlePlaceOrder = async () => {
    const question = "Will Bitcoin exceed $100,000 before December 31, 2024?";
    setIsPlacingOrder(true);
    setLastOrderResult(null);

    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      if (orderType === 'market') {
        const amount = parseFloat(marketAmount);
        if (isNaN(amount) || amount <= 0) {
          toast.error("Please enter a valid amount");
          return;
        }
        if (amount > balance) {
          toast.error("Insufficient balance");
          return;
        }

        const currentPrice = tradeSide === 'yes' ? livePrice : (100 - livePrice);
        const shares = calculateShares(amount, currentPrice);
        
        executeTrade(tradeSide, currentPrice, shares, question);
        setLastOrderResult({ side: tradeSide, shares, price: currentPrice, cost: amount });
        toast.success("Market order executed successfully");
        setMarketAmount('');
      } else {
        const price = parseFloat(limitPrice);
        const quantity = parseFloat(limitQuantity);
        
        if (isNaN(price) || price <= 0 || price >= 100) {
          toast.error("Please enter a valid price (1-99¢)");
          return;
        }
        if (isNaN(quantity) || quantity <= 0) {
          toast.error("Please enter a valid quantity");
          return;
        }

        const totalCost = calculateTotalCost(quantity, price);
        if (totalCost > balance) {
          toast.error("Insufficient balance");
          return;
        }

        const newOrder: Order = {
          id: Math.random().toString(36).substr(2, 9),
          marketId: id || 'btc-100k',
          marketQuestion: question,
          type: 'limit',
          side: tradeSide,
          price,
          quantity,
          filled: 0,
          status: 'open',
          timestamp: new Date()
        };

        setOpenOrders(prev => [newOrder, ...prev]);
        setLastOrderResult({ side: tradeSide, shares: quantity, price, cost: totalCost });
        toast.success("Limit order placed");
        setLimitQuantity('');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cancelOrder = (orderId: string) => {
    setOpenOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success("Order cancelled");
  };

  // --- Calculations for Display ---
  const marketShares = useMemo(() => {
    const amount = parseFloat(marketAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    const currentPrice = tradeSide === 'yes' ? livePrice : (100 - livePrice);
    return calculateShares(amount, currentPrice);
  }, [marketAmount, tradeSide, livePrice]);

  const limitTotal = useMemo(() => {
    const price = parseFloat(limitPrice);
    const quantity = parseFloat(limitQuantity);
    if (isNaN(price) || isNaN(quantity)) return 0;
    return calculateTotalCost(quantity, price);
  }, [limitPrice, limitQuantity]);

  const orderBookData = useMemo(() => {
    const basePrice = orderBookSide === 'yes' ? livePrice : (100 - livePrice);
    const rawAsks = [
      { p: (basePrice + 0.3).toFixed(1), s: 24550 },
      { p: (basePrice + 0.4).toFixed(1), s: 8220 },
      { p: (basePrice + 0.5).toFixed(1), s: 12401 },
    ];
    const rawBids = [
      { p: (basePrice - 0.1).toFixed(1), s: 15100 },
      { p: (basePrice - 0.2).toFixed(1), s: 4200 },
      { p: (basePrice - 0.3).toFixed(1), s: 12000 },
    ];

    let askCumulative = 0;
    const asks = rawAsks.map(a => {
      askCumulative += a.s;
      return { ...a, t: askCumulative };
    }).reverse();

    let bidCumulative = 0;
    const bids = rawBids.map(b => {
      bidCumulative += b.s;
      return { ...b, t: bidCumulative };
    });

    const maxCumulative = Math.max(askCumulative, bidCumulative);

    return { asks, bids, maxCumulative };
  }, [livePrice, orderBookSide]);

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-cyan-500/30 overflow-x-hidden flex flex-col transition-colors duration-300",
      isDarkMode ? "bg-[#050505] text-white" : "bg-light-bg text-slate-900"
    )}>
      {/* 1. Top Status Bar */}
      <div className={cn(
        "h-8 border-b flex items-center justify-between px-4 text-[10px] font-mono tracking-widest uppercase shrink-0 transition-colors",
        isDarkMode ? "border-white/5 bg-black/60 text-white/40" : "border-border-gray bg-slate-100 text-slate-500"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>SYSTEM_STATUS // NOMINAL</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span>NODE_ID: HM-ULTRA-01</span>
          <span className="text-cyan-400 font-bold">PRO_EDITION</span>
        </div>
      </div>

      {/* 2. Oracle / Price Bar */}
      <div className={cn(
        "h-10 border-b flex items-center justify-between px-4 text-[10px] font-mono shrink-0 transition-colors",
        isDarkMode ? "border-white/5 bg-black/40" : "border-border-gray bg-slate-50"
      )}>
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 text-rose-500 shrink-0">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isConnected ? "bg-emerald-500 animate-pulse-slow" : "bg-rose-500"
            )} />
            <span className={isConnected ? "text-emerald-500" : "text-rose-500"}>
              {isConnected ? "PYTH ORACLE FEED" : feedError ? `FEED_ERROR: ${feedError}` : "CONNECTING..."}
            </span>
          </div>
          <div className={cn("h-4 w-[1px] shrink-0", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
          <div className="flex items-center gap-2 shrink-0">
            <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>BTC/USD:</span>
            <span className={cn(
              "font-bold transition-colors duration-300",
              btcPrice && prevBtcPrice 
                ? btcPrice > prevBtcPrice ? "text-emerald-500" : btcPrice < prevBtcPrice ? "text-rose-500" : (isDarkMode ? "text-white" : "text-slate-900")
                : (isDarkMode ? "text-white" : "text-slate-900")
            )}>
              {btcPrice ? `$${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>DISTANCE_TO_TARGET:</span>
            <span className={cn(
              "font-bold",
              btcPrice && threshold - btcPrice > 0 ? "text-rose-500" : "text-emerald-500"
            )}>
              {btcPrice ? (
                threshold - btcPrice > 0 
                  ? `+$${(threshold - btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} needed (↑${((threshold - btcPrice) / btcPrice * 100).toFixed(2)}%)`
                  : "TARGET MET ✓"
              ) : "---"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <button 
            onClick={() => navigate('/portfolio')}
            className="hidden sm:flex items-center gap-2 group cursor-pointer"
          >
            <span className={cn("uppercase transition-colors", isDarkMode ? "text-white/40 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-700")}>Balance:</span>
            <span className="text-cyan-400 font-bold group-hover:underline decoration-cyan-400/50 underline-offset-4">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </button>
          <div className="flex items-center gap-4 text-emerald-500">
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span className="font-bold">STABLE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Market Header */}
      <div className={cn(
        "p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-4 shrink-0 transition-colors",
        isDarkMode ? "border-white/5" : "border-border-gray"
      )}>
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => navigate('/markets-terminal')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDarkMode ? "hover:bg-white/5 text-white/60 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight mb-1 sm:mb-2 line-clamp-2">
              Will Bitcoin exceed $100,000 before December 31, 2024?
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>VOL</span>
                <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>$4,250,120</span>
              </div>
              <div className="hidden xs:flex items-center gap-1.5">
                <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>OI</span>
                <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>$812,400</span>
              </div>
              <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded text-[9px] font-bold">
                ACTIVE
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all">
              <BookOpen className="w-5 h-5" />
            </button>
            <button className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all">
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-9 sm:h-10 px-3 sm:px-4 border flex flex-col justify-center rounded-lg transition-colors",
              isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
            )}>
              <span className={cn("text-[8px] font-mono uppercase", isDarkMode ? "text-white/40" : "text-slate-500")}>Oracle</span>
              <span className="text-[10px] text-cyan-400 font-bold font-mono">PYTH_MAINNET</span>
            </div>
            
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 border flex items-center justify-center rounded-lg transition-all",
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" 
                  : "bg-slate-100 border-border-gray text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 border flex items-center justify-center rounded-lg transition-all",
              isDarkMode 
                ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" 
                : "bg-slate-100 border-border-gray text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            )}>
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Market Resolution Banner */}
      {isMarketResolved && (
        <div className={cn("border-b py-2 px-4 flex items-center justify-between transition-colors", isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")}>
          <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
            <span className="animate-pulse">▶</span> MARKET_RESOLVED — OUTCOME: YES
          </div>
          <button className="text-emerald-500 text-[10px] font-bold underline hover:text-emerald-400 transition-colors">
            [CLAIM_YOUR_PAYOUT →]
          </button>
        </div>
      )}

      {/* 4. Main Trading Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-px bg-white/5 overflow-y-auto md:overflow-hidden">
        
        {/* Left: Order Book (Collapsible on Tablet/Mobile) */}
        <div className={cn(
          "md:col-span-3 flex flex-col border-b md:border-b-0 transition-all duration-300",
          isDarkMode ? "bg-[#050505] border-white/5" : "bg-white border-border-gray",
          !isOrderBookOpen && "h-12 md:h-full overflow-hidden"
        )}>
          <div className={cn("flex items-center justify-between px-4 border-b shrink-0", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveOrderTab('book')}
                className={cn(
                  "py-3 text-[10px] font-bold uppercase tracking-widest relative",
                  activeOrderTab === 'book' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
                )}
              >
                Order_Book
                {activeOrderTab === 'book' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
              </button>
              <button 
                onClick={() => setActiveOrderTab('depth')}
                className={cn(
                  "py-3 text-[10px] font-bold uppercase tracking-widest relative",
                  activeOrderTab === 'depth' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
                )}
              >
                Depth_Map
                {activeOrderTab === 'depth' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex p-0.5 rounded border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
                <button 
                  onClick={() => setOrderBookSide('yes')}
                  className={cn(
                    "px-2 py-0.5 text-[8px] font-bold rounded transition-colors",
                    orderBookSide === 'yes' 
                      ? (isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-white text-cyan-600 shadow-sm") 
                      : (isDarkMode ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  YES
                </button>
                <button 
                  onClick={() => setOrderBookSide('no')}
                  className={cn(
                    "px-2 py-0.5 text-[8px] font-bold rounded transition-colors",
                    orderBookSide === 'no' 
                      ? (isDarkMode ? "bg-rose-500/20 text-rose-400" : "bg-white text-rose-600 shadow-sm") 
                      : (isDarkMode ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  NO
                </button>
              </div>
              <button 
                onClick={() => setIsOrderBookOpen(!isOrderBookOpen)}
                className={cn("md:hidden p-2", isDarkMode ? "text-white/40" : "text-slate-400")}
              >
                {isOrderBookOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeOrderTab === 'book' ? (
              <>
                <div className={cn("grid grid-cols-3 text-[9px] font-mono uppercase mb-2 pb-1 border-b border-[#1e1e2e]", isDarkMode ? "text-white/20" : "text-slate-400")}>
                  <span>Price(¢)</span>
                  <span className="text-center">Size</span>
                  <span className="text-right flex items-center justify-end gap-1">
                    Total <span className="text-[7px] opacity-50">▼ cumulative</span>
                  </span>
                </div>
                
                <div className="space-y-1 font-mono text-xs">
                  {orderBookData.asks.map((row, i) => (
                    <div key={i} className={cn("grid grid-cols-3 py-1 group cursor-pointer transition-colors relative", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                      <div 
                        className="absolute inset-y-0 right-0 bg-rose-500/10 pointer-events-none transition-all duration-300" 
                        style={{ width: `${(row.t / orderBookData.maxCumulative) * 100}%` }}
                      />
                      <span className="text-rose-500 relative z-10">{row.p}</span>
                      <span className={cn("text-center relative z-10", isDarkMode ? "text-white/60" : "text-slate-600")}>{row.s.toLocaleString()}</span>
                      <span className={cn("text-right relative z-10", isDarkMode ? "text-white/40" : "text-slate-400")}>{(row.t / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>

                <div className={cn("my-4 py-3 px-4 border-y flex items-center justify-between bg-[#1a1a2e]/40 rounded", isDarkMode ? "border-white/5" : "border-border-gray bg-slate-100")}>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold tracking-tighter text-cyan-400">
                      {orderBookSide === 'yes' ? livePrice : (100 - livePrice)}¢
                    </div>
                    <div className={cn("text-[10px] font-mono", isDarkMode ? "text-white/40" : "text-slate-500")}>
                      ≈ ${((orderBookSide === 'yes' ? livePrice : (100 - livePrice)) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-[8px] uppercase font-mono", isDarkMode ? "text-white/20" : "text-slate-400")}>Spread</div>
                    <div className="text-[10px] font-mono">0.2¢ (0.32%)</div>
                  </div>
                </div>

                <div className={cn("grid grid-cols-3 text-[9px] font-mono uppercase mb-2 pb-1 border-b border-[#1e1e2e]", isDarkMode ? "text-white/20" : "text-slate-400")}>
                  <span>Price(¢)</span>
                  <span className="text-center">Size</span>
                  <span className="text-right flex items-center justify-end gap-1">
                    Total <span className="text-[7px] opacity-50">▲ cumulative</span>
                  </span>
                </div>

                <div className="space-y-1 font-mono text-xs">
                  {orderBookData.bids.map((row, i) => (
                    <div key={i} className={cn("grid grid-cols-3 py-1 group cursor-pointer transition-colors relative", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                      <div 
                        className="absolute inset-y-0 left-0 bg-emerald-500/10 pointer-events-none transition-all duration-300" 
                        style={{ width: `${(row.t / orderBookData.maxCumulative) * 100}%` }}
                      />
                      <span className="text-emerald-500 relative z-10">{row.p}</span>
                      <span className={cn("text-center relative z-10", isDarkMode ? "text-white/60" : "text-slate-600")}>{row.s.toLocaleString()}</span>
                      <span className={cn("text-right relative z-10", isDarkMode ? "text-white/40" : "text-slate-400")}>{(row.t / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className={cn("text-[10px] font-mono uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>
                  &gt; NULL_FEED — NO_DEPTH_MAP_DATA
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Chart */}
        <div className={cn(
          "md:col-span-6 flex flex-col border-x min-h-[300px] md:min-h-0 transition-colors",
          isDarkMode ? "bg-[#050505] border-white/5" : "bg-white border-border-gray"
        )}>
          <div className={cn("flex items-center justify-between px-4 border-b shrink-0", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveChartTab('history')}
                className={cn(
                  "py-3 text-[10px] font-bold uppercase tracking-widest relative",
                  activeChartTab === 'history' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
                )}
              >
                Price_History
                {activeChartTab === 'history' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
              </button>
              <button 
                onClick={() => setActiveChartTab('flow')}
                className={cn(
                  "py-3 text-[10px] font-bold uppercase tracking-widest relative",
                  activeChartTab === 'flow' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
                )}
              >
                Order_Flow
                {activeChartTab === 'flow' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
              </button>
            </div>
            <div className={cn("flex items-center gap-1 p-0.5 rounded border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
              <div className="px-2 py-0.5 text-[8px] font-mono text-cyan-400/60 uppercase tracking-tighter border-r border-white/10 mr-1">
                Live_Session
              </div>
              {['1H', '4H', '1D', '1W'].map((t) => (
                <button 
                  key={t}
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-bold rounded transition-all opacity-40 grayscale cursor-not-allowed",
                    t === '4H' 
                      ? (isDarkMode ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,209,255,0.2)] opacity-100 grayscale-0" : "bg-white text-cyan-600 shadow-md border border-cyan-100 opacity-100 grayscale-0") 
                      : (isDarkMode ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 relative p-4 sm:p-8 overflow-hidden">
            {activeChartTab === 'history' ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <ReferenceLine
                      y={threshold}
                      stroke="#ef4444"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{
                        value: `▶ TARGET $${threshold.toLocaleString()}`,
                        position: 'insideTopLeft',
                        fill: '#ef4444',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                      }}
                    />

                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      tick={{ fill: isDarkMode ? '#475569' : '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: isDarkMode ? '#1e1e2e' : '#e2e8f0' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `$${val.toLocaleString()}`}
                      tick={{ fill: isDarkMode ? '#475569' : '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: isDarkMode ? '#1e1e2e' : '#e2e8f0' }}
                      tickLine={false}
                      orientation="right"
                      width={80}
                    />

                    <Tooltip
                      contentStyle={{
                        background: isDarkMode ? '#0f0f1a' : '#ffffff',
                        border: isDarkMode ? '1px solid #1e1e2e' : '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'BTC/USD']}
                      labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                    />

                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                      dot={<CustomDot data={priceHistory} />}
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-start justify-start p-8 font-mono">
                <div className={cn("text-[10px] uppercase tracking-widest mb-4", isDarkMode ? "text-cyan-400" : "text-cyan-600")}>
                  &gt; ORDER_FLOW_FEED
                </div>
                <div className={cn("text-[12px] uppercase tracking-wider mb-2", isDarkMode ? "text-white/40" : "text-slate-500")}>
                  AWAITING_TRANSACTION_DATA...
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-4 bg-cyan-500 animate-pulse" />
                </div>
              </div>
            )}
            
            {/* Price Tag */}
            {activeChartTab === 'history' && (
              <div className="absolute right-4 sm:right-8 top-[40px] -translate-y-1/2 bg-cyan-500 text-black text-[10px] font-bold px-2 py-1 rounded shadow-[0_0_15px_rgba(0,209,255,0.4)]">
                {livePrice}¢
              </div>
            )}
          </div>
        </div>

        {/* Right: Trade Panel */}
        <div className={cn(
          "md:col-span-3 p-4 sm:p-6 flex flex-col gap-6 sm:gap-8 border-t md:border-t-0 transition-colors",
          isDarkMode ? "bg-[#050505] border-white/5" : "bg-white border-border-gray"
        )}>
          <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-xl border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
            <button 
              onClick={() => setTradeAction('buy')}
              className={cn(
                "py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                tradeAction === 'buy' 
                  ? "bg-[#141420] border-b-2 border-cyan-400 text-white shadow-lg" 
                  : "bg-transparent text-[#475569] hover:text-white/60"
              )}
            >
              Buy
            </button>
            <button 
              onClick={() => setTradeAction('sell')}
              className={cn(
                "py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                tradeAction === 'sell' 
                  ? "bg-[#141420] border-b-2 border-rose-400 text-white shadow-lg" 
                  : "bg-transparent text-[#475569] hover:text-white/60"
              )}
            >
              Sell
            </button>
          </div>

          <div className={cn("grid grid-cols-2 gap-2 p-1 rounded-xl border transition-colors", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-border-gray")}>
            <button 
              onClick={() => setTradeSide('yes')}
              className={cn(
                "py-2.5 sm:py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all border",
                tradeSide === 'yes' 
                  ? (tradeAction === 'buy' ? "bg-cyan-500 text-black border-cyan-500 shadow-[0_0_20px_rgba(0,209,255,0.4)]" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30")
                  : (isDarkMode ? "border-white/5 text-white/40 hover:border-cyan-500/30 hover:text-white/60" : "border-slate-200 text-slate-400 hover:border-cyan-500/30 hover:text-slate-600")
              )}
            >
              {tradeAction === 'buy' ? 'Buy Yes' : 'Sell Yes'}
            </button>
            <button 
              onClick={() => setTradeSide('no')}
              className={cn(
                "py-2.5 sm:py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all border",
                tradeSide === 'no' 
                  ? (tradeAction === 'buy' ? "bg-rose-500 text-white border-rose-500 shadow-[0_0_20px_rgba(255,0,60,0.4)]" : "bg-rose-500/20 text-rose-400 border-rose-500/30")
                  : (isDarkMode ? "border-white/5 text-white/40 hover:border-rose-500/30 hover:text-white/60" : "border-slate-200 text-slate-400 hover:border-rose-500/30 hover:text-slate-600")
              )}
            >
              {tradeAction === 'buy' ? 'Buy No' : 'Sell No'}
            </button>
          </div>

          <div className={cn("flex items-center gap-6 border-b transition-colors", isDarkMode ? "border-white/5" : "border-border-gray")}>
            <button 
              onClick={() => setOrderType('limit')}
              className={cn(
                "pb-3 text-[10px] font-bold uppercase tracking-widest relative",
                orderType === 'limit' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
              )}
            >
              Limit
              {orderType === 'limit' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
            </button>
            <button 
              onClick={() => setOrderType('market')}
              className={cn(
                "pb-3 text-[10px] font-bold uppercase tracking-widest relative",
                orderType === 'market' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
              )}
            >
              Market
              {orderType === 'market' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
            </button>
          </div>

          <div className="space-y-6">
            {orderType === 'market' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                  <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Amount ($)</span>
                  <span className="text-cyan-400 font-bold">Price: {tradeSide === 'yes' ? livePrice : (100 - livePrice)}¢</span>
                </div>
                <div className={cn(
                  "h-12 border rounded-lg flex items-center px-4 group focus-within:border-cyan-500/50 transition-all",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                )}>
                  <input 
                    type="number" 
                    value={marketAmount}
                    onChange={(e) => setMarketAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn("bg-transparent border-none outline-none w-full font-mono text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}
                  />
                  <span className={isDarkMode ? "text-white/20" : "text-slate-400"}>$</span>
                </div>
                <div className={cn("text-[10px] font-mono uppercase mt-1", isDarkMode ? "text-white/40" : "text-slate-500")}>
                  Est. Shares: <span className={isDarkMode ? "text-white" : "text-slate-900"}>{marketShares.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Price per share</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">Ask: {livePrice}¢</span>
                      <button 
                        onClick={() => setLimitPrice(livePrice.toString())}
                        className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 rounded border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                      >
                        [USE ASK]
                      </button>
                    </div>
                  </div>
                  <div className={cn(
                    "h-12 border rounded-lg flex items-center group focus-within:border-cyan-500/50 transition-all overflow-hidden",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                  )}>
                    <button 
                      onClick={() => setLimitPrice(prev => (Math.max(0.01, parseFloat(prev) - 0.01)).toFixed(2))}
                      className={cn("h-full px-3 border-r transition-colors", isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-200")}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className={cn("bg-transparent border-none outline-none w-full font-mono text-lg font-bold text-center", isDarkMode ? "text-white" : "text-slate-900")}
                    />
                    <button 
                      onClick={() => setLimitPrice(prev => (Math.min(99.99, parseFloat(prev) + 0.01)).toFixed(2))}
                      className={cn("h-full px-3 border-l transition-colors", isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-200")}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Shares</span>
                    <span className={isDarkMode ? "text-white/60" : "text-slate-600"}>Max: {Math.floor(balance / (parseFloat(limitPrice) / 100) || 0).toLocaleString()}</span>
                  </div>
                  <div className={cn(
                    "h-12 border rounded-lg flex items-center px-4 group focus-within:border-cyan-500/50 transition-all",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                  )}>
                    <input 
                      type="number" 
                      value={limitQuantity}
                      onChange={(e) => setLimitQuantity(e.target.value)}
                      placeholder="0 shares"
                      className={cn("bg-transparent border-none outline-none w-full font-mono text-lg font-bold", isDarkMode ? "text-white" : "text-slate-900")}
                    />
                  </div>
                  <div className={cn("text-[8px] font-mono uppercase opacity-40", isDarkMode ? "text-white" : "text-slate-900")}>
                    MIN: 1 — MAX: {Math.floor(balance / (parseFloat(limitPrice) / 100) || 0).toLocaleString()}
                  </div>
                </div>
              </>
            )}

            <div className={cn("pt-4 border-t space-y-3", isDarkMode ? "border-white/5" : "border-border-gray")}>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Total Cost</span>
                  <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>
                    ${(orderType === 'market' ? parseFloat(marketAmount) || 0 : limitTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={cn("text-[8px] font-mono uppercase opacity-30 text-right", isDarkMode ? "text-white" : "text-slate-900")}>
                  SHARES × PRICE_PER_SHARE
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>Potential Return</span>
                  <span className="text-emerald-500 font-bold">
                    ${(orderType === 'market' ? (marketShares * (100 - (tradeSide === 'yes' ? livePrice : (100 - livePrice))) / 100) : (parseFloat(limitQuantity) * (100 - parseFloat(limitPrice)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    ({orderType === 'market' ? 
                      (marketShares > 0 ? (((100 / (tradeSide === 'yes' ? livePrice : (100 - livePrice))) * 100) - 100).toFixed(1) : '0') : 
                      (limitTotal > 0 ? (((100 / parseFloat(limitPrice)) * 100) - 100).toFixed(1) : '0')}%)
                  </span>
                </div>
                <div className={cn("text-[8px] font-mono uppercase opacity-30 text-right", isDarkMode ? "text-white" : "text-slate-900")}>
                  if market resolves {tradeSide.toUpperCase()}
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className={cn(
                  "w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:shadow-[0_0_40px_rgba(0,209,255,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  isPlacingOrder && "opacity-70 cursor-not-allowed"
                )}
              >
                {isPlacingOrder ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    EXECUTING...
                  </>
                ) : "Place Order"}
              </button>

              <AnimatePresence>
                {lastOrderResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn("p-3 rounded-lg border text-[10px] font-mono", isDarkMode ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span className="font-bold">✓ ORDER_EXECUTED</span>
                    </div>
                    <div className="space-y-0.5 opacity-80">
                      <div>BUY {lastOrderResult.shares.toFixed(2)} {lastOrderResult.side.toUpperCase()} @ {lastOrderResult.price.toFixed(1)}¢</div>
                      <div>COST: ${lastOrderResult.cost.toFixed(2)} deducted</div>
                    </div>
                    <button 
                      onClick={() => setActiveBottomTab('orders')}
                      className="mt-2 text-[9px] font-bold underline hover:text-white transition-colors"
                    >
                      [VIEW_OPEN_ORDERS]
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Your Position Summary (New) */}
            {positions.length > 0 && (
              <div className={cn("mt-auto pt-6 border-t font-mono", isDarkMode ? "border-white/5" : "border-border-gray")}>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-4 text-cyan-400">YOUR_POSITION</div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>{positions[0].side.toUpperCase()} TOKENS:</span>
                    <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{positions[0].shares.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>AVG_ENTRY:</span>
                    <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{positions[0].avgEntryPrice.toFixed(1)}¢</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>CURRENT_PRICE:</span>
                    <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>{livePrice}¢</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5 mt-1">
                    <span className={isDarkMode ? "text-white/40" : "text-slate-500"}>UNREALIZED_PNL:</span>
                    <span className={cn("font-bold", calculatePnL(positions[0], livePrice).unrealizedPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {calculatePnL(positions[0], livePrice).unrealizedPnL >= 0 ? '+' : ''}${calculatePnL(positions[0], livePrice).unrealizedPnL.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Panel */}
      <div className={cn("border-t backdrop-blur-xl shrink-0 transition-colors", isDarkMode ? "border-white/5 bg-black/40" : "border-border-gray bg-white/80")}>
        <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 border-b gap-2", isDarkMode ? "border-white/5" : "border-border-gray")}>
          <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button 
              onClick={() => setActiveBottomTab('orders')}
              className={cn(
                "py-4 text-[10px] font-bold uppercase tracking-widest relative whitespace-nowrap",
                activeBottomTab === 'orders' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
              )}
            >
              Open_Orders ({openOrders.length})
              {activeBottomTab === 'orders' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
            </button>
            <button 
              onClick={() => setActiveBottomTab('history')}
              className={cn(
                "py-4 text-[10px] font-bold uppercase tracking-widest relative whitespace-nowrap",
                activeBottomTab === 'history' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
              )}
            >
              Trade_History ({tradeHistory.length})
              {activeBottomTab === 'history' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
            </button>
            <button 
              onClick={() => setActiveBottomTab('summary')}
              className={cn(
                "py-4 text-[10px] font-bold uppercase tracking-widest relative whitespace-nowrap",
                activeBottomTab === 'summary' ? "text-cyan-400" : (isDarkMode ? "text-white/40" : "text-slate-400")
              )}
            >
              Position_Summary ({positions.length})
              {activeBottomTab === 'summary' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400" />}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-2 py-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Websocket Connected</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto max-h-[300px]">
          {activeBottomTab === 'orders' && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={cn("text-[9px] font-mono uppercase tracking-widest border-b", isDarkMode ? "text-white/20 border-white/5" : "text-slate-400 border-slate-200")}>
                  <th className="pb-4 font-normal">Market_Question</th>
                  <th className="pb-4 font-normal">Side</th>
                  <th className="pb-4 font-normal">Price</th>
                  <th className="pb-4 font-normal">Qty</th>
                  <th className="pb-4 font-normal">Fill</th>
                  <th className="pb-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                <AnimatePresence mode='popLayout'>
                  {openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={cn("py-12 text-center uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>
                        &gt; NO_OPEN_ORDERS — DEPLOY_ORDER to initialize
                      </td>
                    </tr>
                  ) : (
                    openOrders.map((order) => (
                      <motion.tr 
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={cn("group transition-colors", isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}
                      >
                        <td className={cn("py-4 font-bold", isDarkMode ? "text-white/80" : "text-slate-700")}>{order.marketQuestion}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold",
                            order.side === 'yes' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {order.side.toUpperCase()}_BUY
                          </span>
                        </td>
                        <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{order.price}¢</td>
                        <td className={isDarkMode ? "text-white/60" : "text-slate-600"}>{order.quantity.toLocaleString()}</td>
                        <td className="py-4 w-48">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDarkMode ? "bg-white/5" : "bg-slate-100")}>
                              <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,209,255,0.5)]" style={{ width: `${(order.filled / order.quantity) * 100}%` }} />
                            </div>
                            <span className={cn("text-[9px]", isDarkMode ? "text-white/40" : "text-slate-400")}>{Math.round((order.filled / order.quantity) * 100)}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => cancelOrder(order.id)}
                            className="text-rose-500 hover:text-rose-400 font-bold uppercase tracking-tighter transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          )}

          {activeBottomTab === 'history' && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className={cn("text-[10px] font-mono uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>
                &gt; NO_TRADE_HISTORY — execute first trade to populate
              </div>
            </div>
          )}

          {activeBottomTab === 'summary' && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className={cn("text-[10px] font-mono uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-slate-400")}>
                &gt; NO_POSITION — place order to establish position
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingTerminal;
