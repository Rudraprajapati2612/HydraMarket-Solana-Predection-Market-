import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Sidebar } from "../components/Sidebar";
import { API_BASE_URL } from "../lib/api";
import { clearSessionUser } from "../lib/session";

type ActiveTab = "PORTFOLIO" | "DEPOSIT" | "WITHDRAW";

interface PortfolioSummary {
  totalBalance: number;
  available: number;
  reserved: number;
  claimablePayouts: number;
  claimableMarketsCount: number;
  allocation: {
    availablePercent: number;
    reservedPercent: number;
  };
  positions: {
    total: number;
    active: number;
    resolved: number;
  };
  currency: string;
}

interface PortfolioPosition {
  marketId: string;
  marketQuestion: string;
  marketState: string;
  marketOutcome: string | null;
  expireAt: string;
  yesTokens: number;
  noTokens: number;
  totalTokens: number;
  isClaimed: boolean;
  claimedAt: string | null;
  pendingPayout: number | null;
  result: string;
}

interface DepositInstruction {
  depositAddress: string;
  depositMemo: string;
  asset: string;
  network: string;
  instructions: string[];
  warnings: string[];
}

interface DepositItem {
  id: string;
  asset: string;
  amount: number;
  txHash: string;
  status: string;
  createdAt: string;
}

interface WithdrawalItem {
  id: string;
  asset: string;
  amount: number;
  txHash?: string | null;
  status: string;
  requestedAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  asset: string;
  amount: number;
  status: string;
  timestamp: string;
  reference?: string | null;
  title: string;
  description: string;
}

const emptySummary: PortfolioSummary = {
  totalBalance: 0,
  available: 0,
  reserved: 0,
  claimablePayouts: 0,
  claimableMarketsCount: 0,
  allocation: {
    availablePercent: 0,
    reservedPercent: 0,
  },
  positions: {
    total: 0,
    active: 0,
    resolved: 0,
  },
  currency: "USDC",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, ".");

const shortHash = (value?: string | null) => {
  if (!value) return "N/A";
  if (value.length <= 10) return value;
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
};

const getStatusBadge = (status: string) => {
  if (status === "CONFIRMED" || status === "WIN") return "bg-pro-green/10 text-pro-green border-pro-green/30";
  if (status === "PROCESSING" || status === "OPEN") return "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30";
  if (status === "PENDING") return "bg-warning-amber/10 text-warning-amber border-warning-amber/30";
  if (status === "LOST" || status === "FAILED") return "bg-rose-500/10 text-rose-500 border-rose-500/30";
  return "bg-white/5 text-text-muted border-border-dark";
};

