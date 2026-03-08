import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const UserDashboard = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("24H");
  const [trades, setTrades] = useState<any[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("admin-theme");
    return (saved as "light" | "dark") || "dark";
  });

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

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTrades([
        { id: 'BTC', asset: 'BTC_STP_30k', question: 'WILL BTC EXCEED $30,000 BEFORE Q3 TERMINATION?', stake: 100.00, position: 'LONG // YES', pnl: 24.50, status: 'OPEN' },
        { id: 'ETH', asset: 'ETH_MERGE_2', question: 'NETWORK HASHRATE TARGET VS ACTUAL DEVIATION > 5%?', stake: 50.00, position: 'SHORT // NO', pnl: 11.00, status: 'WON' },
        { id: 'TSL', asset: 'TSLA_EPS_H2', question: 'AUTOPILOT V12 RELEASE DATE TO PRECED NOV_30?', stake: 135.50, position: 'LONG // YES', pnl: -1.25, status: 'LOST' }
      ]);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const isDark = theme === "dark";

  return (
    <div className={`
      ${isDark ? "bg-bg-dark text-text-light" : "bg-light-bg text-charcoal"}
      font-mono antialiased overflow-hidden h-screen flex flex-col relative selection:bg-cyber-blue selection:text-white transition-colors duration-300
    `}>
      {/* System Status Bar */}
      <div className={`h-8 w-full ${isDark ? "bg-card-dark border-border-dark" : "bg-light-gray border-border-gray"} border-b flex items-center justify-between px-4 z-50`}>
        <div className={`flex items-center gap-2 text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase tracking-wider`}>
          <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse shadow-[0_0_8px_#10B981]"></span>
          System_Status: ONLINE
        </div>
        <div className={`hidden sm:block text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code`}>
          USER_NODE: HYDRA_AWS_WEST_02
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-bg-dark" : "bg-light-bg"} relative overflow-hidden`}>
          {/* Grid Background */}
          <div className={`absolute inset-0 ${isDark ? "grid-dark" : "grid-light"} grid-bg pointer-events-none ${isDark ? "opacity-100" : "opacity-30"}`}></div>

          {/* Header */}
          <header className={`h-16 flex items-center justify-between px-4 md:px-8 border-b ${isDark ? "border-border-dark bg-bg-dark/50" : "border-border-gray bg-white/50"} backdrop-blur-md sticky top-0 z-30`}>
            <div className="flex items-center gap-4">
              <button 
                className={`lg:hidden ${isDark ? "text-text-muted" : "text-gray-500"} hover:text-cyber-blue transition-colors`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className={`text-xs md:text-sm font-bold tracking-widest flex items-center uppercase ${isDark ? "text-text-light" : "text-charcoal"}`}>
                USER_COMMAND // DASHBOARD
                <span className="inline-block w-2 h-4 bg-cyber-blue ml-1 animate-pulse"></span>
              </h1>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <div className={`relative hidden md:flex items-center group ${isDark ? "bg-card-dark border-border-dark focus-within:border-cyber-blue" : "bg-light-gray border-border-gray focus-within:border-cyber-blue"} px-3 py-1.5 rounded border transition-colors`}>
                <span className="material-symbols-outlined text-slate-500 text-lg mr-2">search</span>
                <input 
                  className={`bg-transparent border-none text-xs font-mono ${isDark ? "text-text-light placeholder-text-muted" : "text-charcoal placeholder-gray-400"} w-64 focus:ring-0 focus:outline-none uppercase`} 
                  placeholder="COMMAND_QUERY..." 
                  type="text" 
                />
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={toggleTheme}
                  className={`${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-400 hover:text-cyber-blue"} transition-colors`}
                >
                  <span className="material-symbols-outlined">
                    {isDark ? "light_mode" : "dark_mode"}
                  </span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-cyber-blue/40 bg-cyber-blue/5 text-cyber-blue text-[10px] font-bold tracking-widest uppercase hover:bg-cyber-blue hover:text-white transition-all">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span className="hidden sm:inline">DEPLOY_ORDER</span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto relative z-10">
            {/* Data Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`flex flex-col gap-2 rounded border ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} p-5 hover:border-cyber-blue/50 transition-colors group shadow-sm`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>WALLET_BALANCE</p>
                  <span className={`material-symbols-outlined text-sm ${isDark ? "text-slate-600" : "text-gray-300"} group-hover:text-cyber-blue`}>database</span>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-cyber-blue/10 animate-pulse rounded-sm mt-1"></div>
                ) : (
                  <>
                    <p className={`text-2xl font-mono font-bold leading-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>$285.50</p>
                    <p className="text-cyber-blue text-[10px] font-mono leading-normal">+0.00% [SYNC_OK]</p>
                  </>
                )}
              </div>
              <div className={`flex flex-col gap-2 rounded border ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} p-5 hover:border-cyber-blue/50 transition-colors group shadow-sm`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>ACTIVE_POSITIONS</p>
                  <span className={`material-symbols-outlined text-sm ${isDark ? "text-slate-600" : "text-gray-300"} group-hover:text-cyber-blue`}>layers</span>
                </div>
                {loading ? (
                  <div className="h-8 w-12 bg-cyber-blue/10 animate-pulse rounded-sm mt-1"></div>
                ) : (
                  <>
                    <p className={`text-2xl font-mono font-bold leading-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>3</p>
                    <p className="text-cyber-blue text-[10px] font-mono leading-normal">RUNNING_THREADS</p>
                  </>
                )}
              </div>
              <div 
                onClick={() => navigate('/payouts')}
                className={`flex flex-col gap-2 rounded border ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} p-5 hover:border-cyber-blue/50 transition-colors group shadow-sm cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>PENDING_PAYOUTS</p>
                  <span className={`material-symbols-outlined text-sm ${isDark ? "text-slate-600" : "text-gray-300"} group-hover:text-cyber-blue`}>hourglass_empty</span>
                </div>
                {loading ? (
                  <div className="h-8 w-20 bg-cyber-blue/10 animate-pulse rounded-sm mt-1"></div>
                ) : (
                  <>
                    <p className={`text-2xl font-mono font-bold leading-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>$0.00</p>
                    <p className={`text-[10px] font-mono leading-normal ${isDark ? "text-text-muted" : "text-gray-400"} flex items-center justify-between`}>
                      NULL_QUEUE
                      <span className="text-cyber-blue hover:underline">[→ CLAIM]</span>
                    </p>
                  </>
                )}
              </div>
              <div className={`flex flex-col gap-2 rounded border ${isDark ? "border-cyber-blue/20 bg-card-dark" : "border-cyber-blue/20 bg-white"} p-5 shadow-[0_0_10px_rgba(13,204,242,0.1)] group`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>TOTAL_P&L</p>
                  <span className="material-symbols-outlined text-cyber-blue text-sm">show_chart</span>
                </div>
                {loading ? (
                  <div className="h-8 w-28 bg-cyber-blue/10 animate-pulse rounded-sm mt-1"></div>
                ) : (
                  <>
                    <p className={`text-2xl font-mono font-bold leading-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>+$35.50</p>
                    <p className="text-pro-green text-[10px] font-mono leading-normal">+12.4% [GAIN_DETECTED]</p>
                  </>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => navigate('/portfolio')}
                className={`flex items-center justify-center gap-3 py-3 border ${isDark ? "border-border-dark bg-card-dark hover:border-cyber-blue/50 text-text-muted hover:text-cyber-blue" : "border-border-gray bg-white hover:border-cyber-blue/50 text-gray-500 hover:text-cyber-blue"} text-[10px] font-bold uppercase tracking-[0.2em] transition-all group`}
              >
                <span className="text-cyber-blue/40 group-hover:text-cyber-blue transition-colors">[&gt;]</span>
                DEPOSIT_FUNDS
              </button>
              <button 
                onClick={() => navigate('/portfolio')}
                className={`flex items-center justify-center gap-3 py-3 border ${isDark ? "border-border-dark bg-card-dark hover:border-cyber-blue/50 text-text-muted hover:text-cyber-blue" : "border-border-gray bg-white hover:border-cyber-blue/50 text-gray-500 hover:text-cyber-blue"} text-[10px] font-bold uppercase tracking-[0.2em] transition-all group`}
              >
                <span className="text-cyber-blue/40 group-hover:text-cyber-blue transition-colors">[&gt;]</span>
                WITHDRAW_FUNDS
              </button>
              <button 
                onClick={() => navigate('/markets-terminal')}
                className={`flex items-center justify-center gap-3 py-3 border ${isDark ? "border-border-dark bg-card-dark hover:border-cyber-blue/50 text-text-muted hover:text-cyber-blue" : "border-border-gray bg-white hover:border-cyber-blue/50 text-gray-500 hover:text-cyber-blue"} text-[10px] font-bold uppercase tracking-[0.2em] transition-all group`}
              >
                <span className="text-cyber-blue/40 group-hover:text-cyber-blue transition-colors">[&gt;]</span>
                BROWSE_MARKETS
              </button>
            </div>

            {/* Performance Chart Section */}
            <div className={`border rounded ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} p-6 overflow-hidden shadow-sm`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="space-y-1">
                  <h2 className={`text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${isDark ? "text-text-light" : "text-charcoal"}`}>
                    <span className="material-symbols-outlined text-cyber-blue text-lg">insights</span>
                    PERFORMANCE_CURVE
                  </h2>
                  <p className={`text-[10px] font-mono uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>Telemetry stream active / last 24h</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className={`text-xl font-mono font-bold ${isDark ? "text-text-light" : "text-charcoal"}`}>$321.00</p>
                    <p className="text-pro-green text-[10px] font-mono">+11.03% (LAST_24H)</p>
                  </div>
                  <div className={`h-10 w-[1px] ${isDark ? "bg-border-dark" : "bg-gray-200"}`}></div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTimeFilter("1H")}
                      className={`px-3 py-1 rounded-sm border transition-all text-[9px] font-bold uppercase tracking-widest ${timeFilter === "1H" ? "border-cyber-blue text-cyber-blue bg-cyber-blue/10 shadow-[0_0_10px_rgba(13,204,242,0.2)]" : (isDark ? "border-border-dark bg-white/5 text-text-muted/40 hover:text-text-muted" : "border-border-gray bg-gray-50 text-gray-400 hover:text-gray-600")}`}
                    >
                      1H
                    </button>
                    <button 
                      onClick={() => setTimeFilter("24H")}
                      className={`px-3 py-1 rounded-sm border transition-all text-[9px] font-bold uppercase tracking-widest ${timeFilter === "24H" ? "border-cyber-blue text-cyber-blue bg-cyber-blue/10 shadow-[0_0_10px_rgba(13,204,242,0.2)]" : (isDark ? "border-border-dark bg-white/5 text-text-muted/40 hover:text-text-muted" : "border-border-gray bg-gray-50 text-gray-400 hover:text-gray-600")}`}
                    >
                      24H
                    </button>
                    <button 
                      onClick={() => setTimeFilter("7D")}
                      className={`px-3 py-1 rounded-sm border transition-all text-[9px] font-bold uppercase tracking-widest ${timeFilter === "7D" ? "border-cyber-blue text-cyber-blue bg-cyber-blue/10 shadow-[0_0_10px_rgba(13,204,242,0.2)]" : (isDark ? "border-border-dark bg-white/5 text-text-muted/40 hover:text-text-muted" : "border-border-gray bg-gray-50 text-gray-400 hover:text-gray-600")}`}
                    >
                      7D
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-full h-64 flex flex-col relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0dccf2" stopOpacity="0.2"></stop>
                      <stop offset="100%" stopColor="#0dccf2" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,50 L1000,300 L0,300 Z" fill="url(#chartGradient)"></path>
                  <path d="M0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,50" fill="none" stroke="#0dccf2" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                  {/* Vertical Grid Lines */}
                  <line stroke={isDark ? "#2A2A3A" : "#F1F5F9"} strokeDasharray="4" strokeWidth="1" x1="200" x2="200" y1="0" y2="300"></line>
                  <line stroke={isDark ? "#2A2A3A" : "#F1F5F9"} strokeDasharray="4" strokeWidth="1" x1="400" x2="400" y1="0" y2="300"></line>
                  <line stroke={isDark ? "#2A2A3A" : "#F1F5F9"} strokeDasharray="4" strokeWidth="1" x1="600" x2="600" y1="0" y2="300"></line>
                  <line stroke={isDark ? "#2A2A3A" : "#F1F5F9"} strokeDasharray="4" strokeWidth="1" x1="800" x2="800" y1="0" y2="300"></line>
                </svg>
                <div className="flex justify-between mt-4 px-2">
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"}`}>00:00</span>
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"}`}>06:00</span>
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"}`}>12:00</span>
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"}`}>18:00</span>
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"}`}>23:59</span>
                </div>
              </div>
            </div>

            {/* Active Trades Table */}
            <div className="space-y-4">
              <h2 className={`text-[18px] font-bold leading-tight tracking-widest flex items-center gap-2 px-1 ${isDark ? "text-text-light" : "text-charcoal"}`}>
                <span className="text-cyber-blue">&gt;</span> YOUR_ACTIVE_TRADES
              </h2>
              <div className={`border rounded ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} overflow-hidden shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`${isDark ? "bg-white/5 border-border-dark" : "bg-gray-50 border-gray-100"} border-b`}>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>ASSET_ID</th>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>QUESTION_QUERY</th>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>STAKE</th>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>POSITION</th>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-right ${isDark ? "text-text-muted" : "text-gray-500"}`}>CURRENT_P&L</th>
                        <th className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-right ${isDark ? "text-text-muted" : "text-gray-500"}`}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-border-dark" : "divide-gray-100"} font-mono`}>
                      {loading ? (
                        Array(3).fill(0).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={6} className="py-5 px-6">
                              <div className={`h-4 w-full ${isDark ? "bg-white/5" : "bg-gray-100"} rounded`}></div>
                            </td>
                          </tr>
                        ))
                      ) : trades.length > 0 ? (
                        trades.map((trade) => (
                          <tr key={trade.id} className={`hover:${isDark ? "bg-cyber-blue/5" : "bg-gray-50"} transition-colors cursor-pointer`}>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`size-6 rounded flex items-center justify-center text-[10px] font-bold border ${
                                  trade.id === 'BTC' ? 'bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20' : 
                                  trade.id === 'ETH' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                  'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                }`}>{trade.id}</div>
                                <span className={`text-xs ${isDark ? "text-text-light" : "text-charcoal"}`}>{trade.asset}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-600"} max-w-md truncate`}>{trade.question}</p>
                            </td>
                            <td className={`py-5 px-6 text-xs ${isDark ? "text-text-light" : "text-charcoal"}`}>${trade.stake.toFixed(2)}</td>
                            <td className="py-5 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                trade.position.includes('YES') ? 'border-pro-green/50 text-pro-green bg-pro-green/10' : 'border-pro-red/50 text-pro-red bg-pro-red/10'
                              }`}>{trade.position}</span>
                            </td>
                            <td className={`py-5 px-6 text-right font-bold text-xs ${trade.pnl >= 0 ? 'text-pro-green' : 'text-pro-red'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </td>
                            <td className="py-5 px-6 text-right">
                              {trade.status === 'OPEN' ? (
                                <button className="text-[9px] font-bold text-cyber-blue/60 hover:text-cyber-blue uppercase tracking-widest transition-colors">
                                  [VIEW_MARKET]
                                </button>
                              ) : trade.status === 'WON' ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); navigate('/payouts'); }}
                                  className="px-2 py-1 bg-amber-500 text-black text-[9px] font-bold uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                >
                                  [EXECUTE_CLAIM]
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold text-pro-red/40 uppercase tracking-widest">
                                  [EXPIRED]
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 px-6 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? "text-text-muted/40" : "text-gray-300"}`}>&gt; NO_ACTIVE_EXPOSURE — DEPLOY_TRADES_TO_INITIALIZE</span>
                              <span className={`text-[10px] uppercase tracking-widest ${isDark ? "text-text-muted/20" : "text-gray-200"}`}>Active market positions will populate here</span>
                              <button 
                                onClick={() => navigate('/markets-terminal')}
                                className="mt-4 px-4 py-2 border border-cyber-blue/30 text-cyber-blue text-[10px] font-bold uppercase tracking-widest hover:bg-cyber-blue/10 transition-all"
                              >
                                [→ BROWSE_MARKETS]
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={`p-4 ${isDark ? "bg-white/5 border-border-dark" : "bg-gray-50 border-gray-100"} border-t flex justify-center`}>
                  <button className={`text-[10px] font-bold ${isDark ? "text-text-muted" : "text-gray-500"} hover:text-cyber-blue tracking-widest flex items-center gap-2 transition-colors uppercase`}>
                    FETCH_FULL_HISTORY
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Footer */}
          <footer className={`mt-auto p-4 border-t ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-white"} flex flex-col md:flex-row items-center justify-between text-[10px] font-mono ${isDark ? "text-slate-600" : "text-gray-400"} gap-4`}>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-pro-green shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                <span className="uppercase">NETWORK_STATUS: OPTIMAL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">dns</span>
                <span className="uppercase">NODE: HYDRA_AWS_WEST_02</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <span>LATENCY: 24MS</span>
              <span className={isDark ? "text-slate-500" : "text-gray-400"}>USER_SESSION_ID: 0x82...F92A</span>
              <span className="text-cyber-blue font-bold">2026-03-03 20:17:36 UTC</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
