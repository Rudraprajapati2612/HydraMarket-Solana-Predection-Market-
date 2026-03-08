import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const AdminDashboard = () => {
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
                <span className="text-cyber-blue">/</span> Admin_Overview
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className={`hidden md:flex items-center group ${isDark ? "bg-card-dark border-border-dark focus-within:border-cyber-blue" : "bg-light-gray border-border-gray focus-within:border-cyber-blue"} px-3 py-1.5 rounded border transition-colors`}>
                <span className={`${isDark ? "text-text-muted" : "text-gray-400"} font-code mr-2`}>&gt;</span>
                <input 
                  className={`bg-transparent border-none text-xs font-mono ${isDark ? "text-text-light placeholder-text-muted" : "text-charcoal placeholder-gray-400"} w-64 focus:ring-0 focus:outline-none uppercase`} 
                  placeholder="SEARCH_USER_OR_MARKET_ID..." 
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-cyber-blue/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>Active Markets</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-cyber-blue transition-colors`}>candlestick_chart</span>
                </div>
                <div className={`text-2xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>248</div>
                <div className="text-[10px] text-pro-green mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">arrow_upward</span> +12 new
                </div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-cyber-blue/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>24h Volume</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-cyber-blue transition-colors`}>payments</span>
                </div>
                <div className={`text-2xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>$1.2M</div>
                <div className="text-[10px] text-pro-green mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">arrow_upward</span> +5.4%
                </div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-pro-red/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>Open Disputes</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-pro-red transition-colors`}>gavel</span>
                </div>
                <div className={`text-2xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>3</div>
                <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} mt-1`}>Requires action</div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-pro-green/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>System Health</div>
                  <span className={`material-symbols-outlined ${isDark ? "text-text-muted" : "text-gray-300"} group-hover:text-pro-green transition-colors`}>memory</span>
                </div>
                <div className="text-2xl font-bold font-code text-pro-green">99.9%</div>
                <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} mt-1`}>Latency: 24ms</div>
              </div>

              <div className={`${isDark ? "bg-card-dark border-border-dark hover:border-cyber-blue/50" : "bg-white border-border-gray hover:shadow-md"} border p-5 rounded-sm shadow-sm transition-all group relative overflow-hidden`}>
                <div className={`absolute right-0 top-0 w-16 h-16 ${isDark ? "bg-cyber-blue/10" : "bg-cyber-blue/5"} rounded-bl-full pointer-events-none`}></div>
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase tracking-wider`}>House Liquidity</div>
                  <span className="material-symbols-outlined text-cyber-blue text-sm">account_balance_wallet</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-[10px] font-mono ${isDark ? "text-text-muted" : "text-gray-400"}`}>SOL</span>
                    <span className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>4,250.5</span>
                  </div>
                  <div className={`w-full h-1 ${isDark ? "bg-border-dark" : "bg-gray-100"} rounded-full overflow-hidden`}>
                    <div className={`h-full bg-cyber-blue w-[75%] ${isDark ? "shadow-[0_0_8px_rgba(0,145,234,0.6)]" : ""}`}></div>
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <span className={`text-[10px] font-mono ${isDark ? "text-text-muted" : "text-gray-400"}`}>USDC</span>
                    <span className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>125k</span>
                  </div>
                  <div className={`w-full h-1 ${isDark ? "bg-border-dark" : "bg-gray-100"} rounded-full overflow-hidden`}>
                    <div className={`h-full bg-pro-green w-[45%] ${isDark ? "shadow-[0_0_8px_rgba(16,185,129,0.6)]" : ""}`}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">
              {/* Chart Section */}
              <div className={`lg:col-span-2 ${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-4 md:p-6 rounded-sm shadow-sm flex flex-col min-h-[300px]`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase flex items-center gap-2`}>
                    <span className={`w-2 h-2 bg-cyber-blue rounded-sm ${isDark ? "shadow-[0_0_8px_rgba(0,145,234,0.8)]" : ""}`}></span>
                    Platform Volume (7D)
                  </h3>
                  <div className="flex gap-1 md:gap-2">
                    <button className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-1 ${isDark ? "bg-border-dark/50 text-text-muted hover:bg-border-dark" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} rounded`}>1D</button>
                    <button className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-1 bg-cyber-blue text-white rounded font-bold ${isDark ? "shadow-[0_0_10px_rgba(0,145,234,0.4)]" : ""}`}>7D</button>
                    <button className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-1 ${isDark ? "bg-border-dark/50 text-text-muted hover:bg-border-dark" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} rounded`}>30D</button>
                  </div>
                </div>
                <div className={`flex-1 flex items-end gap-1 md:gap-2 relative border-b border-l ${isDark ? "border-border-dark" : "border-gray-200"} pl-2 pb-2`}>
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pl-6">
                    <div className={`w-full h-px ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                    <div className={`w-full h-px ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                    <div className={`w-full h-px ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                    <div className={`w-full h-px ${isDark ? "bg-border-dark" : "bg-gray-100"}`}></div>
                  </div>
                  {/* Mock Bars */}
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/20 border-t border-cyber-blue/50" : "bg-cyber-blue/10"} h-[40%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/40" : "bg-cyber-blue/20"} transition-all`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$420k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/30 border-t border-cyber-blue/60" : "bg-cyber-blue/20"} h-[65%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/50" : "bg-cyber-blue/30"} transition-all`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$680k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/20 border-t border-cyber-blue/50" : "bg-cyber-blue/10"} h-[45%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/40" : "bg-cyber-blue/20"} transition-all`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$450k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/30 border-t border-cyber-blue/60" : "bg-cyber-blue/20"} h-[55%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/50" : "bg-cyber-blue/30"} transition-all`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$580k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/10 border-t border-cyber-blue/40" : "bg-cyber-blue/10"} h-[30%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/30" : "bg-cyber-blue/20"} transition-all`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$320k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue/60 border-t border-cyber-blue shadow-[0_0_15px_rgba(0,145,234,0.3)]" : "bg-cyber-blue/60"} h-[85%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue/80" : "bg-cyber-blue/70"} transition-all shadow-sm`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$890k</div>
                  </div>
                  <div className={`flex-1 ${isDark ? "bg-cyber-blue border-t border-white/50 shadow-[0_0_20px_rgba(0,145,234,0.5)]" : "bg-cyber-blue"} h-[70%] rounded-t-sm relative group hover:${isDark ? "bg-cyber-blue" : "bg-cyber-blue/90"} transition-all shadow-md`}>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] ${isDark ? "bg-bg-dark border border-border-dark" : "bg-charcoal"} text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>$720k</div>
                  </div>
                </div>
                <div className={`flex justify-between mt-2 text-[9px] md:text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono pl-4 md:pl-8`}>
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                  <span>SUN</span>
                </div>
              </div>

              {/* Logs Section */}
              <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-0 rounded-sm shadow-sm flex flex-col overflow-hidden min-h-[300px]`}>
                <div className={`p-4 border-b ${isDark ? "border-border-dark bg-border-dark/20" : "border-border-gray bg-light-gray/50"} flex justify-between items-center`}>
                  <h3 className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>Recent Logs</h3>
                  <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono`}>LIVE FEED</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  <div className="flex flex-col">
                    <div className={`flex gap-3 p-3 border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors cursor-pointer`}>
                      <div className="mt-1">
                        <span className="material-symbols-outlined text-[16px] text-pro-green">check_circle</span>
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? "text-text-light" : "text-charcoal"} font-code`}>MARKET_RESOLVED #8821</div>
                        <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} mt-0.5`}>Resolved to "YES" by Oracle_Main</div>
                        <div className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono mt-1`}>12:42:05 PM</div>
                      </div>
                    </div>
                    <div className={`flex gap-3 p-3 border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors cursor-pointer`}>
                      <div className="mt-1">
                        <span className="material-symbols-outlined text-[16px] text-cyber-blue">add_task</span>
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? "text-text-light" : "text-charcoal"} font-code`}>MARKET_CREATED #8822</div>
                        <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} mt-0.5`}>"Will BTC hit 100k?" added</div>
                        <div className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono mt-1`}>12:38:12 PM</div>
                      </div>
                    </div>
                    <div className={`flex gap-3 p-3 border-b ${isDark ? "border-border-dark hover:bg-border-dark/30 bg-pro-red/5" : "border-gray-100 hover:bg-gray-50 bg-red-50/50"} transition-colors cursor-pointer`}>
                      <div className="mt-1">
                        <span className="material-symbols-outlined text-[16px] text-pro-red">warning</span>
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? "text-text-light" : "text-charcoal"} font-code`}>DISPUTE_FILED #8819</div>
                        <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} mt-0.5`}>User 0x92... filed contest</div>
                        <div className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono mt-1`}>12:15:00 PM</div>
                      </div>
                    </div>
                    <div className={`flex gap-3 p-3 border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors cursor-pointer`}>
                      <div className="mt-1">
                        <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-text-muted' : 'text-gray-400'}`}>login</span>
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? "text-text-light" : "text-charcoal"} font-code`}>ADMIN_LOGIN</div>
                        <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} mt-0.5`}>Admin_02 session started</div>
                        <div className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-mono mt-1`}>11:58:33 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`p-2 border-t ${isDark ? "border-border-dark bg-border-dark/10" : "border-border-gray bg-gray-50"} text-center`}>
                  <button className="text-[10px] font-bold text-cyber-blue uppercase hover:underline">View All Logs</button>
                </div>
              </div>
            </div>

            {/* Queue Table */}
            <div className={`mt-6 ${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border rounded-sm shadow-sm overflow-hidden`}>
              <div className={`p-4 border-b ${isDark ? "border-border-dark bg-border-dark/20" : "border-border-gray bg-light-gray/30"} flex justify-between items-center`}>
                <h3 className={`text-sm font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>Pending Resolution Queue</h3>
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 ${isDark ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-100 text-yellow-800 border-yellow-200"} rounded border font-bold`}>4 PENDING</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isDark ? "bg-border-dark/10 border-border-dark" : "bg-gray-50 border-gray-100"} border-b text-[10px] uppercase ${isDark ? "text-text-muted" : "text-gray-500"} font-code tracking-wider`}>
                      <th className="p-3 font-semibold">ID</th>
                      <th className="p-3 font-semibold">Market Question</th>
                      <th className="p-3 font-semibold">Volume</th>
                      <th className="p-3 font-semibold">End Date</th>
                      <th className="p-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-400"} p-3`}>#8815</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Will SpaceX launch Starship before Nov 1?</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>$12,405</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>Oct 31, 2023</td>
                      <td className="p-3 text-right">
                        <button className={`text-[10px] ${isDark ? "bg-bg-dark border-border-dark hover:border-cyber-blue hover:text-cyber-blue text-text-muted" : "bg-white border-border-gray hover:border-cyber-blue hover:text-cyber-blue text-gray-600"} border px-3 py-1 rounded shadow-sm transition-all font-bold`}>RESOLVE</button>
                      </td>
                    </tr>
                    <tr className={`border-b ${isDark ? "border-border-dark hover:bg-border-dark/30" : "border-gray-100 hover:bg-gray-50"} transition-colors group`}>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-400"} p-3`}>#8812</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Fed Interest Rate Decision (Nov)</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>$45,200</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>Nov 02, 2023</td>
                      <td className="p-3 text-right">
                        <button className={`text-[10px] ${isDark ? "bg-bg-dark border-border-dark hover:border-cyber-blue hover:text-cyber-blue text-text-muted" : "bg-white border-border-gray hover:border-cyber-blue hover:text-cyber-blue text-gray-600"} border px-3 py-1 rounded shadow-sm transition-all font-bold`}>RESOLVE</button>
                      </td>
                    </tr>
                    <tr className={`${isDark ? "hover:bg-border-dark/30" : "hover:bg-gray-50"} transition-colors group`}>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-400"} p-3`}>#8809</td>
                      <td className={`p-3 font-medium ${isDark ? "text-text-light" : "text-charcoal"}`}>Solana Breakpoint Attendance &gt; 5k?</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>$8,900</td>
                      <td className={`${isDark ? "text-text-muted" : "text-gray-600"} p-3`}>Nov 03, 2023</td>
                      <td className="p-3 text-right">
                        <button className={`text-[10px] ${isDark ? "bg-bg-dark border-border-dark hover:border-cyber-blue hover:text-cyber-blue text-text-muted" : "bg-white border-border-gray hover:border-cyber-blue hover:text-cyber-blue text-gray-600"} border px-3 py-1 rounded shadow-sm transition-all font-bold`}>RESOLVE</button>
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