export const Portfolio = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("PORTFOLIO");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("admin-theme");
    return (saved as "light" | "dark") || "dark";
  });
  const [loading, setLoading] = useState(true);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState<PortfolioSummary>(emptySummary);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [depositInstruction, setDepositInstruction] = useState<DepositInstruction | null>(null);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [isWithdrawalConfirmOpen, setIsWithdrawalConfirmOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  const isAddressValid = (addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

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

  const loadPortfolio = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [
        summaryResponse,
        positionsResponse,
        activityResponse,
        instructionResponse,
        depositsResponse,
        withdrawalsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/portfolio/summary`, { headers }),
        fetch(`${API_BASE_URL}/portfolio`, { headers }),
        fetch(`${API_BASE_URL}/portfolio/activity?limit=6`, { headers }),
        fetch(`${API_BASE_URL}/deposit/instruction`, { headers }),
        fetch(`${API_BASE_URL}/deposit?limit=5`, { headers }),
        fetch(`${API_BASE_URL}/withdrawals`, { headers }),
      ]);

      if (
        [
          summaryResponse,
          positionsResponse,
          activityResponse,
          instructionResponse,
          depositsResponse,
          withdrawalsResponse,
        ].some((response) => response.status === 401)
      ) {
        clearSessionUser();
        navigate("/login");
        return;
      }

      const [
        summaryData,
        positionsData,
        activityData,
        instructionData,
        depositsData,
        withdrawalsData,
      ] = await Promise.all([
        summaryResponse.json(),
        positionsResponse.json(),
        activityResponse.json(),
        instructionResponse.json(),
        depositsResponse.json(),
        withdrawalsResponse.json(),
      ]);

      if (!summaryResponse.ok || !summaryData?.success) throw new Error(summaryData?.error || "Failed to load summary");
      if (!positionsResponse.ok || !positionsData?.success) throw new Error(positionsData?.error || "Failed to load positions");
      if (!activityResponse.ok || !activityData?.success) throw new Error(activityData?.error || "Failed to load activity");
      if (!instructionResponse.ok || !instructionData?.success) throw new Error(instructionData?.error || "Failed to load deposit instructions");
      if (!depositsResponse.ok || !depositsData?.success) throw new Error(depositsData?.error || "Failed to load deposits");
      if (!withdrawalsResponse.ok || !withdrawalsData?.success) throw new Error(withdrawalsData?.error || "Failed to load withdrawals");

      setSummary(summaryData.data);
      setPositions(positionsData.data);
      setActivity(activityData.data);
      setDepositInstruction(instructionData.data);
      setDeposits(depositsData.data ?? []);
      setWithdrawals(withdrawalsData.data ?? []);
    } catch (fetchError: any) {
      setError(fetchError.message || "Unable to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [navigate]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess(`${label} copied`);
      window.setTimeout(() => setSuccess(""), 1500);
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  const handleWithdrawalConfirm = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      clearSessionUser();
      navigate("/login");
      return;
    }

    setSubmittingWithdrawal(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset: "USDC",
          amount: Number(withdrawalAmount),
          destinationAddress: withdrawalAddress,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        clearSessionUser();
        navigate("/login");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Withdrawal failed");
      }

      setSuccess("Withdrawal request submitted");
      setWithdrawalAddress("");
      setWithdrawalAmount("");
      setIsWithdrawalConfirmOpen(false);
      await loadPortfolio();
      setActiveTab("WITHDRAW");
    } catch (submitError: any) {
      setError(submitError.message || "Unable to create withdrawal");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";
  const availableDash = `${Math.max(0, summary.allocation.availablePercent * 2.51).toFixed(1)} ${Math.max(0, 251.3 - summary.allocation.availablePercent * 2.51).toFixed(1)}`;
  const reservedDash = `${Math.max(0, summary.allocation.reservedPercent * 2.51).toFixed(1)} ${Math.max(0, 251.3 - summary.allocation.reservedPercent * 2.51).toFixed(1)}`;

  return (
    <div
      className={`
        ${isDark ? "bg-bg-dark text-text-light" : "bg-light-bg text-charcoal"}
        font-mono antialiased overflow-hidden h-screen flex flex-col relative selection:bg-cyber-blue selection:text-white transition-colors duration-300
      `}
    >
      <div className={`h-8 w-full ${isDark ? "bg-card-dark border-border-dark" : "bg-light-gray border-border-gray"} border-b flex items-center justify-between px-4 z-50`}>
        <div className={`flex items-center gap-2 text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase tracking-wider`}>
          <span className="w-1.5 h-1.5 rounded-full bg-pro-green animate-pulse"></span>
          System_Status: ONLINE
        </div>
        <div className={`text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code`}>
          TERMINAL_ID: HM-USER-NODE-01
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isDark={isDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <main className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-bg-dark" : "bg-light-bg"} relative overflow-hidden`}>
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
                  {formatCurrency(summary.totalBalance)} <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} ml-1`}>{summary.currency}</span>
                </div>
              </div>
              <div className={`h-10 w-px ${isDark ? "bg-border-dark" : "bg-border-gray"}`}></div>
              <button
                onClick={loadPortfolio}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 ${isDark ? "bg-card-dark border-border-dark text-text-light hover:border-cyber-blue" : "bg-white border-border-gray text-charcoal hover:border-cyber-blue"} font-code text-xs border transition-all`}
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                <span className="hidden sm:inline">[REFRESH]</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`${isDark ? "text-text-muted hover:text-cyber-blue" : "text-gray-400 hover:text-cyber-blue"} transition-colors`}
              >
                <span className="material-symbols-outlined">{isDark ? "light_mode" : "dark_mode"}</span>
              </button>
            </div>
          </header>

          <div className={`px-4 md:px-8 border-b ${isDark ? "border-border-dark bg-bg-dark/50" : "border-border-gray bg-white/50"} z-20`}>
            <div className="flex items-center overflow-x-auto no-scrollbar">
              {(["PORTFOLIO", "DEPOSIT", "WITHDRAW"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold font-code border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? "border-cyber-blue text-cyber-blue" : "border-transparent text-text-muted hover:text-near-white"}`}
                >
                  {tab === "PORTFOLIO" ? "PORTFOLIO_OVERVIEW" : tab === "DEPOSIT" ? "DEPOSIT_FUNDS" : "WITHDRAW_FUNDS"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
            <div className="max-w-6xl mx-auto space-y-8">
              {error ? (
                <div className={`border px-4 py-3 text-[11px] uppercase tracking-widest ${isDark ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className={`border px-4 py-3 text-[11px] uppercase tracking-widest ${isDark ? "border-pro-green/40 bg-pro-green/10 text-pro-green" : "border-green-200 bg-green-50 text-green-600"}`}>
                  {success}
                </div>
              ) : null}

              {activeTab === "PORTFOLIO" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <MetricCard isDark={isDark} label="TOTAL_BALANCE" value={formatCurrency(summary.totalBalance)} footerLabel="POSITIONS_TOTAL" footerValue={String(summary.positions.total)} icon="account_balance" />
                    <MetricCard isDark={isDark} label="AVAILABLE" value={formatCurrency(summary.available)} valueClass="text-pro-green" footerLabel="AVAILABLE_RATIO" footerValue={`${summary.allocation.availablePercent.toFixed(1)}%`} icon="check_circle" />
                    <MetricCard isDark={isDark} label="RESERVED" value={formatCurrency(summary.reserved)} valueClass="text-warning-amber" footerLabel="LOCKED_STAKE" footerValue={`${summary.allocation.reservedPercent.toFixed(1)}%`} icon="lock" />
                    <MetricCard isDark={isDark} label="CLAIMABLE_PAYOUTS" value={formatCurrency(summary.claimablePayouts)} valueClass="text-warning-amber" footerLabel="READY_TO_CLAIM" footerValue={`${summary.claimableMarketsCount} MARKETS`} icon="redeem" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 py-2">
                    <button onClick={() => setActiveTab("DEPOSIT")} className="px-6 py-2.5 bg-cyber-blue text-bg-dark font-code text-xs font-bold border border-cyber-blue hover:bg-transparent hover:text-cyber-blue transition-all uppercase">[Deposit USDC]</button>
                    <button onClick={() => setActiveTab("WITHDRAW")} className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-text-light border-border-dark" : "bg-white text-charcoal border-border-gray"} font-code text-xs border hover:border-cyber-blue transition-all uppercase`}>[Withdraw]</button>
                    <button onClick={() => navigate("/markets-terminal")} className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-text-light border-border-dark" : "bg-white text-charcoal border-border-gray"} font-code text-xs border hover:border-cyber-blue transition-all uppercase`}>[Trade Markets]</button>
                    <button onClick={() => navigate("/payouts")} className={`px-6 py-2.5 ${isDark ? "bg-card-dark text-warning-amber border-warning-amber/30" : "bg-white text-warning-amber border-warning-amber/30"} font-code text-xs border hover:bg-warning-amber hover:text-bg-dark transition-all uppercase flex items-center gap-2`}>
                      <span className="material-symbols-outlined text-xs">redeem</span>
                      [Claim Payouts]
                    </button>
                  </div>

                  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-8`}>
                    <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="relative w-48 h-48 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle className={`${isDark ? "text-border-dark" : "text-border-gray"}`} cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                          <circle className="text-pro-green" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray={availableDash} strokeWidth="8"></circle>
                          <circle className="text-warning-amber" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray={reservedDash} strokeDashoffset={-Number(availableDash.split(" ")[0])} strokeWidth="8"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase`}>Ratio</span>
                          <span className={`text-xl font-bold font-code ${isDark ? "text-text-light" : "text-charcoal"}`}>
                            {summary.reserved === 0 ? "INF" : `${(summary.available / Math.max(summary.reserved, 1)).toFixed(1)}:1`}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-6">
                        <h2 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>Balance_Allocation</h2>
                        <div className="space-y-4">
                          <AllocationRow isDark={isDark} color="bg-pro-green" label="AVAILABLE_FUNDS" value={`${summary.allocation.availablePercent.toFixed(1)}%`} />
                          <AllocationRow isDark={isDark} color="bg-warning-amber" label="RESERVED_FUNDS" value={`${summary.allocation.reservedPercent.toFixed(1)}%`} />
                          <div className="pt-4">
                            <p className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code leading-relaxed`}>
                              Wallet allocation is now read from the live ledger. Available funds reflect spendable USDC, while reserved funds are locked in active orders and in-flight withdrawals.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-8`}>
                    <h2 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest mb-6`}>YOUR_POSITIONS</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-code text-[11px]">
                        <thead>
                          <tr className={`border-b ${isDark ? "border-border-dark" : "border-border-gray"} pb-4`}>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Market_ID</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Question</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Tokens</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>State</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase`}>Payout</th>
                            <th className={`pb-4 font-normal ${isDark ? "text-text-muted" : "text-gray-500"} uppercase text-right`}>Action</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? "divide-border-dark/30" : "divide-border-gray/30"}`}>
                          {loading ? (
                            Array.from({ length: 3 }).map((_, index) => (
                              <tr key={index}>
                                <td colSpan={6} className="py-4">
                                  <div className={`h-4 rounded ${isDark ? "bg-white/5" : "bg-gray-100"}`}></div>
                                </td>
                              </tr>
                            ))
                          ) : positions.length > 0 ? (
                            positions.map((position) => (
                              <tr key={position.marketId} className={`${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                                <td className="py-4 text-cyber-blue font-bold">{position.marketId.slice(0, 12).toUpperCase()}</td>
                                <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>{position.marketQuestion}</td>
                                <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>{position.totalTokens.toFixed(2)}</td>
                                <td className="py-4">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(position.result)}`}>{position.result}</span>
                                </td>
                                <td className={`py-4 ${isDark ? "text-text-light" : "text-charcoal"}`}>
                                  {position.pendingPayout ? formatCurrency(position.pendingPayout) : "--"}
                                </td>
                                <td className="py-4 text-right">
                                  <button onClick={() => navigate(`/trading/${position.marketId}`)} className="text-cyber-blue hover:underline uppercase text-[9px] font-bold">[VIEW_MARKET]</button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-text-muted uppercase tracking-widest">
                                No positions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-cyber-blue">token</span>
                        <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>ACTIVE_POSITIONS</h3>
                      </div>
                      <div className={`border ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-light-gray"} h-[240px] p-6 font-code text-[11px] relative overflow-hidden group`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyber-blue/5 pointer-events-none"></div>
                        <div className={`${isDark ? "text-text-muted" : "text-gray-400"} mb-1`}>hydra_os@user:~/portfolio$ query --active-positions</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>Resolved: {summary.positions.active} active positions</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>Claimable markets: {summary.claimableMarketsCount}</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"} mt-2`}>Total balance: {formatCurrency(summary.totalBalance)}</div>
                        <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"} mt-4 flex items-center gap-1`}>
                          <span className="text-cyber-blue">_</span> <span className="terminal-cursor"></span>
                        </div>
                        <div className={`absolute bottom-4 right-4 text-[9px] ${isDark ? "text-text-muted/30" : "text-gray-300"} uppercase`}>LIVE_LEDGER</div>
                      </div>
                    </section>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-cyber-blue">history</span>
                        <h3 className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"} uppercase tracking-widest`}>RECENT_ACTIVITY</h3>
                      </div>
                      <div className={`border ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-light-gray"} h-[240px] p-6 font-code text-[11px] relative overflow-y-auto`}>
                        <div className={`${isDark ? "text-text-muted" : "text-gray-400"} mb-2`}>hydra_os@user:~/logs$ tail -f portfolio_activity.log</div>
                        <div className="space-y-2">
                          {activity.length > 0 ? activity.map((item) => (
                            <div key={`${item.type}-${item.id}`} className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>
                              <span className="text-cyber-blue">{item.type}</span> {item.title} :: {formatCurrency(item.amount)} :: {item.status}
                            </div>
                          )) : (
                            <div className={`${isDark ? "text-text-light/80" : "text-charcoal/80"}`}>No recent activity found.</div>
                          )}
                        </div>
                        <div className={`absolute bottom-4 right-4 text-[9px] ${isDark ? "text-text-muted/30" : "text-gray-300"} uppercase`}>ACTIVITY_STREAM</div>
                      </div>
                    </section>
                  </div>
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
                        {depositInstruction?.instructions.map((instruction, index) => (
                          <div key={instruction} className="flex gap-4">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border border-cyber-blue text-cyber-blue flex items-center justify-center text-[10px] font-bold">{index + 1}</div>
                            <div className="flex-1">
                              <p className={`text-sm ${isDark ? "text-text-light" : "text-charcoal"} font-medium mb-1`}>{instruction.split(". ").slice(1).join(". ") || instruction}</p>
                              {index === 1 ? (
                                <div className="mt-3 space-y-3">
                                  <div className="flex flex-col gap-1.5">
                                    <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Wallet_Address</label>
                                    <div className="flex gap-2">
                                      <div className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} border px-3 py-2 font-code text-[10px] md:text-xs ${isDark ? "text-text-light" : "text-charcoal"} truncate`}>
                                        {depositInstruction.depositAddress}
                                      </div>
                                      <button onClick={() => handleCopy(depositInstruction.depositAddress, "Deposit address")} className={`px-3 ${isDark ? "bg-card-dark border-border-dark text-cyber-blue hover:bg-cyber-blue hover:text-bg-dark" : "bg-white border-border-gray text-cyber-blue hover:bg-cyber-blue hover:text-white"} border transition-all text-[10px] font-bold font-code`}>
                                        [COPY]
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Memo_ID (REQUIRED)</label>
                                    <div className="flex gap-2">
                                      <div className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark" : "bg-light-gray border-border-gray"} border px-3 py-2 font-code text-[10px] md:text-xs ${isDark ? "text-text-light" : "text-charcoal"}`}>
                                        {depositInstruction.depositMemo}
                                      </div>
                                      <button onClick={() => handleCopy(depositInstruction.depositMemo, "Deposit memo")} className={`px-3 ${isDark ? "bg-card-dark border-border-dark text-cyber-blue hover:bg-cyber-blue hover:text-bg-dark" : "bg-white border-border-gray text-cyber-blue hover:bg-cyber-blue hover:text-white"} border transition-all text-[10px] font-bold font-code`}>
                                        [COPY]
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} leading-relaxed`}>
                                  {index === 0 ? `Ensure you are sending ${depositInstruction?.asset ?? "USDC"} via the ${depositInstruction?.network ?? "Solana"} network.` : "Balance updates automatically after chain confirmation."}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {depositInstruction?.warnings.map((warning) => (
                          <div key={warning} className={`${isDark ? "bg-warning-yellow/10 border-warning-yellow/30" : "bg-warning-yellow/5 border-warning-yellow/20"} border p-4 flex gap-3`}>
                            <span className="material-symbols-outlined text-warning-yellow text-xl">warning</span>
                            <div className={`text-[11px] text-warning-yellow font-medium leading-relaxed uppercase tracking-tight`}>
                              {warning}
                            </div>
                          </div>
                        ))}
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
                            {deposits.length > 0 ? deposits.map((deposit) => (
                              <tr key={deposit.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-3">{formatDate(deposit.createdAt)}</td>
                                <td className="py-3 text-pro-green">{formatCurrency(Number(deposit.amount))}</td>
                                <td className="py-3">
                                  <span className="text-pro-green font-bold">{deposit.status}</span>
                                </td>
                                <td className="py-3 text-right text-cyber-blue">
                                  {deposit.txHash ? <a href={`https://solscan.io/tx/${deposit.txHash}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{shortHash(deposit.txHash)}</a> : "N/A"}
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="py-6 text-center uppercase tracking-widest text-text-muted">No deposits found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm aspect-square flex flex-col items-center justify-center text-center`}>
                      <div className={`w-32 h-32 md:w-48 md:h-48 bg-white p-4 rounded-sm mb-6 border-4 border-cyber-blue/20`}>
                        <QRCodeSVG
                          value={depositInstruction?.depositAddress || "NO_ADDRESS"}
                          size={200}
                          level="H"
                          includeMargin={false}
                          className="w-full h-full"
                        />
                      </div>
                      <p className={`text-xs ${isDark ? "text-text-light" : "text-charcoal"} font-code mb-2`}>SCAN_FOR_ADDRESS</p>
                      <p className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} max-w-[200px]`}>
                        Memo for this account: <span className="text-cyber-blue">{depositInstruction?.depositMemo || "N/A"}</span>
                      </p>
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
                            <span className="text-sm font-bold font-code text-pro-green">{formatCurrency(summary.available)}</span>
                          </div>
                        </div>

                        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); setIsWithdrawalConfirmOpen(true); }}>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Destination_Address</label>
                              {withdrawalAddress ? (
                                isAddressValid(withdrawalAddress)
                                  ? <span className="text-pro-green text-[10px] flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> VALID</span>
                                  : <span className="text-rose-500 text-[10px] flex items-center gap-1"><span className="material-symbols-outlined text-xs">cancel</span> INVALID</span>
                              ) : null}
                            </div>
                            <input
                              className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} px-4 py-2.5 text-xs font-code focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none transition-all`}
                              placeholder="Paste Solana wallet address"
                              type="text"
                              value={withdrawalAddress}
                              onChange={(event) => setWithdrawalAddress(event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <label className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase`}>Amount (USDC)</label>
                              <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code`}>MAX: {summary.available.toFixed(2)}</span>
                            </div>
                            <div className="relative">
                              <input
                                className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} px-4 py-2.5 text-xs font-code focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none transition-all`}
                                placeholder="0.00"
                                type="number"
                                min="0"
                                step="0.01"
                                value={withdrawalAmount}
                                onChange={(event) => setWithdrawalAmount(event.target.value)}
                              />
                              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-cyber-blue" type="button" onClick={() => setWithdrawalAmount(summary.available.toFixed(2))}>
                                MAX
                              </button>
                            </div>
                          </div>
                          <div className="pt-4">
                            <button
                              type="submit"
                              disabled={!isAddressValid(withdrawalAddress) || !withdrawalAmount || Number(withdrawalAmount) <= 0 || Number(withdrawalAmount) > summary.available}
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
                          <button onClick={loadPortfolio} className={`material-symbols-outlined text-sm ${isDark ? "text-text-muted" : "text-gray-400"} cursor-pointer hover:text-cyber-blue`}>refresh</button>
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
                              {withdrawals.length > 0 ? withdrawals.map((withdrawal) => (
                                <tr key={withdrawal.id} className={`${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                                  <td className={`px-4 py-3 ${isDark ? "text-text-light" : "text-charcoal"}`}>{formatDate(withdrawal.requestedAt)}</td>
                                  <td className={`px-4 py-3 ${isDark ? "text-text-light" : "text-charcoal"}`}>{formatCurrency(Number(withdrawal.amount))}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-1.5 py-0.5 border text-[9px] font-bold ${getStatusBadge(withdrawal.status)}`}>{withdrawal.status}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {withdrawal.txHash ? (
                                      <a href={`https://solscan.io/tx/${withdrawal.txHash}`} target="_blank" rel="noopener noreferrer" className="text-cyber-blue hover:underline">
                                        {shortHash(withdrawal.txHash)}
                                      </a>
                                    ) : (
                                      <span className="text-text-muted">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={4} className="px-4 py-6 text-center uppercase tracking-widest text-text-muted">No withdrawals found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className={`p-3 ${isDark ? "bg-bg-dark/60 border-t border-border-dark" : "bg-light-gray/60 border-t border-border-gray"} text-center`}>
                          <button onClick={() => navigate("/orders")} className="text-[9px] text-cyber-blue uppercase font-bold hover:underline">View All Transactions</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isWithdrawalConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray"} border p-8 max-w-md w-full space-y-6 shadow-2xl`}>
                <div className="flex items-center gap-3 text-warning-amber">
                  <span className="material-symbols-outlined text-3xl">warning</span>
                  <h3 className="text-lg font-bold uppercase font-code">Confirm_Withdrawal</h3>
                </div>
                <p className={`text-sm ${isDark ? "text-text-muted" : "text-gray-500"} font-code leading-relaxed`}>
                  You are about to withdraw <span className={`${isDark ? "text-white" : "text-charcoal"} font-bold`}>{formatCurrency(Number(withdrawalAmount || 0))}</span> to:
                  <br /><br />
                  <span className="text-cyber-blue break-all">{withdrawalAddress}</span>
                </p>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setIsWithdrawalConfirmOpen(false)} className={`flex-1 py-3 border ${isDark ? "border-border-dark text-text-muted hover:border-white hover:text-white" : "border-border-gray text-gray-500 hover:border-charcoal hover:text-charcoal"} font-code text-xs font-bold uppercase transition-all`}>
                    [Cancel]
                  </button>
                  <button onClick={handleWithdrawalConfirm} disabled={submittingWithdrawal} className="flex-1 py-3 bg-warning-amber text-bg-dark font-code text-xs font-bold uppercase hover:bg-white transition-all disabled:opacity-50">
                    {submittingWithdrawal ? "[Submitting]" : "[Confirm_Transfer]"}
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
              <div className={`text-[8px] md:text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase hidden sm:block`}>
                Session_User: {localStorage.getItem("username") || "UNKNOWN"}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

const MetricCard = ({
  isDark,
  label,
  value,
  footerLabel,
  footerValue,
  icon,
  valueClass,
}: {
  isDark: boolean;
  label: string;
  value: string;
  footerLabel: string;
  footerValue: string;
  icon: string;
  valueClass?: string;
}) => (
  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 group relative`}>
    <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-500"} font-code uppercase mb-4 tracking-widest flex items-center justify-between`}>
      {label}
      <span className="material-symbols-outlined text-sm opacity-30">{icon}</span>
    </div>
    <div className={`text-3xl font-code font-bold tracking-tighter ${valueClass || (isDark ? "text-text-light" : "text-charcoal")}`}>{value}</div>
    <div className={`mt-4 flex items-center justify-between text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} font-code uppercase`}>
      <span>{footerLabel}</span>
      <span>{footerValue}</span>
    </div>
  </div>
);

const AllocationRow = ({
  isDark,
  color,
  label,
  value,
}: {
  isDark: boolean;
  color: string;
  label: string;
  value: string;
}) => (
  <div className={`flex items-center justify-between border-b ${isDark ? "border-border-dark/30" : "border-border-gray/30"} pb-2`}>
    <div className="flex items-center gap-3">
      <span className={`w-3 h-3 ${color}`}></span>
      <span className={`text-[11px] font-code ${isDark ? "text-text-light" : "text-charcoal"} uppercase`}>{label}</span>
    </div>
    <span className="text-[11px] font-code">{value}</span>
  </div>
);
