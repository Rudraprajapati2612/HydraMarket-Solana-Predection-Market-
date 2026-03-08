import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

interface Market {
  id: string;
  category: string;
  status: "ACTIVE" | "CLOSING" | "RESOLVED";
  title: string;
  description: string;
  volume: string;
  expiry: string;
  liquidity: string;
  odds: number;
  change: string;
  changeType: "up" | "down";
}

const marketsData: Market[] = [
  {
    id: "1",
    category: "CRYPTO",
    status: "ACTIVE",
    title: "Will Bitcoin reach a new all-time high before the end of Q4 2024?",
    description: "Based on the daily closing price of BTC/USD on Coinbase exchange.",
    volume: "$4,250,120",
    expiry: "DEC 31, 2024",
    liquidity: "$245.8K",
    odds: 62,
    change: "4%",
    changeType: "up"
  },
  {
    id: "2",
    category: "TECH",
    status: "ACTIVE",
    title: "Will SpaceX successfully land a Starship booster on the tower?",
    description: "Market resolves YES if the 'Mechazilla' arms successfully catch the Super Heavy booster.",
    volume: "$892,400",
    expiry: "OCT 15, 2024",
    liquidity: "$45.2K",
    odds: 45,
    change: "2%",
    changeType: "down"
  },
  {
    id: "3",
    category: "SPORTS",
    status: "CLOSING",
    title: "Will the LA Dodgers win the 2024 World Series?",
    description: "Resolves per MLB official championship determination.",
    volume: "$2,105,600",
    expiry: "NOV 01, 2024",
    liquidity: "$112.9K",
    odds: 18,
    change: "12%",
    changeType: "up"
  },
  {
    id: "4",
    category: "POLITICS",
    status: "ACTIVE",
    title: "Will the UK rejoin the Single Market by 2030?",
    description: "Resolves YES if any formal agreement is signed for re-entry into the single market.",
    volume: "$1,240,000",
    expiry: "JAN 01, 2030",
    liquidity: "$88.5K",
    odds: 12,
    change: "1%",
    changeType: "down"
  },
  {
    id: "5",
    category: "CRYPTO",
    status: "ACTIVE",
    title: "Will Ethereum transition to a fully stateless network in 2025?",
    description: "Based on official Ethereum Foundation roadmap milestones.",
    volume: "$750,000",
    expiry: "DEC 31, 2025",
    liquidity: "$32.1K",
    odds: 35,
    change: "5%",
    changeType: "up"
  }
];

