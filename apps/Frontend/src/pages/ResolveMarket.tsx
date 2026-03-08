import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Sidebar } from "../components/Sidebar";

interface Market {
  id: string;
  question: string;
  description: string;
  category: string;
  expiresAt: string;
  volume: number;
  traders: number;
  resolutionSource: string;
  state: string;
  outcome?: string;
  resolvedAt?: string;
}

export const ResolveMarket = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("admin-theme");
    return (saved as "light" | "dark") || "dark";
  });

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-card state
  const [selections, setSelections] = useState<Record<string, { outcome: "YES" | "NO" | "INVALID" | null; reason: string }>>({});
  const [submitStates, setSubmitStates] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const [recentlyResolved, setRecentlyResolved] = useState<Market[]>([]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("admin-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const isDark = theme === "dark";

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock API call: GET /markets?state=OPEN
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMarkets: Market[] = [
        {
          id: "#MKT-8809",
          question: "Will BTC reach $100k by March 2026?",
          description: "Resolves YES if BTC/USD >= 100,000 at expiry according to Pyth oracle",
          category: "Crypto",
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          volume: 12543,
          traders: 847,
          resolutionSource: "Pyth BTC/USD oracle",
          state: "OPEN"
        },
        {
          id: "#MKT-9122",
          question: "Will India beat New Zealand in the 3rd Test?",
          description: "Resolves YES if India wins the match. NO if NZ wins or Draw.",
          category: "Sports",
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          volume: 45200,
          traders: 3120,
          resolutionSource: "Official ICC Match Report",
          state: "OPEN"
        },
        {
          id: "#MKT-7741",
          question: "Will the Fed cut interest rates in March 2026?",
          description: "Resolves YES if the Federal Reserve announces a rate cut of at least 25bps.",
          category: "Finance",
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
          volume: 89000,
          traders: 1240,
          resolutionSource: "Federal Reserve Official Website",
          state: "OPEN"
        }
      ];

      // Filter for expired markets
      const now = new Date();
      const expired = mockMarkets.filter(m => new Date(m.expiresAt) < now);
      
      setMarkets(expired);
      
      // Initialize selections
      const initialSelections: any = {};
      expired.forEach(m => {
        initialSelections[m.id] = { outcome: null, reason: "" };
      });
      setSelections(initialSelections);

    } catch (err: any) {
      setError(err.message || "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutcome = (marketId: string, outcome: "YES" | "NO" | "INVALID") => {
    setSelections(prev => ({
      ...prev,
      [marketId]: { ...prev[marketId], outcome }
    }));
  };

  const handleReasonChange = (marketId: string, reason: string) => {
    setSelections(prev => ({
      ...prev,
      [marketId]: { ...prev[marketId], reason }
    }));
  };

  const handleResolve = async (marketId: string) => {
    const selection = selections[marketId];
    if (!selection.outcome) return;

    setSubmitStates(prev => ({ ...prev, [marketId]: "loading" }));
    setSubmitErrors(prev => ({ ...prev, [marketId]: "" }));

    try {
      // Mock API call: POST /payouts/resolve/{marketId}
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      setSubmitStates(prev => ({ ...prev, [marketId]: "success" }));
      toast.success(`Market resolved as ${selection.outcome} — payouts queued`);

      // Move to recently resolved
      const resolvedMarket = markets.find(m => m.id === marketId);
      if (resolvedMarket) {
        const updatedMarket = {
          ...resolvedMarket,
          outcome: selection.outcome,
          resolvedAt: new Date().toISOString()
        };
        setRecentlyResolved(prev => [updatedMarket, ...prev]);
      }

      // Remove from pending after animation
      setTimeout(() => {
        setMarkets(prev => prev.filter(m => m.id !== marketId));
      }, 500);

    } catch (err: any) {
      setSubmitStates(prev => ({ ...prev, [marketId]: "error" }));
      setSubmitErrors(prev => ({ ...prev, [marketId]: err.message || "Failed to resolve market" }));
      toast.error("Resolution failed");
    }
  };

  const formatTimeAgo = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
    return "just now";
  };

  const unresolvedCount = markets.length;

  return (
    <div className={`
      ${isDark ? "bg-bg-dark text-text-light" : "bg-light-bg text-charcoal"}
      font-mono antialiased overflow-hidden h-screen flex flex-col relative selection:bg-cyber-blue selection:text-white transition-colors duration-300
    `}>
      {/* System Status Bar */}
      <div className={`h-8 w-full ${isDark ? "bg-card-dark border-border-dark" : "bg-light-gray border-border-gray"} border-b flex items-center justify-between px-4 z-50`}>
        <div className={`flex items-center gap-2 text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase tracking-wider`}>
          <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse shadow-[0_0_8px_#10B981]"></span>
          SYSTEM_STATUS: ONLINE
        </div>
        <div className={`hidden sm:block text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code`}>
          TERMINAL_ID: HM-ADMIN-NODE-01
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        {/* Main Content */}
        <main className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-bg-dark" : "bg-light-bg"} relative overflow-hidden`}>
          {/* Grid Background */}
          <div className={`absolute inset-0 ${isDark ? "grid-dark" : "grid-light"} grid-bg pointer-events-none ${isDark ? "opacity-40" : "opacity-30"}`}></div>
          
          <header className={`h-20 border-b ${isDark ? "border-border-dark bg-bg-dark/80" : "border-border-gray bg-white/80"} backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8`}>
            <div className="flex items-center gap-4">
              <button 
                className={`lg:hidden ${isDark ? "text-text-muted" : "text-gray-500"} hover:text-cyber-blue transition-colors`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <div className="flex flex-col">
                <h1 className={`text-xl sm:text-2xl font-serif ${isDark ? "text-white" : "text-charcoal"} tracking-tight uppercase`}>Resolve Markets</h1>
                <p className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-500"} uppercase tracking-widest`}>Markets that have expired and are waiting for a final outcome</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/markets-terminal")}
                className={`hidden sm:flex items-center gap-2 text-[10px] font-bold font-code ${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-500 hover:text-cyber-blue"} transition-colors uppercase`}
              >
                ← Back to Markets
              </button>
              <button 
                onClick={toggleTheme}
                className={`h-9 w-9 border ${isDark ? "border-border-dark bg-card-dark text-text-muted" : "border-border-gray bg-white text-gray-400"} flex items-center justify-center hover:border-cyber-blue hover:text-cyber-blue transition-colors cursor-pointer rounded-sm`}
              >
                <span className="material-symbols-outlined text-sm">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Summary Banner */}
              <div className={`p-4 border rounded-sm flex items-center gap-4 transition-all duration-500 ${
                unresolvedCount > 0 
                  ? `${isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-amber-50 border-amber-200 text-amber-700"}`
                  : `${isDark ? "bg-pro-green/10 border-pro-green/30 text-pro-green" : "bg-green-50 border-green-200 text-green-700"}`
              }`}>
                <span className="material-symbols-outlined">
                  {unresolvedCount > 0 ? "warning" : "check_circle"}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-code uppercase tracking-tight">
                    {unresolvedCount > 0 
                      ? `${unresolvedCount} market${unresolvedCount > 1 ? "s are" : " is"} waiting for resolution`
                      : "All markets are resolved"}
                  </span>
                  <span className="text-[10px] opacity-80 uppercase font-code">
                    {unresolvedCount > 0 
                      ? "Unresolved markets freeze trader funds — resolve promptly"
                      : "No action needed right now"}
                  </span>
                </div>
              </div>

              {/* Market Resolution Cards */}
              <div className="space-y-6">
                {loading ? (
                  // Skeleton Cards
                  [1, 2].map(i => (
                    <div key={i} className={`border p-6 rounded-sm space-y-6 animate-pulse ${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"}`}>
                      <div className="space-y-3">
                        <div className={`h-3 w-20 rounded ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                        <div className={`h-6 w-3/4 rounded ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                        <div className={`h-4 w-full rounded ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                      </div>
                      <div className="flex gap-4">
                        {[1, 2, 3].map(j => (
                          <div key={j} className={`h-10 flex-1 rounded ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                        ))}
                      </div>
                      <div className={`h-12 w-full rounded ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                    </div>
                  ))
                ) : markets.length === 0 ? (
                  // Empty State
                  <div className={`border-2 border-dashed p-12 rounded-sm flex flex-col items-center justify-center text-center space-y-4 ${isDark ? "border-border-dark bg-card-dark/30" : "border-border-gray bg-gray-50/50"}`}>
                    <span className="material-symbols-outlined text-5xl text-pro-green">check_circle</span>
                    <div className="space-y-1">
                      <h3 className={`text-lg font-bold font-serif uppercase ${isDark ? "text-text-light" : "text-charcoal"}`}>All caught up.</h3>
                      <p className={`text-xs font-code ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>No markets waiting for resolution.</p>
                    </div>
                    <button 
                      onClick={() => navigate("/markets-terminal")}
                      className="px-6 py-2 border border-cyber-blue text-cyber-blue text-[10px] font-bold font-code uppercase hover:bg-cyber-blue/10 transition-all rounded-sm"
                    >
                      [← Back to Markets]
                    </button>
                  </div>
                ) : (
                  // Real Market Cards
                  markets.map(market => {
                    const selection = selections[market.id] || { outcome: null, reason: "" };
                    const submitState = submitStates[market.id] || "idle";
                    const submitError = submitErrors[market.id] || "";

                    return (
                      <div 
                        key={market.id} 
                        className={`relative border rounded-sm overflow-hidden transition-all duration-500 transform ${
                          submitState === "success" ? "scale-95 opacity-0 h-0 p-0 m-0 overflow-hidden" : "p-6"
                        } ${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"}`}
                      >
                        {/* Success Overlay */}
                        {submitState === "success" && (
                          <div className="absolute inset-0 bg-pro-green/20 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300">
                            <div className="flex flex-col items-center gap-2">
                              <span className="material-symbols-outlined text-6xl text-pro-green drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">check_circle</span>
                              <span className="text-xs font-bold font-code text-pro-green uppercase tracking-widest">Resolved</span>
                            </div>
                          </div>
                        )}

                        {/* Market Info Section */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-400"}`}>{market.id}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-tighter ${isDark ? "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30" : "bg-cyber-blue/5 text-cyber-blue border-cyber-blue/20"}`}>
                              {market.category}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <h2 className={`text-xl font-bold leading-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>
                              {market.question}
                            </h2>
                            <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} opacity-80`}>
                              {market.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-pro-red">event_busy</span>
                              <span className={`text-[10px] font-code font-bold ${isDark ? "text-pro-red" : "text-red-600"}`}>
                                Expired {formatTimeAgo(market.expiresAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-cyber-blue">payments</span>
                              <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-500"}`}>
                                Vol: ${market.volume.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-cyber-blue">group</span>
                              <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-500"}`}>
                                Traders: {market.traders.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className={`p-3 border ${isDark ? "bg-bg-dark/50 border-border-dark/50" : "bg-gray-50 border-gray-100"} rounded-sm flex items-center gap-3`}>
                            <span className="material-symbols-outlined text-sm text-cyber-blue">source</span>
                            <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-600"}`}>
                              Resolution source: <span className="font-bold">{market.resolutionSource}</span>
                            </span>
                          </div>
                        </div>

                        {/* Outcome Selector */}
                        <div className="mt-8 space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <button 
                              onClick={() => handleSelectOutcome(market.id, "YES")}
                              className={`py-3 flex flex-col items-center justify-center gap-1 border rounded-sm transition-all
                                ${selection.outcome === "YES" 
                                  ? "bg-pro-green text-white border-pro-green shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                                  : `${isDark ? "bg-bg-dark border-border-dark text-text-muted hover:border-pro-green hover:text-pro-green" : "bg-white border-border-gray text-gray-500 hover:border-pro-green hover:text-pro-green"}`
                                }
                              `}
                            >
                              <span className="material-symbols-outlined text-lg">check_circle</span>
                              <span className="text-[10px] font-bold font-code uppercase tracking-widest">YES</span>
                            </button>
                            <button 
                              onClick={() => handleSelectOutcome(market.id, "NO")}
                              className={`py-3 flex flex-col items-center justify-center gap-1 border rounded-sm transition-all
                                ${selection.outcome === "NO" 
                                  ? "bg-pro-red text-white border-pro-red shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                                  : `${isDark ? "bg-bg-dark border-border-dark text-text-muted hover:border-pro-red hover:text-pro-red" : "bg-white border-border-gray text-gray-500 hover:border-pro-red hover:text-pro-red"}`
                                }
                              `}
                            >
                              <span className="material-symbols-outlined text-lg">cancel</span>
                              <span className="text-[10px] font-bold font-code uppercase tracking-widest">NO</span>
                            </button>
                            <button 
                              onClick={() => handleSelectOutcome(market.id, "INVALID")}
                              className={`py-3 flex flex-col items-center justify-center gap-1 border rounded-sm transition-all
                                ${selection.outcome === "INVALID" 
                                  ? "bg-amber-500 text-white border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                                  : `${isDark ? "bg-bg-dark border-border-dark text-text-muted hover:border-amber-500 hover:text-amber-500" : "bg-white border-border-gray text-gray-500 hover:border-amber-500 hover:text-amber-500"}`
                                }
                              `}
                            >
                              <span className="material-symbols-outlined text-lg">error</span>
                              <span className="text-[10px] font-bold font-code uppercase tracking-widest">INVALID</span>
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className={`text-[10px] font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-500"}`}>Reason (optional)</label>
                            <input 
                              type="text"
                              placeholder="e.g. BTC was $64,234 at expiry per Pyth oracle"
                              value={selection.reason}
                              onChange={(e) => handleReasonChange(market.id, e.target.value)}
                              className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-2.5 text-xs font-sans focus:ring-1 focus:ring-cyber-blue outline-none rounded-sm placeholder:${isDark ? "text-text-muted/40" : "text-gray-400"}`}
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8">
                          <button 
                            onClick={() => handleResolve(market.id)}
                            disabled={!selection.outcome || submitState === "loading"}
                            className={`w-full py-4 rounded-sm font-bold font-code text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2
                              ${(!selection.outcome || submitState === "loading")
                                ? `${isDark ? "bg-border-dark text-text-muted cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`
                                : selection.outcome === "YES" ? "bg-pro-green text-white hover:bg-pro-green/90 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                : selection.outcome === "NO" ? "bg-pro-red text-white hover:bg-pro-red/90 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                : "bg-amber-500 text-white hover:bg-amber-500/90 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                              }
                            `}
                          >
                            {submitState === "loading" ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Resolving...
                              </>
                            ) : selection.outcome ? (
                              <>Confirm Resolution: {selection.outcome} →</>
                            ) : (
                              <>Select an outcome above</>
                            )}
                          </button>
                          
                          {submitState === "error" && (
                            <p className="mt-3 text-[10px] text-pro-red font-code text-center uppercase font-bold">
                              Error: {submitError}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Already Resolved Section */}
              <div className="pt-8 border-t border-border-dark/30">
                <button 
                  onClick={() => setResolvedExpanded(!resolvedExpanded)}
                  className={`w-full flex items-center justify-between p-4 border rounded-sm transition-colors ${isDark ? "bg-card-dark border-border-dark hover:bg-border-dark/20" : "bg-white border-border-gray hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-pro-green">history</span>
                    <span className={`text-xs font-bold font-code uppercase tracking-widest ${isDark ? "text-text-light" : "text-charcoal"}`}>
                      Recently Resolved ({recentlyResolved.length})
                    </span>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${resolvedExpanded ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>

                {resolvedExpanded && (
                  <div className={`mt-2 border rounded-sm overflow-hidden ${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"}`}>
                    {recentlyResolved.length === 0 ? (
                      <div className={`p-8 text-center text-[10px] font-code uppercase ${isDark ? "text-text-muted" : "text-gray-400"}`}>
                        No markets resolved in this session.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b ${isDark ? "border-border-dark bg-bg-dark/50" : "border-border-gray bg-gray-50"}`}>
                              <th className={`px-4 py-3 text-[10px] font-bold font-code uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>Market</th>
                              <th className={`px-4 py-3 text-[10px] font-bold font-code uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>Outcome</th>
                              <th className={`px-4 py-3 text-[10px] font-bold font-code uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>Resolved At</th>
                              <th className={`px-4 py-3 text-[10px] font-bold font-code uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>Volume</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? "divide-border-dark" : "divide-border-gray"}`}>
                            {recentlyResolved.map(m => (
                              <tr key={m.id} className={`${isDark ? "hover:bg-border-dark/10" : "hover:bg-gray-50"} transition-colors`}>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-bold truncate max-w-[200px] ${isDark ? "text-text-light" : "text-charcoal"}`}>{m.question}</span>
                                    <span className={`text-[9px] font-code ${isDark ? "text-text-muted" : "text-gray-400"}`}>{m.id}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase rounded-sm ${
                                    m.outcome === "YES" ? "bg-pro-green/10 text-pro-green border-pro-green/30" :
                                    m.outcome === "NO" ? "bg-pro-red/10 text-pro-red border-pro-red/30" :
                                    "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  }`}>
                                    {m.outcome} {m.outcome === "YES" ? "✅" : m.outcome === "NO" ? "❌" : "⚠️"}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-500"}`}>
                                  Today {new Date(m.resolvedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className={`px-4 py-3 text-[10px] font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"}`}>
                                  ${m.volume.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          <footer className={`h-10 border-t ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-white"} px-8 flex items-center justify-between z-20`}>
            <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase tracking-widest`}>
              HydraMarket // Admin_Terminal // Resolve_Market_Module
            </div>
            <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>
              {new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
