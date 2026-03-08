import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Sidebar } from "../components/Sidebar";

export const CreateMarket = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("admin-theme");
    return (saved as "light" | "dark") || "dark";
  });

  // Form State
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resolutionSource, setResolutionSource] = useState("");
  const [quickDuration, setQuickDuration] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Datetime input states
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");

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

  const handleQuickDuration = (duration: string) => {
    setQuickDuration(duration);
    const now = new Date();
    let expiry = new Date();

    switch (duration) {
      case "5m": expiry.setMinutes(now.getMinutes() + 5); break;
      case "10m": expiry.setMinutes(now.getMinutes() + 10); break;
      case "15m": expiry.setMinutes(now.getMinutes() + 15); break;
      case "30m": expiry.setMinutes(now.getMinutes() + 30); break;
      case "1h": expiry.setHours(now.getHours() + 1); break;
      case "6h": expiry.setHours(now.getHours() + 6); break;
      case "1d": expiry.setDate(now.getDate() + 1); break;
      case "1w": expiry.setDate(now.getDate() + 7); break;
      case "1mo": expiry.setMonth(now.getMonth() + 1); break;
      default: return;
    }

    const dateStr = expiry.toISOString().split("T")[0];
    const timeStr = expiry.toTimeString().split(" ")[0].substring(0, 5);
    setExpiryDate(dateStr);
    setExpiryTime(timeStr);
    setExpiresAt(expiry.toISOString());
  };

  const handleDateTimeChange = (date: string, time: string) => {
    setExpiryDate(date);
    setExpiryTime(time);
    if (date && time) {
      const combined = new Date(`${date}T${time}`);
      setExpiresAt(combined.toISOString());
    } else {
      setExpiresAt(null);
    }
    setQuickDuration("Custom");
  };

  const formatExpiryDisplay = (iso: string | null) => {
    if (!iso) return "No expiration set";
    const date = new Date(iso);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const options: Intl.DateTimeFormatOptions = { 
      month: "long", 
      day: "numeric", 
      year: "numeric", 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    };
    
    return `Expires: ${date.toLocaleString("en-US", options)} (${diffDays > 0 ? `in ${diffDays} days` : "less than a day left"})`;
  };

  const handleCreateMarket = async () => {
    if (!question || !expiresAt) return;

    setSubmitState("loading");
    setErrorMessage("");

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app:
      // const response = await fetch('/api/markets', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ question, description, category, expiresAt, resolutionSource })
      // });
      // if (!response.ok) throw new Error('Failed to create market');

      setSubmitState("success");
      toast.success("Market created successfully");
      navigate("/markets-terminal");
    } catch (error: any) {
      setSubmitState("error");
      setErrorMessage(error.message || "An unexpected error occurred");
      toast.error("Failed to create market");
    }
  };

  const handleSaveDraft = () => {
    // In a real app, this might save to localStorage or a draft API
    toast.success("Draft saved");
  };

  const categories = ["Crypto", "Sports", "Politics", "Weather", "Other"];
  const durations = ["5m", "10m", "15m", "30m", "1h", "6h", "1d", "1w", "1mo", "Custom"];
  const commonSources = ["Pyth BTC/USD", "Pyth ETH/USD", "Pyth SOL/USD", "Manual Review"];

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
                <h1 className={`text-xl sm:text-2xl font-serif ${isDark ? "text-white" : "text-charcoal"} tracking-tight uppercase`}>Create New Market</h1>
                <p className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-500"} uppercase tracking-widest`}>Deploy a new prediction market for traders</p>
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
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
              
              {/* Left Column - Form */}
              <div className="lg:w-[60%] space-y-8">
                <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-sm"} border p-6 rounded-sm space-y-6`}>
                  
                  {/* Field 1 - Question */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-600"}`}>Market Question</label>
                    <div className="relative">
                      <textarea 
                        rows={3}
                        maxLength={200}
                        placeholder="Will BTC reach $100k by March 2026?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-3 text-sm font-sans focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none resize-none rounded-sm placeholder:${isDark ? "text-text-muted/40" : "text-gray-400"}`}
                      />
                      <span className={`absolute bottom-2 right-3 text-[10px] font-mono ${isDark ? "text-text-muted/50" : "text-gray-400"}`}>
                        {question.length} / 200
                      </span>
                    </div>
                    <p className={`text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} italic`}>Ask a clear yes/no question about a future event</p>
                  </div>

                  {/* Field 2 - Description */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-600"}`}>Description</label>
                    <div className="relative">
                      <textarea 
                        rows={4}
                        maxLength={500}
                        placeholder="Resolves YES if BTC/USD >= 100,000 at expiry according to Pyth oracle"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-3 text-sm font-sans focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none resize-none rounded-sm placeholder:${isDark ? "text-text-muted/40" : "text-gray-400"}`}
                      />
                      <span className={`absolute bottom-2 right-3 text-[10px] font-mono ${isDark ? "text-text-muted/50" : "text-gray-400"}`}>
                        {description.length} / 500
                      </span>
                    </div>
                    <p className={`text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} italic`}>Explain exactly what conditions make this resolve YES or NO</p>
                  </div>

                  {/* Field 3 - Category */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-600"}`}>Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-2.5 text-sm font-code focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none rounded-sm`}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Field 4 - Expiration Time */}
                  <div className="space-y-4">
                    <label className={`text-xs font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-600"}`}>Expiration Time</label>
                    
                    {/* Quick Select Grid */}
                    <div className="grid grid-cols-5 gap-2">
                      {durations.map(dur => (
                        <button 
                          key={dur}
                          onClick={() => dur === "Custom" ? setQuickDuration("Custom") : handleQuickDuration(dur)}
                          className={`py-1.5 text-[10px] font-bold font-code border rounded-sm transition-all
                            ${quickDuration === dur 
                              ? "bg-cyber-blue text-white border-cyber-blue shadow-[0_0_10px_rgba(0,209,255,0.3)]" 
                              : `${isDark ? "bg-bg-dark border-border-dark text-text-muted hover:border-cyber-blue hover:text-cyber-blue" : "bg-white border-border-gray text-gray-500 hover:border-cyber-blue hover:text-cyber-blue"}`
                            }
                          `}
                        >
                          [{dur}]
                        </button>
                      ))}
                    </div>

                    {/* Datetime Inputs */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-400"}`}>Date:</span>
                        <input 
                          type="date"
                          value={expiryDate}
                          onChange={(e) => handleDateTimeChange(e.target.value, expiryTime)}
                          className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-2 text-xs font-code focus:ring-1 focus:ring-cyber-blue outline-none rounded-sm`}
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className={`text-[10px] font-code ${isDark ? "text-text-muted" : "text-gray-400"}`}>Time:</span>
                        <input 
                          type="time"
                          value={expiryTime}
                          onChange={(e) => handleDateTimeChange(expiryDate, e.target.value)}
                          className={`flex-1 ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-2 text-xs font-code focus:ring-1 focus:ring-cyber-blue outline-none rounded-sm`}
                        />
                      </div>
                    </div>

                    <div className={`p-2 border ${isDark ? "bg-bg-dark/50 border-border-dark/50" : "bg-gray-50 border-gray-100"} rounded-sm`}>
                      <p className={`text-[10px] font-code ${expiresAt ? "text-cyber-blue font-bold" : isDark ? "text-text-muted/40" : "text-gray-400"}`}>
                        {formatExpiryDisplay(expiresAt)}
                      </p>
                    </div>
                  </div>

                  {/* Field 5 - Resolution Source */}
                  <div className="space-y-3">
                    <label className={`text-xs font-bold font-code uppercase tracking-wider ${isDark ? "text-text-muted" : "text-gray-600"}`}>Resolution Source</label>
                    <input 
                      type="text"
                      placeholder="Pyth BTC/USD oracle"
                      value={resolutionSource}
                      onChange={(e) => setResolutionSource(e.target.value)}
                      className={`w-full ${isDark ? "bg-bg-dark border-border-dark text-text-light" : "bg-light-gray border-border-gray text-charcoal"} border p-2.5 text-sm font-sans focus:ring-1 focus:ring-cyber-blue focus:border-cyber-blue outline-none rounded-sm placeholder:${isDark ? "text-text-muted/40" : "text-gray-400"}`}
                    />
                    <p className={`text-[10px] ${isDark ? "text-text-muted/60" : "text-gray-400"} italic`}>Where will the outcome be verified from? e.g. Pyth oracle, Cricbuzz, manual review</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {commonSources.map(source => (
                        <button 
                          key={source}
                          onClick={() => setResolutionSource(source)}
                          className={`px-2 py-1 text-[9px] font-bold font-code border rounded-sm transition-all
                            ${resolutionSource === source 
                              ? "bg-cyber-blue/20 text-cyber-blue border-cyber-blue" 
                              : `${isDark ? "bg-bg-dark border-border-dark text-text-muted hover:border-cyber-blue" : "bg-white border-border-gray text-gray-500 hover:border-cyber-blue"}`
                            }
                          `}
                        >
                          [{source}]
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={handleCreateMarket}
                      disabled={!question || !expiresAt || submitState === "loading"}
                      className={`w-full py-3 rounded-sm font-bold font-code text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2
                        ${(!question || !expiresAt || submitState === "loading")
                          ? `${isDark ? "bg-border-dark text-text-muted cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`
                          : "bg-cyber-blue text-white hover:bg-cyber-blue/90 shadow-[0_0_20px_rgba(0,209,255,0.4)] active:scale-[0.98]"
                        }
                      `}
                    >
                      {submitState === "loading" ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Creating...
                        </>
                      ) : (
                        <>🚀 Create Market</>
                      )}
                    </button>
                    
                    <button 
                      onClick={handleSaveDraft}
                      className={`w-full py-3 rounded-sm font-bold font-code text-sm uppercase tracking-widest border transition-all
                        ${isDark 
                          ? "border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/10" 
                          : "border-cyber-blue text-cyber-blue hover:bg-cyber-blue/5"
                        }
                      `}
                    >
                      Save Draft
                    </button>

                    {submitState === "error" && (
                      <p className="text-[10px] text-pro-red font-code text-center uppercase font-bold animate-pulse">
                        Error: {errorMessage}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Right Column - Live Preview */}
              <div className="lg:w-[40%]">
                <div className="sticky top-28 space-y-4">
                  <h3 className={`text-xs font-bold font-code uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-500"}`}>/// Preview</h3>
                  
                  {/* Preview Card */}
                  <div className={`${isDark ? "bg-card-dark border-border-dark" : "bg-white border-border-gray shadow-lg"} border rounded-sm overflow-hidden transition-all duration-500`}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-tighter ${isDark ? "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30" : "bg-cyber-blue/5 text-cyber-blue border-cyber-blue/20"}`}>
                          {category}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-tighter ${isDark ? "bg-pro-green/10 text-pro-green border-pro-green/30" : "bg-green-50 text-green-600 border-green-100"}`}>
                          OPEN
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h2 className={`text-base font-bold leading-snug ${question ? (isDark ? "text-text-light" : "text-charcoal") : "text-text-muted/30 italic"}`}>
                          {question || "Your question will appear here"}
                        </h2>
                        <p className={`text-xs ${isDark ? "text-text-muted" : "text-gray-500"} line-clamp-2 opacity-70`}>
                          {description || "Market description and resolution criteria..."}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-cyber-blue">sensors</span>
                          <span className={`text-[10px] font-code ${resolutionSource ? (isDark ? "text-text-muted" : "text-gray-600") : "text-text-muted/30 italic"}`}>
                            {resolutionSource || "Resolution source..."}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-cyber-blue">schedule</span>
                          <span className={`text-[10px] font-code ${expiresAt ? (isDark ? "text-text-muted" : "text-gray-600") : "text-text-muted/30 italic"}`}>
                            {expiresAt ? new Date(expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Expiration date..."}
                          </span>
                        </div>
                      </div>

                      <div className={`pt-4 border-t ${isDark ? "border-border-dark" : "border-gray-100"}`}>
                        <div className="flex justify-between items-end mb-3">
                          <div className="flex flex-col">
                            <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase font-code`}>Volume</span>
                            <span className={`text-xs font-code font-bold ${isDark ? "text-text-light" : "text-charcoal"}`}>—</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase font-code`}>YES Price</span>
                            <span className={`text-xl font-code font-bold ${isDark ? "text-white" : "text-charcoal"} block`}>50¢</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className={`flex justify-between text-[10px] font-code uppercase ${isDark ? "text-text-muted" : "text-gray-500"}`}>
                            <span className="font-bold">Probability</span>
                            <span className="text-cyber-blue">50.0%</span>
                          </div>
                          <div className={`w-full h-1.5 ${isDark ? "bg-border-dark" : "bg-gray-200"} rounded-full overflow-hidden`}>
                            <div className="h-full bg-cyber-blue shadow-[0_0_8px_#00D1FF]" style={{ width: "50%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className={`text-[10px] font-code text-center ${isDark ? "text-text-muted/40" : "text-gray-400"}`}>
                    This is how traders will see this market after creation.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <footer className={`h-10 border-t ${isDark ? "border-border-dark bg-bg-dark" : "border-border-gray bg-white"} px-8 flex items-center justify-between z-20`}>
            <div className={`text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} font-code uppercase tracking-widest`}>
              HydraMarket // Admin_Terminal // Create_Market_Module
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