export const MarketsTerminal = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
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

  const filteredMarkets = useMemo(() => {
    return marketsData.filter(market => {
      const matchesSearch = market.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           market.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "ALL" || market.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const categories = ["ALL", "CRYPTO", "SPORTS", "POLITICS", "TECH"];

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
              <h1 className={`text-xl sm:text-3xl font-serif ${isDark ? "text-white" : "text-charcoal"} tracking-tight uppercase truncate`}>MARKETS</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {localStorage.getItem("userRole") === "admin" && (
                <button 
                  onClick={() => navigate("/create-market")}
                  className={`hidden sm:flex items-center gap-2 px-4 py-2 ${isDark ? "bg-card-dark border-cyber-blue text-cyber-blue" : "bg-white border-cyber-blue text-cyber-blue"} font-code text-xs font-bold border rounded-sm hover:bg-cyber-blue hover:text-white transition-all shadow-[0_0_10px_rgba(0,209,255,0.2)]`}
                >
                  [+ CREATE_MARKET]
                </button>
              )}
              
              <button 
                onClick={toggleTheme}
                className={`h-9 w-9 border ${isDark ? "border-border-dark bg-card-dark text-text-muted" : "border-border-gray bg-white text-gray-400"} flex items-center justify-center hover:border-cyber-blue hover:text-cyber-blue transition-colors cursor-pointer rounded-sm`}
              >
                <span className="material-symbols-outlined text-sm">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
              </button>

              <div className={`h-9 w-9 border ${isDark ? "border-border-dark bg-card-dark text-text-muted" : "border-border-gray bg-white text-gray-400"} flex items-center justify-center hover:border-cyber-blue hover:text-cyber-blue transition-colors cursor-pointer rounded-sm`}>
                <span className="material-symbols-outlined text-sm">filter_list</span>
              </div>
            </div>
          </header>

          {/* Search and Filters */}
          <div className={`px-4 sm:px-8 py-4 border-b ${isDark ? "border-border-dark bg-bg-dark/50" : "border-border-gray bg-light-gray/50"} flex flex-col items-stretch gap-4 z-20`}>
            <div className="flex-1 relative w-full group">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-text-muted" : "text-gray-400"} font-code text-sm group-focus-within:text-cyber-blue`}>[&gt;</span>
              <input 
                className={`w-full ${isDark ? "bg-card-dark border-border-dark text-text-light" : "bg-white border-border-gray text-charcoal"} border pl-10 pr-4 py-2 text-xs font-code focus:ring-0 focus:border-cyber-blue outline-none uppercase placeholder:${isDark ? "text-text-muted/50" : "text-gray-300"}`} 
                placeholder="SEARCH_MARKETS..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {categories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-[10px] font-bold font-code border transition-colors whitespace-nowrap
                    ${activeCategory === cat 
                      ? "bg-cyber-blue text-white border-cyber-blue" 
                      : `${isDark ? "text-text-muted bg-card-dark border-border-dark" : "text-gray-500 bg-white border-border-gray"} hover:border-cyber-blue hover:text-cyber-blue`
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Market Cards List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 relative z-10">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market) => (
                <div 
                  key={market.id} 
                  onClick={() => navigate(`/trading/${market.id}`)}
                  className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border rounded-sm flex flex-col md:flex-row group hover:border-cyber-blue transition-all duration-300 cursor-pointer`}
                >
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-tighter
                        ${market.category === "CRYPTO" ? (isDark ? "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30" : "bg-cyber-blue/5 text-cyber-blue border-cyber-blue/20") : ""}
                        ${market.category === "TECH" ? (isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-purple-50 text-purple-600 border-purple-100") : ""}
                        ${market.category === "SPORTS" ? (isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-orange-50 text-orange-600 border-orange-100") : ""}
                        ${market.category === "POLITICS" ? (isDark ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-red-50 text-red-600 border-red-100") : ""}
                      `}>
                        {market.category}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-tighter
                        ${market.status === "ACTIVE" ? (isDark ? "bg-pro-green/10 text-pro-green border-pro-green/30" : "bg-green-50 text-green-600 border-green-100") : ""}
                        ${market.status === "CLOSING" ? (isDark ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-yellow-50 text-yellow-600 border-yellow-100") : ""}
                      `}>
                        {market.status}
                      </span>
                    </div>
                    <h2 className={`text-base sm:text-lg font-bold ${isDark ? "text-text-light" : "text-charcoal"} mb-2 leading-snug`}>{market.title}</h2>
                    <p className={`text-xs sm:text-sm ${isDark ? "text-text-muted" : "text-gray-500"} font-sans mb-6 line-clamp-2 sm:line-clamp-1 opacity-70`}>{market.description}</p>
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-auto">
                      <div className="flex flex-col">
                        <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase font-code`}>Volume</span>
                        <span className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"}`}>{market.volume}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase font-code`}>Expiry</span>
                        <span className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"}`}>{market.expiry}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase font-code`}>Liquidity</span>
                        <span className="text-xs font-code font-bold text-cyber-blue">{market.liquidity}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-full md:w-[240px] border-t md:border-t-0 md:border-l ${isDark ? "border-border-dark bg-bg-dark/30" : "border-border-gray bg-light-gray/30"} flex flex-col justify-center p-4 sm:p-6`}>
                    <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-1`}>Current_Odds (YES)</div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className={`text-2xl sm:text-3xl font-code font-bold ${isDark ? "text-white" : "text-charcoal"}`}>{market.odds}¢</span>
                      <span className={`${market.changeType === "up" ? "text-cyber-blue" : "text-pro-red"} text-xs font-code flex items-center`}>
                        {market.changeType === "up" ? "↗" : "↘"} {market.change}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className={`flex justify-between text-[10px] font-code uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>
                        <span className="font-bold">Prob_Matrix</span>
                        <span className="text-cyber-blue">{market.odds.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full h-1.5 ${isDark ? "bg-border-dark" : "bg-gray-200"} rounded-full overflow-hidden`}>
                        <div className="h-full bg-cyber-blue shadow-[0_0_8px_#00D1FF]" style={{ width: `${market.odds}%` }}></div>
                      </div>
                    </div>
                    
                    <button 
                      className="mt-4 w-full py-2 bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-cyber-blue hover:text-white transition-all group-hover:shadow-[0_0_15px_rgba(0,209,255,0.3)]"
                    >
                      TRADE_NOW
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-text-muted mb-4 opacity-50">search_off</span>
                <p className={`text-sm font-code ${isDark ? "text-text-muted" : "text-gray-500"} uppercase tracking-widest`}>No_Markets_Found</p>
                <button 
                  onClick={() => { setSearchQuery(""); setActiveCategory("ALL"); }}
                  className="mt-4 text-xs font-code text-cyber-blue hover:underline uppercase"
                >
                  [Reset_Filters]
                </button>
              </div>
            )}
          </div>

          <footer className={`h-auto sm:h-10 border-t ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-white"} px-4 sm:px-8 py-2 sm:py-0 flex flex-col sm:flex-row items-center justify-between z-20 gap-2`}>
            <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>
              Showing {filteredMarkets.length} of {marketsData.length} Markets
            </div>
            <div className="flex gap-4">
              <button className="text-[10px] font-code text-cyber-blue hover:text-white transition-colors uppercase tracking-wider">[Previous_Page]</button>
              <button className="text-[10px] font-code text-cyber-blue hover:text-white transition-colors uppercase tracking-wider">[Next_Page]</button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
