import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

interface ClaimablePayout {
  id: string;
  marketId: string;
  question: string;
  outcome: "YES" | "NO";
  tokens: number;
  payout: number;
}

interface ClaimHistory {
  id: string;
  date: string;
  market: string;
  outcome: "YES" | "NO";
  amount: number;
  tx: string;
}

export const Payouts = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [claimablePayouts, setClaimablePayouts] = useState<ClaimablePayout[]>([]);
  const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("00:00:00");

  const isDark = true;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toISOString().split('T')[1].split('.')[0]);
    }, 1000);
    
    // Simulate data fetch
    setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearInterval(timer);
  }, []);

  const handleClaim = (id: string) => {
    toast.success(`CLAIM_EXECUTED: ${id}`, {
      style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontFamily: 'monospace' }
    });
  };

  const handleClaimAll = () => {
    toast.success("ALL_CLAIMS_EXECUTED", {
      style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontFamily: 'monospace' }
    });
  };

  const totalClaimable = claimablePayouts.reduce((acc, curr) => acc + curr.payout, 0);

  return (
    <div className="bg-bg-dark text-text-light font-mono antialiased overflow-hidden h-screen flex flex-col relative">
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 flex flex-col min-w-0 bg-bg-dark relative overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 grid-dark grid-bg pointer-events-none opacity-20"></div>

          {/* Header */}
          <header className="h-16 border-b border-border-dark bg-bg-dark/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-text-muted hover:text-cyber-blue transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className="text-sm md:text-lg font-code font-bold text-text-light tracking-tight uppercase flex items-center gap-1">
                SYSTEM_MODULE // PAYOUTS
                <span className="w-2 h-5 bg-cyber-blue animate-pulse ml-1"></span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[10px] text-text-muted font-mono uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse"></span>
                UPLINK_STABLE
              </div>
              <div>SYS_TIME: <span className="text-cyber-blue">{currentTime}</span></div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 space-y-8">
            {/* Claimable Payouts Section */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card-dark border border-border-dark overflow-hidden"
            >
              <div className="p-4 border-b border-border-dark bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-cyber-blue font-bold">&gt;</span>
                  <h2 className="text-xs font-bold uppercase tracking-widest">CLAIMABLE_PAYOUTS</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest">
                    TOTAL: <span className="text-cyber-blue">${totalClaimable.toFixed(2)}</span>
                  </div>
                  {claimablePayouts.length > 0 && (
                    <button 
                      onClick={handleClaimAll}
                      className="px-4 py-1.5 bg-amber-500 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    >
                      [CLAIM_ALL]
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase tracking-widest border-b border-border-dark/50">
                      <th className="px-6 py-4 font-bold">MARKET_ID</th>
                      <th className="px-6 py-4 font-bold">QUESTION_QUERY</th>
                      <th className="px-6 py-4 font-bold">OUTCOME</th>
                      <th className="px-6 py-4 font-bold">TOKENS</th>
                      <th className="px-6 py-4 font-bold">PAYOUT</th>
                      <th className="px-6 py-4 font-bold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-mono">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-border-dark/30 animate-pulse">
                          <td colSpan={6} className="px-6 py-4 h-12 bg-white/[0.01]"></td>
                        </tr>
                      ))
                    ) : claimablePayouts.length > 0 ? (
                      claimablePayouts.map((payout) => (
                        <tr key={payout.id} className="border-b border-border-dark/30 hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 text-text-muted">#{payout.marketId}</td>
                          <td className="px-6 py-4 text-text-light max-w-xs truncate">{payout.question}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${payout.outcome === 'YES' ? 'bg-pro-green/10 text-pro-green border border-pro-green/20' : 'bg-pro-red/10 text-pro-red border border-pro-red/20'}`}>
                              {payout.outcome}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-muted">{payout.tokens}</td>
                          <td className="px-6 py-4 text-cyber-blue font-bold">${payout.payout.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleClaim(payout.id)}
                              className="px-3 py-1 border border-amber-500/50 text-amber-500 text-[9px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
                            >
                              [EXECUTE_CLAIM]
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-text-muted/40 text-sm font-bold uppercase tracking-widest">&gt; NULL_QUEUE — NO_RESOLVED_PAYOUTS_PENDING</span>
                            <span className="text-[10px] text-text-muted/20 uppercase tracking-widest">Resolved markets will appear here for claiming</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.section>

            {/* Claim History Section */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card-dark border border-border-dark overflow-hidden"
            >
              <div className="p-4 border-b border-border-dark bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="text-cyber-blue font-bold">&gt;</span>
                  <h2 className="text-xs font-bold uppercase tracking-widest">CLAIM_HISTORY</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase tracking-widest border-b border-border-dark/50">
                      <th className="px-6 py-4 font-bold">DATE</th>
                      <th className="px-6 py-4 font-bold">MARKET</th>
                      <th className="px-6 py-4 font-bold">OUTCOME</th>
                      <th className="px-6 py-4 font-bold">AMOUNT</th>
                      <th className="px-6 py-4 font-bold">TX</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-mono">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <tr key={i} className="border-b border-border-dark/30 animate-pulse">
                          <td colSpan={5} className="px-6 py-4 h-12 bg-white/[0.01]"></td>
                        </tr>
                      ))
                    ) : claimHistory.length > 0 ? (
                      claimHistory.map((item) => (
                        <tr key={item.id} className="border-b border-border-dark/30 hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-text-muted">{item.date}</td>
                          <td className="px-6 py-4 text-text-light max-w-xs truncate">{item.market}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${item.outcome === 'YES' ? 'bg-pro-green/10 text-pro-green border border-pro-green/20' : 'bg-pro-red/10 text-pro-red border border-pro-red/20'}`}>
                              {item.outcome}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-pro-green font-bold">+${item.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <a href={`https://solscan.io/tx/${item.tx}`} target="_blank" rel="noreferrer" className="text-cyber-blue hover:underline flex items-center gap-1">
                              {item.tx.slice(0, 8)}... <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-text-muted/40 text-sm font-bold uppercase tracking-widest">&gt; NULL_RECORD</span>
                            <span className="text-[10px] text-text-muted/20 uppercase tracking-widest">No historical claims detected</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.section>
          </div>

          {/* Footer Status Bar */}
          <footer className="h-8 border-t border-border-dark bg-bg-dark/90 flex items-center justify-between px-6 text-[9px] font-mono uppercase text-text-muted/60">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pro-green"></span>
                PAYOUT_ENGINE: ACTIVE
              </span>
              <span className="hidden sm:inline">LATENCY: 14MS</span>
            </div>
            <div className="flex items-center gap-4">
              <span>NODE: HYDRA_AWS_WEST_02</span>
              <span className="text-cyber-blue">VER: 2.4.0</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
