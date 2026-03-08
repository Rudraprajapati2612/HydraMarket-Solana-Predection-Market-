import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { QRCodeSVG } from "qrcode.react";

export const Portfolio = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"PORTFOLIO" | "DEPOSIT" | "WITHDRAW">("PORTFOLIO");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("admin-theme");
    return (saved as "light" | "dark") || "dark";
  });

  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [isWithdrawalConfirmOpen, setIsWithdrawalConfirmOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  const isAddressValid = (addr: string) => {
    // Basic Solana address validation (base58, 32-44 chars)
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  };

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

  return (
    <div className={`
      ${isDark ? "bg-bg-dark text-text-light" : "bg-light-bg text-charcoal"}
      font-mono antialiased overflow-hidden h-screen flex flex-col relative selection:bg-cyber-blue selection:text-white transition-colors duration-300
    `}>
      {/* System Status Bar */}
      <div className={`h-8 w-full ${isDark ? "bg-card-dark border-border-dark" : "bg-light-gray border-border-gray"} border-b flex items-center justify-between px-4 z-50`}>
        <div className={`flex items-center gap-2 text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase tracking-wider`}>
          <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse"></span>
          System_Status: ONLINE
        </div>
        <div className={`text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code`}>
          TERMINAL_ID: HM-ADMIN-NODE-01
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        {/* Main Content */}
        <main className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-bg-dark" : "bg-light-bg"} relative overflow-hidden`}>
          {/* Grid Background */}
          <div className={`absolute inset-0 ${isDark ? "grid-dark" : "grid-light"} grid-bg pointer-events-none ${isDark ? "opacity-100" : "opacity-30"}`}></div>
          
          <header className={`h-20 border-b ${isDark ? "border-border-dark bg-bg-dark/80" : "border-border-gray bg-white/80"} backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8`}>
            <div className="flex items-center gap-4">
              <button 
                className={`lg:hidden ${isDark ? "text-text-muted" : "text-gray-500"} hover:text-cyber-blue transition-colors`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className={`text-xl md:text-3xl font-serif ${isDark ? "text-white" : "text-charcoal"} tracking-tight uppercase`}>
                Portfolio & Wallet
              </h1>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-right hidden sm:block">
                <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>Total_Balance</div>
                <div className="text-lg md:text-xl font-code text-cyber-blue tracking-tighter">
                  $1,240,582.44 <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} ml-1`}>USDC</span>
                </div>
              </div>
              <div className={`h-10 w-px ${isDark ? "bg-border-dark" : "bg-border-gray"}`}></div>
              <button className={`flex items-center gap-2 px-3 md:px-4 py-2 ${isDark ? "bg-card-dark border-border-dark text-text-light hover:border-cyber-blue" : "bg-white border-border-gray text-charcoal hover:border-cyber-blue"} font-code text-xs border transition-all`}>
                <span className="material-symbols-outlined text-sm">settings</span>
                <span className="hidden sm:inline">[CONFIG]</span>
              </button>
              <button 
                onClick={toggleTheme}
                className={`${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-400 hover:text-cyber-blue"} transition-colors`}
              >
                <span className="material-symbols-outlined">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
              </button>
            </div>
          </header>

          {/* Tabs */}
          <div className={`px-4 md:px-8 border-b ${isDark ? "border-border-dark bg-bg-dark/50" : "border-border-gray bg-white/50"} z-20`}>
            <div className="flex items-center overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab("PORTFOLIO")}
                className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold font-code border-b-2 transition-all whitespace-nowrap ${activeTab === "PORTFOLIO" ? "border-cyber-blue text-cyber-blue" : "border-transparent text-text-muted hover:text-near-white"}`}
              >
                PORTFOLIO_OVERVIEW
              </button>
              <button 
                onClick={() => setActiveTab("DEPOSIT")}
                className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold font-code border-b-2 transition-all whitespace-nowrap ${activeTab === "DEPOSIT" ? "border-cyber-blue text-cyber-blue" : "border-transparent text-text-muted hover:text-near-white"}`}
              >
                DEPOSIT_FUNDS
              </button>
              <button 
                onClick={() => setActiveTab("WITHDRAW")}
                className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold font-code border-b-2 transition-all whitespace-nowrap ${activeTab === "WITHDRAW" ? "border-cyber-blue text-cyber-blue" : "border-transparent text-text-muted hover:text-near-white"}`}
              >
                WITHDRAW_FUNDS
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {activeTab === "PORTFOLIO" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 group relative`}>
                      <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-4 tracking-widest flex items-center justify-between`}>
                        TOTAL_BALANCE
                        <span className="material-symbols-outlined text-sm opacity-30">account_balance</span>
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <div className={`text-3xl font-code ${isDark ? "text-text-light" : "text-charcoal"} font-bold tracking-tighter`}>$160,000.00</div>
                        <div className="w-24 h-8 flex items-end gap-[2px]">
                          <div className="bg-cyber-blue/20 w-1.5 h-1/2"></div>
                          <div className="bg-cyber-blue/20 w-1.5 h-2/3"></div>
                          <div className="bg-cyber-blue/40 w-1.5 h-1/3"></div>
                          <div className="bg-cyber-blue/40 w-1.5 h-3/4"></div>
                          <div className="bg-cyber-blue/60 w-1.5 h-1/2"></div>
                          <div className="bg-cyber-blue w-1.5 h-full"></div>
                        </div>
                      </div>
                      <div className={`mt-4 flex items-center justify-between text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code uppercase`}>
                        <span>BALANCE_CHANGE_7D</span>
                        <span className="text-pro-green">+4.2%</span>
                      </div>
                    </div>

                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 group relative`}>
                      <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-4 tracking-widest flex items-center justify-between`}>
                        AVAILABLE
                        <span className="material-symbols-outlined text-sm opacity-30">check_circle</span>
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <div className="text-3xl font-code text-pro-green font-bold tracking-tighter">$124,500.00</div>
                        <div className="w-24 h-8 flex items-end gap-[2px]">
                          <div className="bg-pro-green/20 w-1.5 h-1/3"></div>
                          <div className="bg-pro-green/20 w-1.5 h-1/2"></div>
                          <div className="bg-pro-green/40 w-1.5 h-2/3"></div>
                          <div className="bg-pro-green/40 w-1.5 h-1/2"></div>
                          <div className="bg-pro-green/60 w-1.5 h-3/4"></div>
                          <div className="bg-pro-green w-1.5 h-2/3"></div>
                        </div>
                      </div>
                      <div className={`mt-4 flex items-center justify-between text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code uppercase`}>
                        <span>AVAILABLE_RATIO</span>
                        <span>77.8%</span>
                      </div>
                    </div>

                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 group relative`}>
                      <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-4 tracking-widest flex items-center justify-between`}>
                        RESERVED
                        <span className="material-symbols-outlined text-sm opacity-30">lock</span>
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <div className="text-3xl font-code text-warning-amber font-bold tracking-tighter">$35,500.00</div>
                        <div className="w-24 h-8 flex items-end gap-[2px]">
                          <div className="bg-warning-amber/20 w-1.5 h-3/4"></div>
                          <div className="bg-warning-amber/20 w-1.5 h-1/2"></div>
                          <div className="bg-warning-amber/40 w-1.5 h-1/3"></div>
                          <div className="bg-warning-amber/40 w-1.5 h-2/3"></div>
                          <div className="bg-warning-amber/60 w-1.5 h-1/2"></div>
                          <div className="bg-warning-amber w-1.5 h-1/3"></div>
                        </div>
                      </div>
                      <div className={`mt-4 flex items-center justify-between text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code uppercase`}>
                        <span>LOCKED_STAKE</span>
                        <span>22.2%</span>
                      </div>
                    </div>

                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 group relative border-warning-amber/30 animate-pulse-subtle`}>
                      <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-4 tracking-widest flex items-center justify-between`}>
                        CLAIMABLE_PAYOUTS
                        <span className="material-symbols-outlined text-sm text-warning-amber">redeem</span>
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <div className="text-3xl font-code text-warning-amber font-bold tracking-tighter">$1,240.00</div>
                        <div className="w-24 h-8 flex items-end gap-[2px]">
                          <div className="bg-warning-amber/20 w-1.5 h-1/4"></div>
                          <div className="bg-warning-amber/40 w-1.5 h-1/2"></div>
                          <div className="bg-warning-amber/60 w-1.5 h-3/4"></div>
                          <div className="bg-warning-amber w-1.5 h-full"></div>
                        </div>
                      </div>
                      <div className={`mt-4 flex items-center justify-between text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code uppercase`}>
                        <span>READY_TO_CLAIM</span>
                        <span className="text-warning-amber">3 MARKETS</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-3 py-2">
                    <button 
                      onClick={() => setActiveTab("DEPOSIT")}
                      className="px-6 py-2.5 bg-cyber-blue text-bg-dark font-code text-xs font-bold border border-cyber-blue hover:bg-transparent hover:text-cyber-blue transition-all uppercase"
                    >
                      [Deposit USDC]
                    </button>
                    <button 
                      onClick={() => setActiveTab("WITHDRAW")}
                      className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-text-light border-border-dark" : "bg-white text-charcoal border-border-gray"} font-code text-xs border hover:border-cyber-blue transition-all uppercase`}
                    >
                      [Withdraw]
                    </button>
                    <button 
                      onClick={() => navigate("/markets-terminal")}
                      className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-text-light border-border-dark" : "bg-white text-charcoal border-border-gray"} font-code text-xs border hover:border-cyber-blue transition-all uppercase`}
                    >
                      [Trade Markets]
                    </button>
                    <button 
                      onClick={() => navigate("/payouts")}
                      className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-warning-amber border-warning-amber/30" : "bg-white text-warning-amber border-warning-amber/30"} font-code text-xs border hover:bg-warning-amber hover:text-bg-dark transition-all uppercase flex items-center gap-2`}
                    >
                      <span className="material-symbols-outlined text-xs">redeem</span>
                      [Claim Payouts]
                    </button>
                    <button className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-text-light border-border-dark" : "bg-white text-charcoal border-border-gray"} font-code text-xs border hover:border-cyber-blue transition-all uppercase flex items-center gap-2`}>
                      <span className="material-symbols-outlined text-xs">sync</span>
                      [Refresh Balance]
                    </button>
                  </div>

                  {/* Allocation Chart */}
                  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-8`}>
                    <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="relative w-48 h-48 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle className={`${isDark ? "text-border-dark" : "text-border-gray"}`} cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                          <circle className="text-pro-green" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="195.5 55.8" strokeWidth="8"></circle>
                          <circle className="text-warning-amber" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="55.8 195.5" strokeDashoffset="-195.5" strokeWidth="8"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>Ratio</span>
                          <span className={`text-xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>3.5:1</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-6">
                        <h2 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>Balance_Allocation</h2>
                        <div className="space-y-4">
                          <div className={`flex items-center justify-between border-b ${isDark ? "border-border-dark/30" : "border-border-gray/30"} pb-2`}>
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 bg-pro-green"></span>
                              <span className={`text-[11px] font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>AVAILABLE_FUNDS</span>
                            </div>
                            <span className="text-[11px] font-code text-pro-green">77.8%</span>
                          </div>
                          <div className={`flex items-center justify-between border-b ${isDark ? "border-border-dark/30" : "border-border-gray/30"} pb-2`}>
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 bg-warning-amber"></span>
                              <span className={`text-[11px] font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>RESERVED_FUNDS</span>
                            </div>
                            <span className="text-[11px] font-code text-warning-amber">22.2%</span>
                          </div>
                          <div className="pt-4">
                            <p className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code leading-relaxed`}>
                              System metrics indicate high liquidity availability. Reserved funds are currently allocated to pending limit orders and active margin maintenance.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Positions Table */}
                  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-8`}>
                    <h2 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest mb-6`}>YOUR_POSITIONS</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-code text-[11px]">
                        <thead>
                          <tr className={`border-b ${isDark ? "border-border-dark" : "border-border-gray"} pb-4`}>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Market_ID</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Question</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Tokens</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Side</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Payout</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase text-right`}>Action</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? "divide-border-dark/30" : "divide-border-gray/30"}`}>
                          {[
                            { id: 'BTC-100K-DEC', q: 'Will BTC exceed $100k by Dec 31?', t: '2,500', s: 'YES', p: '$2,500' },
                            { id: 'SOL-200-OCT', q: 'Will SOL reach $200 in October?', t: '1,200', s: 'NO', p: '$1,200' },
                          ].map((pos, i) => (
                            <tr key={i} className={`${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                              <td className={`py-4 ${isDark ? "text-cyber-blue" : "text-cyber-blue"} font-bold`}>{pos.id}</td>
                              <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>{pos.q}</td>
                              <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>{pos.t}</td>
                              <td className="py-4">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pos.s === 'YES' ? "bg-pro-green/10 text-pro-green border border-pro-green/30" : "bg-rose-500/10 text-rose-500 border border-rose-500/30"}`}>
                                  {pos.s}
                                </span>
                              </td>
                              <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>{pos.p}</td>
                              <td className="py-4 text-right">
                                <button onClick={() => navigate('/markets-terminal')} className="text-cyber-blue hover:underline uppercase text-[9px] font-bold">[VIEW_MARKET]</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Terminal Sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-cyber-blue">token</span>
                        <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>ACTIVE_POSITIONS</h3>
                      </div>
                      <div className={`border ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-light-gray"} h-[240px] p-6 font-code text-[11px] relative overflow-hidden group`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-blue/5 pointer-events-none"></div>
                        <div className={`${isDark ? "text-text-muted" : "text-gray-400"} mb-1`}>hydra_os@admin:~/portfolio$ query --active-positions</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>Searching local nodes...</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>[####################] 100%</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"} mt-2`}>RESULT: 0 active exposure found.</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"} mt-4 flex items-center gap-1`}>
                          <span className="text-cyber-blue">_</span> <span className="terminal-cursor"></span>
                        </div>
                        <div className={`absolute bottom-4 right-4 text-[9px] ${isDark ? "text-text-muted/30" : "text-gray-300"} uppercase`}>BUFFER_EMPTY</div>
                      </div>
                    </section>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-cyber-blue">history</span>
                        <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>RECENT_ACTIVITY</h3>
                      </div>
                      <div className={`border ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-light-gray"} h-[240px] p-6 font-code text-[11px] relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-blue/5 pointer-events-none"></div>
                        <div className={`${isDark ? "text-text-muted" : "text-gray-400"} mb-1`}>hydra_os@admin:~/logs$ tail -f transaction_activity.log</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>Connecting to ledger...</div>
                        <div className="text-pro-green">ESTABLISHED_CONNECTION: NODE_NORTH_02</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"} mt-4 flex items-center gap-1`}>
                          <span className="text-cyber-blue">_</span> <span className="terminal-cursor"></span>
                        </div>
                        <div className={`absolute bottom-4 right-4 text-[9px] ${isDark ? "text-text-muted/30" : "text-gray-300"} uppercase`}>LISTENING_FOR_EVENTS</div>
                      </div>
                    </section>
                  </div>

                  {/* Loading Demo */}
                  <section className="space-y-4 pb-8">
                    <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>SYSTEM_METRICS_SKELETON</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-6`}>
                        <div className="w-24 h-3 skeleton rounded-sm mb-4"></div>
                        <div className="w-40 h-8 skeleton rounded-sm mb-4"></div>
                        <div className="w-full h-1 skeleton rounded-sm"></div>
                      </div>
                      <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-6`}>
                        <div className="w-24 h-3 skeleton rounded-sm mb-4"></div>
                        <div className="w-40 h-8 skeleton rounded-sm mb-4"></div>
                        <div className="w-full h-1 skeleton rounded-sm"></div>
                      </div>
                      <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-6`}>
                        <div className="w-24 h-3 skeleton rounded-sm mb-4"></div>
                        <div className="w-40 h-8 skeleton rounded-sm mb-4"></div>
                        <div className="w-full h-1 skeleton rounded-sm"></div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "DEPOSIT" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="lg:col-span-7 space-y-6">
                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm`}>
                      <h3 className={`text-lg font-bold ${isDark ? "text-text-light" : "text-charcoal"} mb-6 flex items-center gap-2 uppercase`}>
                        <span className="text-cyber-blue text-xl font-code">01.</span> How to Deposit USDC
                      </h3>
                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border border-cyber-blue text-cyber-blue flex items-center justify-center text-[10px] font-bold">1</div>
                          <div className="flex-1">
                            <p className={`text-sm ${isDark ? "text-text-light" : "text-charcoal"} font-medium mb-1`}>Select Network</p>
                            <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} leading-relaxed`}>
                              Ensure you are sending USDC via the <span className="text-cyber-blue">Solana (SPL)</span> network. Sending assets via other networks may result in permanent loss.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border border-cyber-blue text-cyber-blue flex items-center justify-center text-[10px] font-bold">2</div>
                          <div className="flex-1">
                            <p className={`text-sm ${isDark ? "text-text-light" : "text-charcoal"} font-medium mb-1`}>Copy Deposit Address</p>
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Wallet_Address</label>
                                <div className="flex gap-2">
                                  <div className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} border px-3 py-2 font-code text-[10px] md:text-xs ${isDark ? "text-text-light" : "text-charcoal"} truncate`}>
                                    8xN9zP6kS7mR5vW4qL2tY1jH3nM0bA9cX
                                  </div>
                                  <button className={`px-3 ${isDark ? "bg-card-dark border-border-dark text-cyber-blue hover:bg-cyber-blue hover:text-bg-dark" : "bg-white border-border-gray text-cyber-blue hover:bg-cyber-blue hover:text-white"} border transition-all text-[10px] font-bold font-code`}>
                                    [COPY]
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Memo_ID (REQUIRED)</label>
                                <div className="flex gap-2">
                                  <div className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} border px-3 py-2 font-code text-[10px] md:text-xs ${isDark ? "text-text-light" : "text-charcoal"}`}>
                                    HYDRA-DEP-99421
                                  </div>
                                  <button className={`px-3 ${isDark ? "bg-card-dark border-border-dark text-cyber-blue hover:bg-cyber-blue hover:text-bg-dark" : "bg-white border-border-gray text-cyber-blue hover:bg-cyber-blue hover:text-white"} border transition-all text-[10px] font-bold font-code`}>
                                    [COPY]
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`${isDark ? "bg-warning-yellow/10 border-warning-yellow/30" : "bg-warning-yellow/5 border-warning-yellow/20"} border p-4 flex gap-3`}>
                          <span className="material-symbols-outlined text-warning-yellow text-xl">warning</span>
                          <div className={`text-[11px] text-warning-yellow font-medium leading-relaxed uppercase tracking-tight`}>
                            Warning: The Memo_ID is strictly required for this transaction. Failure to include the memo will cause significant delays in credit processing.
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border border-cyber-blue text-cyber-blue flex items-center justify-center text-[10px] font-bold">3</div>
                          <div className="flex-1">
                            <p className={`text-sm ${isDark ? "text-text-light" : "text-charcoal"} font-medium mb-1`}>Send & Confirm</p>
                            <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} leading-relaxed`}>
                              Initiate the transfer from your wallet. Once the transaction is confirmed on-chain, your balance will update automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm`}>
                      <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest mb-4`}>RECENT_DEPOSITS</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-code text-[10px]">
                          <thead>
                            <tr className={`border-b ${isDark ? "border-border-dark" : "border-border-gray"} pb-2`}>
                              <th className="pb-2 font-normal uppercase">Date</th>
                              <th className="pb-2 font-normal uppercase">Amount</th>
                              <th className="pb-2 font-normal uppercase">Status</th>
                              <th className="pb-2 font-normal uppercase text-right">TX_Hash</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? "divide-border-dark/30" : "divide-border-gray/30"}`}>
                            {[
                              { d: '2024.09.22', a: '1,000.00', s: 'CONFIRMED', h: '3xP...9zL' },
                              { d: '2024.09.20', a: '500.00', s: 'CONFIRMED', h: '8vK...2mQ' },
                            ].map((dep, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-3">{dep.d}</td>
                                <td className="py-3 text-pro-green">${dep.a}</td>
                                <td className="py-3">
                                  <span className="text-pro-green font-bold">{dep.s}</span>
                                </td>
                                <td className="py-3 text-right text-cyber-blue">
                                  <a href="#" className="hover:underline">{dep.h}</a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm aspect-square flex flex-col items-center justify-center text-center`}>
                      <div className={`w-32 h-32 md:w-48 md:h-48 bg-white p-4 rounded-sm mb-6 border-4 border-cyber-blue/20`}>
                        <QRCodeSVG 
                          value="8xN9zP6kS7mR5vW4qL2tY1jH3nM0bA9cX"
                          size={200}
                          level="H"
                          includeMargin={false}
                          className="w-full h-full"
                        />
                      </div>
                      <p className={`text-xs ${isDark ? "text-text-light" : "text-charcoal"} font-code mb-2`}>SCAN_FOR_ADDRESS</p>
                      <p className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} max-w-[200px]`}>Supports all SPL-compatible mobile wallets</p>
                    </div>
                  </div>
                </div>
              )}

                  {activeTab === "WITHDRAW" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={`border-t ${isDark ? "border-border-dark" : "border-border-gray"} pt-4 pb-8`}>
                    <h2 className={`text-xl font-serif ${isDark ? "text-white" : "text-charcoal"} mb-8 uppercase`}>Withdrawal_Interface</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="text-[10px] text-cyber-blue font-code uppercase tracking-widest">Execute_Withdrawal</div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Available_Balance</span>
                            <span className="text-sm font-bold font-code text-pro-green">$124,500.00</span>
                          </div>
                        </div>

                        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsWithdrawalConfirmOpen(true); }}>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Destination_Address</label>
                              {withdrawalAddress && (
                                isAddressValid(withdrawalAddress) 
                                  ? <span className="text-pro-green text-[10px] flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> VALID</span>
                                  : <span className="text-rose-500 text-[10px] flex items-center gap-1"><span className="material-symbols-outlined text-xs">cancel</span> INVALID</span>
                              )}
                            </div>
                            <input 
                              className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} px-4 py-2.5 text-xs font-code focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none transition-all`} 
                              placeholder="Paste Solana wallet address (base58) e.g. 6oktp2QmgQgmxKxzBfgTGD11T1VwmQx8..." 
                              type="text"
                              value={withdrawalAddress}
                              onChange={(e) => setWithdrawalAddress(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Amount (USDC)</label>
                              <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>MAX: 124,500.00</span>
                            </div>
                            <div className="relative">
                              <input 
                                className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} px-4 py-2.5 text-xs font-code focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none transition-all`} 
                                placeholder="0.00" 
                                type="number"
                                value={withdrawalAmount}
                                onChange={(e) => setWithdrawalAmount(e.target.value)}
                              />
                              <button 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-cyber-blue" 
                                type="button"
                                onClick={() => setWithdrawalAmount("124500")}
                              >
                                MAX
                              </button>
                            </div>
                          </div>
                          <div className="pt-4">
                            <button 
                              type="submit"
                              disabled={!isAddressValid(withdrawalAddress) || !withdrawalAmount}
                              className="w-full py-3 bg-cyber-blue text-bg-dark font-code font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                            >
                              Authorize_Transfer
                            </button>
                          </div>
                        </form>
                      </div>
                      <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border rounded-sm overflow-hidden flex flex-col`}>
                        <div className={`p-4 border-b ${isDark ? "border-border-dark" : "border-border-gray"} flex justify-between items-center`}>
                          <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase font-bold`}>Recent_Transfers</span>
                          <span className={`material-symbols-outlined text-sm ${isDark ? "text-text-muted" : "text-gray-400"} cursor-pointer hover:text-cyber-blue`}>refresh</span>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left text-[11px] font-code">
                            <thead>
                              <tr className={`border-b ${isDark ? "border-border-dark bg-bg-dark/40" : "border-border-gray bg-light-gray/40"}`}>
                                <th className={`px-4 py-2 ${isDark ? "text-text-muted" : "text-gray-500"} font-normal uppercase`}>Date</th>
                                <th className={`px-4 py-2 ${isDark ? "text-text-muted" : "text-gray-500"} font-normal uppercase`}>Amount</th>
                                <th className={`px-4 py-2 ${isDark ? "text-text-muted" : "text-gray-500"} font-normal uppercase`}>Status</th>
                                <th className={`px-4 py-2 ${isDark ? "text-text-muted" : "text-gray-500"} font-normal uppercase text-right`}>TX_Hash</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? "divide-border-dark" : "divide-border-gray"}`}>
                              {[
                                { d: '2024.09.21', a: '5,000.00', s: 'CONFIRMED', h: '5xZ...2pQ' },
                                { d: '2024.09.20', a: '12,450.00', s: 'PROCESSING', h: '9vL...1mR' },
                                { d: '2024.09.18', a: '1,200.00', s: 'PENDING', h: '4wK...8zN' },
                              ].map((tx, i) => (
                                <tr key={i} className={`${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                                  <td className={`px-4 py-3 ${isDark ? "text-text-light" : "text-charcoal"}`}>{tx.d}</td>
                                  <td className={`px-4 py-3 ${isDark ? "text-text-light" : "text-charcoal"}`}>{tx.a}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-1.5 py-0.5 border text-[9px] font-bold ${
                                      tx.s === 'CONFIRMED' ? "bg-pro-green/10 text-pro-green border-pro-green/30" :
                                      tx.s === 'PROCESSING' ? "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30" :
                                      "bg-warning-amber/10 text-warning-amber border-warning-amber/30"
                                    }`}>
                                      {tx.s}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <a href={`https://solscan.io/tx/${tx.h}`} target="_blank" rel="noopener noreferrer" className="text-cyber-blue hover:underline">{tx.h}</a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className={`p-3 ${isDark ? "bg-bg-dark/60 border-t border-border-dark" : "bg-light-gray/60 border-t border-border-gray"} text-center`}>
                          <button className="text-[9px] text-cyber-blue uppercase font-bold hover:underline">View All Transactions</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Withdrawal Confirmation Modal */}
      {isWithdrawalConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-8 max-w-md w-full space-y-6 shadow-2xl`}>
            <div className="flex items-center gap-3 text-warning-amber">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-bold uppercase font-code">Confirm_Withdrawal</h3>
            </div>
            <p className={`text-sm ${isDark ? "text-text-muted" : "text-gray-500"} font-code leading-relaxed`}>
              You are about to withdraw <span className="text-white font-bold">${withdrawalAmount} USDC</span> to the following address:
              <br /><br />
              <span className="text-cyber-blue break-all">{withdrawalAddress}</span>
              <br /><br />
              This action is irreversible. Please verify the destination address carefully.
            </p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsWithdrawalConfirmOpen(false)}
                className={`flex-1 py-3 border ${isDark ? "border-border-dark text-text-muted hover:border-white hover:text-white" : "border-border-gray text-gray-500 hover:border-charcoal hover:text-charcoal"} font-code text-xs font-bold uppercase transition-all`}
              >
                [Cancel]
              </button>
              <button 
                onClick={() => {
                  setIsWithdrawalConfirmOpen(false);
                  // Handle actual withdrawal logic here
                }}
                className="flex-1 py-3 bg-warning-amber text-bg-dark font-code text-xs font-bold uppercase hover:bg-white transition-all"
              >
                [Confirm_Transfer]
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className={`h-10 border-t ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-white"} px-4 md:px-8 flex items-center justify-between z-20`}>
            <div className={`text-[9px] md:text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>HydraMarket Node Access: Authorized_Only</div>
            <div className="flex gap-4 md:gap-6 items-center">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pro-green rounded-full shadow-[0_0_5px_#10B981]"></span>
                <span className={`text-[8px] md:text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Wallet_Secure</span>
              </div>
              <div className={`text-[8px] md:text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase hidden sm:block`}>Session_Expires: 14:22:01</div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
