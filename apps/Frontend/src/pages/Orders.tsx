import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "../lib/api";
import { clearSessionUser } from "../lib/session";

interface ApiOrder {
  id: string;
  marketId: string;
  outcome: "YES" | "NO";
  side: "BUY" | "SELL";
  amount: number | string;
  price: number | string;
  quantity: number | string;
  filledQuantity: number | string;
  status: "OPEN" | "PENDING" | "FILLED" | "CANCELLED" | "PARTIAL" | "FAILED" | "MATCHED";
  createdAt: string;
  market: {
    id: string;
    question: string;
    state: string;
  };
}

type FilterStatus = "ALL" | "OPEN" | "FILLED" | "CANCELLED";
type TimeRange = "1D" | "7D" | "30D" | "90D" | "ALL";

const toNumber = (value: number | string) => Number(value);

export const Orders = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>("30D");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isDark = true;

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      clearSessionUser();
      navigate("/login");
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.status === 401) {
        clearSessionUser();
        navigate("/login");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "FETCH_FAILED");
      }

      setOrders(data.data);
    } catch (fetchError: any) {
      setError(fetchError.message || "FETCH_FAILED");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const pollInterval = setInterval(fetchOrders, 30000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [navigate]);

  const handleCancelOrder = async (id: string, marketName: string) => {
    const token = localStorage.getItem("token");

    if (!token) {
      clearSessionUser();
      navigate("/login");
      return;
    }

    setCancellingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.status === 401) {
        clearSessionUser();
        navigate("/login");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "CANCEL_FAILED");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: "CANCELLED" } : order,
        ),
      );

      toast.success(`ORDER_CANCELLED: ${marketName}`, {
        style: {
          background: "#1a1a1a",
          color: "#fff",
          border: "1px solid #333",
          fontFamily: "monospace",
        },
      });
    } catch (cancelError: any) {
      toast.error(cancelError.message || "CANCEL_FAILED");
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === "ALL") return true;
      if (filter === "OPEN") return order.status === "OPEN" || order.status === "PENDING" || order.status === "PARTIAL" || order.status === "MATCHED";
      return order.status === filter;
    });
  }, [orders, filter]);

  const historyOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => order.status === "FILLED" || order.status === "CANCELLED")
      .filter((order) => {
        if (timeRange === "ALL") return true;
        const now = new Date();
        const orderDate = new Date(order.createdAt);
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        if (timeRange === "1D") return diffDays <= 1;
        if (timeRange === "7D") return diffDays <= 7;
        if (timeRange === "30D") return diffDays <= 30;
        if (timeRange === "90D") return diffDays <= 90;
        return true;
      });
  }, [filteredOrders, timeRange]);

  const openOrders = useMemo(() => {
    return filteredOrders.filter((order) => order.status === "OPEN" || order.status === "PENDING" || order.status === "PARTIAL" || order.status === "MATCHED");
  }, [filteredOrders]);

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return date.toISOString().replace("T", " ").split(".")[0];
  };

  const truncate = (value: string, length: number) => {
    return value.length > length ? `${value.substring(0, length - 3)}...` : value;
  };

  if (error) {
    return (
      <div className="h-screen bg-bg-dark flex flex-col items-center justify-center font-mono text-pro-red">
        <div className="mb-4">ERR: {error} //</div>
        <button onClick={fetchOrders} className="border border-pro-red px-4 py-2 hover:bg-pro-red/10 transition-colors">
          [RETRY]
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark text-text-light font-mono antialiased overflow-hidden h-screen flex flex-col relative selection:bg-cyber-blue selection:text-white">
      <div className="h-8 w-full bg-card-dark border-b border-border-dark flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 text-[10px] text-text-muted font-code uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse"></span>
          System_Status: ONLINE
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 flex flex-col min-w-0 bg-bg-dark relative overflow-hidden">
          <div className="absolute inset-0 grid-dark grid-bg pointer-events-none"></div>

          <header className="h-16 border-b border-border-dark bg-bg-dark/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-4">
              <button className="lg:hidden text-text-muted hover:text-cyber-blue transition-colors" onClick={() => setIsSidebarOpen(true)}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className="text-sm md:text-lg font-code font-bold text-text-light tracking-tight uppercase flex items-center gap-1">
                USER_COMMAND // ORDERS
                <span className="w-2 h-5 bg-cyber-blue animate-pulse ml-1"></span>
              </h1>
            </div>

            <button
              onClick={() => navigate("/markets-terminal")}
              className="px-4 py-2 bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue hover:text-bg-dark transition-all text-xs font-bold flex items-center gap-2"
            >
              [DEPLOY_ORDER]
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-border-dark pb-4 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <FilterButton label="[ALL_ORDERS]" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
                <div className="w-px h-4 bg-border-dark mx-2"></div>
                <FilterButton label="[STATUS: OPEN]" active={filter === "OPEN"} onClick={() => setFilter("OPEN")} />
                <FilterButton label="[STATUS: FILLED]" active={filter === "FILLED"} onClick={() => setFilter("FILLED")} />
                <FilterButton label="[STATUS: CANCELLED]" active={filter === "CANCELLED"} onClick={() => setFilter("CANCELLED")} />
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="w-px h-4 bg-border-dark hidden md:block"></div>
                <div className="relative group">
                  <button className="flex items-center gap-2 text-[10px] text-text-muted hover:text-cyber-blue transition-colors uppercase">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    [TIME_RANGE: {timeRange}]
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-32 bg-card-dark border border-border-dark hidden group-hover:block z-50">
                    {(["1D", "7D", "30D", "90D", "ALL"] as TimeRange[]).map((range) => (
                      <button key={range} onClick={() => setTimeRange(range)} className="w-full text-left px-4 py-2 text-[10px] hover:bg-cyber-blue/10 hover:text-cyber-blue transition-colors">
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {(filter === "ALL" || filter === "OPEN") && (
              <section className="mb-12">
                <h2 className="text-xs font-bold font-code mb-6 flex items-center gap-2 uppercase">
                  <span className="text-cyber-blue">&gt;</span> OPEN_ORDERS
                  <span className="text-[10px] text-text-muted font-normal lowercase">(pending limit)</span>
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border-dark text-[10px] text-text-muted uppercase tracking-wider font-code">
                        <th className="pb-3 font-medium">MARKET</th>
                        <th className="pb-3 font-medium">POSITION</th>
                        <th className="pb-3 font-medium">PRICE</th>
                        <th className="pb-3 font-medium text-right">QTY</th>
                        <th className="pb-3 font-medium px-8">FILLED%</th>
                        <th className="pb-3 font-medium text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                      {isLoading ? (
                        <SkeletonRows count={2} columns={6} />
                      ) : openOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="text-text-muted text-xs">&gt; NULL_QUEUE</div>
                              <div className="text-[10px] text-text-muted/60">No pending orders found.</div>
                              <button onClick={() => navigate("/markets-terminal")} className="text-[10px] text-cyber-blue hover:underline">
                                [DEPLOY_ORDER →]
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        openOrders.map((order) => {
                          const qty = toNumber(order.quantity);
                          const filledQty = toNumber(order.filledQuantity);
                          const fillPercent = qty > 0 ? Math.round((filledQty / qty) * 100) : 0;
                          return (
                            <React.Fragment key={order.id}>
                              <tr className="border-b border-border-dark/30 hover:bg-white/5 transition-colors group">
                                <td className="py-4">
                                  <div className="font-bold text-text-light">{truncate(order.market.question, 40)}</div>
                                  <div className="text-[10px] text-text-muted mt-1">{order.marketId}</div>
                                </td>
                                <td className="py-4">
                                  <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${order.outcome === "YES" ? "bg-pro-green text-bg-dark" : "bg-pro-red text-text-light"}`}>
                                    {order.side} {order.outcome}
                                  </span>
                                </td>
                                <td className="py-4 text-text-light">${toNumber(order.price).toFixed(2)}</td>
                                <td className="py-4 text-right text-text-light">{qty.toFixed(2)}</td>
                                <td className="py-4 px-8">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-card-dark rounded-full overflow-hidden">
                                      <div className={`h-full ${order.outcome === "YES" ? "bg-pro-green" : "bg-pro-red"}`} style={{ width: `${fillPercent}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-text-muted w-8 text-right">{fillPercent}%</span>
                                  </div>
                                </td>
                                <td className="py-4 text-right">
                                  <button onClick={() => setConfirmCancelId(order.id)} disabled={cancellingId === order.id} className="px-3 py-1 border border-border-dark text-text-muted hover:border-pro-red hover:text-pro-red transition-all text-[10px]">
                                    {cancellingId === order.id ? "[CANCELLING...]" : "[CANCEL]"}
                                  </button>
                                </td>
                              </tr>
                              <AnimatePresence>
                                {confirmCancelId === order.id && (
                                  <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-pro-red/5">
                                    <td colSpan={6} className="p-4">
                                      <div className="flex items-center justify-end gap-6 text-[10px]">
                                        <span className="text-pro-red font-bold uppercase tracking-widest">Confirm cancel order?</span>
                                        <div className="flex gap-2">
                                          <button onClick={() => handleCancelOrder(order.id, order.market.question)} className="px-4 py-1 bg-pro-red text-text-light font-bold hover:bg-pro-red/80 transition-colors">
                                            [YES_CANCEL]
                                          </button>
                                          <button onClick={() => setConfirmCancelId(null)} className="px-4 py-1 border border-border-dark text-text-muted hover:text-text-light transition-colors">
                                            [ABORT]
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(filter === "ALL" || filter === "FILLED" || filter === "CANCELLED") && (
              <section>
                <h2 className="text-xs font-bold font-code mb-6 flex items-center gap-2 uppercase">
                  <span className="text-cyber-blue">&gt;</span> ORDER_HISTORY
                  <span className="text-[10px] text-text-muted font-normal lowercase">(executed/cancelled)</span>
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border-dark text-[10px] text-text-muted uppercase tracking-wider font-code">
                        <th className="pb-3 font-medium">TIMESTAMP</th>
                        <th className="pb-3 font-medium">MARKET</th>
                        <th className="pb-3 font-medium">POSITION</th>
                        <th className="pb-3 font-medium">EXEC_PRICE</th>
                        <th className="pb-3 font-medium text-right">QTY</th>
                        <th className="pb-3 font-medium text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                      {isLoading ? (
                        <SkeletonRows count={3} columns={6} />
                      ) : historyOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-text-muted/40 text-[10px] uppercase tracking-widest">
                            No history records found for selected filters.
                          </td>
                        </tr>
                      ) : (
                        historyOrders.map((order) => (
                          <tr key={order.id} className="border-b border-border-dark/20 hover:bg-white/5 transition-colors group">
                            <td className="py-4 text-text-muted text-[10px] whitespace-nowrap">{formatTimestamp(order.createdAt)}</td>
                            <td className="py-4 text-text-light">{truncate(order.market.question, 50)}</td>
                            <td className="py-4">
                              <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold ${order.outcome === "YES" ? "bg-pro-green/20 text-pro-green" : "bg-pro-red/20 text-pro-red"}`}>
                                {order.side} {order.outcome}
                              </span>
                            </td>
                            <td className="py-4 text-text-light">${toNumber(order.price).toFixed(2)}</td>
                            <td className="py-4 text-right text-text-light">{toNumber(order.quantity).toLocaleString()}</td>
                            <td className="py-4 text-right">
                              <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-tighter ${order.status === "FILLED" ? "border-pro-green/30 text-pro-green" : "border-text-muted/30 text-text-muted"}`}>
                                [{order.status}]
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex justify-center">
                  <button onClick={() => toast("Archive export coming soon", { icon: "📦" })} className="flex items-center gap-2 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors uppercase tracking-widest">
                    LOAD_ARCHIVE_DATA <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                </div>
              </section>
            )}
          </div>

          <footer className="h-8 border-t border-border-dark bg-bg-dark/80 backdrop-blur-sm flex items-center justify-between px-4 text-[9px] font-mono text-text-muted uppercase tracking-wider shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pro-green shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                NETWORK_STATUS: OPTIMAL
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-cyber-blue">▣</span>
                NODE: HYDRA_AWS_WEST_02
              </div>
              <div className="hidden md:block">LATENCY: 24MS</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden lg:block">USER_SESSION_ID: {localStorage.getItem("userId")?.slice(0, 6) || "------"}...</div>
              <div className="text-cyber-blue font-bold">{currentTime.toISOString().replace("T", " ").split(".")[0]} UTC</div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

const FilterButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
      active ? "bg-cyber-blue text-bg-dark border border-cyber-blue" : "text-text-muted border border-border-dark hover:border-cyber-blue/50 hover:text-text-light"
    }`}
  >
    {label}
  </button>
);

const SkeletonRows = ({ count, columns }: { count: number; columns: number }) => (
  <>
    {Array.from({ length: count }).map((_, rowIndex) => (
      <tr key={rowIndex} className="border-b border-border-dark/30">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <td key={columnIndex} className="py-6">
            <div className="h-2 bg-card-dark rounded-full animate-pulse w-3/4"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);
