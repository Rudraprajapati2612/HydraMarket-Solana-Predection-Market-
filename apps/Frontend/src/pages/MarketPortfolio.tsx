import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const MarketPortfolio = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        {/* Main Content */}
        <main className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-bg-dark" : "bg-light-bg"} relative overflow-hidden`}>
          {/* Grid Background */}
          <div className={`absolute inset-0 ${isDark ? "grid-dark" : "grid-light"} grid-bg pointer-events-none ${isDark ? "opacity-100" : "opacity-30"}`}></div>
          
          <header className={`h-16 border-b ${isDark ? "border-border-dark bg-bg-dark/90" : "border-border-gray bg-white/90"} backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-6`}>
            <div className="flex items-center gap-4">
              <button 
                className={`lg:hidden ${isDark ? "text-text-muted" : "text-gray-500"} hover:text-cyber-blue transition-colors`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className={`text-sm md:text-lg font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} tracking-tight uppercase flex items-center gap-2`}>
                <span className="text-cyber-blue">/</span> MARKET_LIQUIDITY_PORTFOLIO
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className={`hidden md:flex items-center group ${isDark ? "bg-card-dark border-border-dark focus-within:border-cyber-blue" : "bg-light-gray border-border-gray focus-within:border-cyber-blue"} px-3 py-1.5 rounded border transition-colors`}>
                <span className={`${isDark ? "text-text-muted" : "text-gray-400"} font-code mr-2`}>&gt;</span>
                <input 
                  className={`bg-transparent border-none text-xs font-mono ${isDark ? "text-text-light placeholder-text-muted" : "text-charcoal placeholder-gray-400"} w-64 focus:ring-0 focus:outline-none uppercase`} 
                  placeholder="SEARCH_MARKET_OR_ID..." 
                  type="text" 
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleTheme}
                  className={`${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-400 hover:text-cyber-blue"} transition-colors`}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <span className="material-symbols-outlined">
                    {isDark ? "light_mode" : "dark_mode"}
                  </span>
                </button>

                <button className={`relative ${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-400 hover:text-cyber-blue"} transition-colors`}>
                  <span className="material-symbols-outlined">notifications</span>
                  <span className={`absolute top-0 right-0 w-2 h-2 ${isDark ? "bg-pro-red" : "bg-pro-red"} rounded-full ring-2 ${isDark ? "ring-bg-dark" : "ring-white"}`}></span>
                </button>
              </div>

              <div className={`flex items-center gap-3 pl-6 border-l ${isDark ? "border-border-dark" : "border-border-gray"}`}>
                <div className="text-right hidden sm:block">
                  <div className={`text-xs font-bold ${isDark ? "text-text-light" : "text-charcoal"} font-code`}>ADMIN_01</div>
                  <div className="text-[10px] text-cyber-blue uppercase font-bold">Super_User</div>
                </div>
                <div className={`h-9 w-9 border ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-light-gray"} flex items-center justify-center hover:bg-cyber-blue hover:text-white transition-colors cursor-pointer rounded-sm ${isDark ? "text-text-muted" : "text-gray-600"}`}>
                  <span className="material-symbols-outlined text-sm">shield_person</span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-cyber-blue/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>[PLATFORM_TVL]</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-cyber-blue transition-colors`}>account_balance</span>
                </div>
                <div className={`text-3xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>$12.4M</div>
                <div className="text-[10px] text-pro-green mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> +12.5% this week
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isDark ? "bg-border-dark" : "bg-gray-100"}`}>
                  <div className={`h-full bg-cyber-blue w-[70%] ${isDark ? "shadow-[0_0_8px_rgba(0,145,234,0.6)]" : ""}`}></div>
                </div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-pro-green/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>[ACTIVE_LIQUIDITY]</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-cyber-blue transition-colors`}>water_drop</span>
                </div>
                <div className={`text-3xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>$8.2M</div>
                <div className={`text-[10px] ${isDark ? "text-text-light" : "text-charcoal"} mt-2 flex items-center gap-1 font-mono`}>
                  ~66% utilization rate
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isDark ? "bg-border-dark" : "bg-gray-100"}`}>
                  <div className={`h-full bg-pro-green w-[66%] ${isDark ? "shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""}`}></div>
                </div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-cyber-blue/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>[RESERVE_POOL]</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-cyber-blue transition-colors`}>savings</span>
                </div>
                <div className={`text-3xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>$4.2M</div>
                <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} mt-2 flex items-center gap-1`}>
                  Available for settlement
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isDark ? "bg-border-dark" : "bg-gray-100"}`}>
                  <div className={`h-full ${isDark ? "bg-text-light" : "bg-charcoal"} w-[34%]`}></div>
                </div>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-6 rounded-sm shadow-sm mb-8`}>
              <div className={`flex justify-between items-center mb-6 border-b ${isDark ? "border-border-dark" : "border-border-gray"} pb-4`}>
                <h3 className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase flex items-center gap-2`}>
                  <span className={`w-2 h-2 bg-cyber-blue rounded-sm ${isDark ? "shadow-[0_0_8px_rgba(0,145,234,0.8)]" : ""}`}></span>
                  Liquidity Distribution by Category
                </h3>
                <div className="flex gap-2">
                  <button className="text-[10px] px-2 py-1 bg-cyber-blue text-white rounded font-bold uppercase">View All</button>
                  <button className={`text-[10px] px-2 py-1 ${isDark ? "bg-border-dark text-text-muted hover:bg-border-dark/80" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} rounded uppercase`}>Export CSV</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Crypto Markets */}
                <div className="space-y-3">
                  <div className={`flex justify-between text-xs font-bold font-code uppercase ${isDark ? "text-text-light" : "text-charcoal"}`}>
                    <span>Crypto Markets</span>
                    <span>$5.8M</span>
                  </div>
                  <div className={`w-full ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} h-32 relative border rounded-sm flex items-end px-4 pt-4 gap-2`}>
                    <div className={`flex-1 ${isDark ? "bg-cyber-blue/30" : "bg-cyber-blue/20"} h-[60%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/50" : "bg-cyber-blue/30"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>60%</div>
                    </div>
                    <div className={`flex-1 ${isDark ? "bg-cyber-blue/50" : "bg-cyber-blue/40"} h-[85%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/70" : "bg-cyber-blue/50"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>85%</div>
                    </div>
                    <div className={`flex-1 bg-cyber-blue h-[45%] rounded-t-sm relative group hover:bg-cyber-blue/90 transition-all ${isDark ? "shadow-[0_0_10px_rgba(0,145,234,0.4)]" : ""}`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>45%</div>
                    </div>
                  </div>
                  <div className={`flex justify-between text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-mono`}>
                    <span>BTC</span>
                    <span>ETH</span>
                    <span>SOL</span>
                  </div>
                </div>

                {/* Sports Markets */}
                <div className="space-y-3">
                  <div className={`flex justify-between text-xs font-bold font-code uppercase ${isDark ? "text-text-light" : "text-charcoal"}`}>
                    <span>Sports Markets</span>
                    <span>$1.9M</span>
                  </div>
                  <div className={`w-full ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} h-32 relative border rounded-sm flex items-end px-4 pt-4 gap-2`}>
                    <div className={`flex-1 ${isDark ? "bg-pro-green/30" : "bg-pro-green/20"} h-[75%] rounded-t-sm relative group hover:${isDark ? "bg-pro-green/50" : "bg-pro-green/30"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>75%</div>
                    </div>
                    <div className={`flex-1 ${isDark ? "bg-pro-green/50" : "bg-pro-green/40"} h-[50%] rounded-t-sm relative group hover:${isDark ? "bg-pro-green/70" : "bg-pro-green/50"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>50%</div>
                    </div>
                    <div className={`flex-1 bg-pro-green h-[90%] rounded-t-sm relative group hover:bg-pro-green/90 transition-all ${isDark ? "shadow-[0_0_10px_rgba(16,185,129,0.4)]" : ""}`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>90%</div>
                    </div>
                  </div>
                  <div className={`flex justify-between text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-mono`}>
                    <span>NBA</span>
                    <span>NFL</span>
                    <span>UFC</span>
                  </div>
                </div>

                {/* Politics Markets */}
                <div className="space-y-3">
                  <div className={`flex justify-between text-xs font-bold font-code uppercase ${isDark ? "text-text-light" : "text-charcoal"}`}>
                    <span>Politics Markets</span>
                    <span>$0.5M</span>
                  </div>
                  <div className={`w-full ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} h-32 relative border rounded-sm flex items-end px-4 pt-4 gap-2`}>
                    <div className={`flex-1 ${isDark ? "bg-text-muted/30" : "bg-charcoal/20"} h-[30%] rounded-t-sm relative group hover:${isDark ? "bg-text-muted/50" : "bg-charcoal/30"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>30%</div>
                    </div>
                    <div className={`flex-1 ${isDark ? "bg-text-muted/50" : "bg-charcoal/40"} h-[40%] rounded-t-sm relative group hover:${isDark ? "bg-text-muted/70" : "bg-charcoal/50"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>40%</div>
                    </div>
                    <div className={`flex-1 ${isDark ? "bg-text-light" : "bg-charcoal"} h-[25%] rounded-t-sm relative group hover:${isDark ? "bg-text-light/90" : "bg-charcoal/90"} transition-all`}>
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono ${isDark ? "text-text-light" : "text-charcoal"} opacity-0 group-hover:opacity-100`}>25%</div>
                    </div>
                  </div>
                  <div className={`flex justify-between text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-mono`}>
                    <span>US</span>
                    <span>EU</span>
                    <span>ASIA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Positions Table */}
            <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border rounded-sm shadow-sm overflow-hidden`}>
              <div className={`p-4 border-b ${isDark ? "border-border-dark bg-border-dark/20" : "border-border-gray bg-light-gray/30"} flex justify-between items-center`}>
                <h3 className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>LIQUIDITY_POSITIONS</h3>
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 ${isDark ? "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30" : "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20"} rounded border font-bold`}>12 ACTIVE</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isDark ? "bg-border-dark/10 border-border-dark" : "bg-gray-50 border-gray-100"} border-b text-[10px] uppercase ${isDark ? "text-text-muted" : "text-gray-500"} font-code tracking-wider`}>
                      <th className="p-3 font-semibold">MARKET_ID</th>
                      <th className="p-3 font-semibold">QUESTION</th>
                      <th className="p-3 font-semibold">TOTAL_POOL</th>
                      <th className="p-3 font-semibold">ADMIN_STAKE</th>
                      <th className="p-3 font-semibold text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>#MKT-8815</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Will SpaceX launch Starship before Nov 1?</td>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-600"} font-bold`}>$124,050</td>
                      <td className="p-3 text-cyber-blue font-bold">$12,400 (10%)</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDark ? "bg-pro-green/10 text-pro-green border-pro-green/20" : "bg-green-50 text-green-700 border-green-100"} text-[10px] rounded border font-bold uppercase`}>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Active
                        </span>
                      </td>
                    </tr>
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>#MKT-8812</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Fed Interest Rate Decision (Nov)</td>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-600"} font-bold`}>$452,000</td>
                      <td className="p-3 text-cyber-blue font-bold">$45,200 (10%)</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDark ? "bg-pro-green/10 text-pro-green border-pro-green/20" : "bg-green-50 text-green-700 border-green-100"} text-[10px] rounded border font-bold uppercase`}>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Active
                        </span>
                      </td>
                    </tr>
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>#MKT-8809</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Solana Breakpoint Attendance &gt; 5k?</td>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-600"} font-bold`}>$89,000</td>
                      <td className="p-3 text-cyber-blue font-bold">$17,800 (20%)</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDark ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border-yellow-100"} text-[10px] rounded border font-bold uppercase`}>
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Closing
                        </span>
                      </td>
                    </tr>
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>#MKT-8801</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Will BTC hit 100k by EOY?</td>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-600"} font-bold`}>$2,450,100</td>
                      <td className="p-3 text-cyber-blue font-bold">$245,000 (10%)</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDark ? "bg-pro-green/10 text-pro-green border-pro-green/20" : "bg-green-50 text-green-700 border-green-100"} text-[10px] rounded border font-bold uppercase`}>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Active
                        </span>
                      </td>
                    </tr>
                    <tr className={`${isDark ? "hover:bg-border-dark/30" : "hover:bg-gray-50"} transition-colors group`}>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>#MKT-8799</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Next US President Republican?</td>
                      <td className={`p-3 ${isDark ? "text-text-muted" : "text-gray-600"} font-bold`}>$510,500</td>
                      <td className="p-3 text-cyber-blue font-bold">$25,500 (5%)</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDark ? "bg-text-muted/10 text-text-muted border-border-dark" : "bg-gray-100 text-gray-600 border-gray-200"} text-[10px] rounded border font-bold uppercase`}>
                          <span className={`w-1.5 h-1.5 ${isDark ? "bg-text-muted" : "bg-gray-400"} rounded-full`}></span> Paused
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
