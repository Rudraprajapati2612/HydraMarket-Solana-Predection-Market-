import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

export const Login = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState("00:00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toISOString().split('T')[1].split('.')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const username = (document.getElementById("username") as HTMLInputElement).value;
    
    if (username.toLowerCase() === "admin") {
      localStorage.setItem("userRole", "admin");
      navigate("/admin");
    } else {
      localStorage.setItem("userRole", "user");
      navigate("/dashboard");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-mono antialiased overflow-hidden relative transition-colors duration-500 ${isDarkMode ? 'bg-terminal-black text-white' : 'bg-light-bg text-slate-900'}`}>
      {/* CRT Overlay */}
      {isDarkMode && <div className="fixed inset-0 z-[100] crt-overlay opacity-20 pointer-events-none"></div>}
      
      {/* Grid Background */}
      <div className={`fixed inset-0 z-0 grid-bg opacity-20 pointer-events-none ${isDarkMode ? 'grid-neon' : 'grid-light'}`}></div>

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b h-14 flex items-center px-4 sm:px-6 justify-between backdrop-blur-sm transition-colors duration-500 ${isDarkMode ? 'border-neon-blue/20 bg-terminal-black/80' : 'border-border-gray bg-white/80'}`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-xl sm:text-2xl animate-pulse ${isDarkMode ? 'text-neon-blue' : 'text-blue-600'}`}>terminal</span>
          <span className={`text-[10px] sm:text-sm font-code font-bold tracking-tight uppercase transition-colors duration-500 ${isDarkMode ? 'text-white text-glow' : 'text-slate-900'}`}>
            Hydra<span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'}>_OS</span>
          </span>
        </div>
        
        <div className="hidden sm:flex text-[10px] font-mono gap-4 transition-colors duration-500 items-center">
          <span className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>sys_time: <span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'} id="clock">{currentTime}</span></span>
          <span className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>mem_usage: 14%</span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-neon-blue' : 'hover:bg-slate-100 text-blue-600'}`}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link 
            to="/" 
            className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-widest transition-colors duration-500 flex items-center gap-1 ${isDarkMode ? 'text-gray-500 hover:text-neon-blue' : 'text-slate-400 hover:text-blue-600'}`}
          >
            <span className="material-symbols-outlined text-xs sm:text-sm">arrow_back</span>
            <span className="hidden xs:inline">[ BACK_TO_LANDING ]</span>
            <span className="xs:hidden">[ BACK ]</span>
          </Link>
          <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full animate-pulse ${isDarkMode ? 'bg-neon-green' : 'bg-emerald-500'}`}></div>
          <span className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-widest transition-colors duration-500 ${isDarkMode ? 'text-neon-green' : 'text-emerald-600'}`}>Net_Active</span>
        </div>
      </nav>

      <main className="relative z-10 flex-grow flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-md p-1 relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-black/40 backdrop-blur-md border border-neon-blue/30 shadow-neon' : 'bg-white/90 backdrop-blur-md border border-blue-200 shadow-xl'}`}
        >
          {/* Corner Accents */}
          <div className={`absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 transition-colors duration-500 ${isDarkMode ? 'border-neon-blue' : 'border-blue-600'}`}></div>
          <div className={`absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 transition-colors duration-500 ${isDarkMode ? 'border-neon-blue' : 'border-blue-600'}`}></div>
          <div className={`absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 transition-colors duration-500 ${isDarkMode ? 'border-neon-blue' : 'border-blue-600'}`}></div>
          <div className={`absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 transition-colors duration-500 ${isDarkMode ? 'border-neon-blue' : 'border-blue-600'}`}></div>

          <div className={`p-6 sm:p-8 relative z-10 transition-colors duration-500 ${isDarkMode ? 'bg-terminal-black/60' : 'bg-white/40'}`}>
            <div className="text-center mb-6 sm:mb-10">
              <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border mb-4 transition-all duration-500 ${isDarkMode ? 'border-neon-blue/50 bg-neon-blue/10 shadow-[0_0_15px_rgba(0,209,255,0.3)]' : 'border-border-gray bg-blue-50 shadow-sm'}`}>
                <span className={`material-symbols-outlined text-xl sm:text-2xl ${isDarkMode ? 'text-neon-blue' : 'text-blue-600'}`}>lock</span>
              </div>
              <h2 className={`text-xl sm:text-2xl font-code font-bold uppercase tracking-wider mb-2 transition-colors duration-500 ${isDarkMode ? 'text-white text-glow' : 'text-slate-900'}`}>Authenticate</h2>
              <p className={`text-[10px] sm:text-xs font-mono uppercase tracking-widest transition-colors duration-500 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>// SECURE_UPLINK_REQUIRED</p>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2 group/field">
                <label className={`block text-xs font-code uppercase tracking-widest transition-all duration-500 ${isDarkMode ? 'text-neon-blue group-hover/field:text-glow' : 'text-blue-600 font-bold'}`} htmlFor="username">
                  &gt; IDENTIFIER
                </label>
                <div className="relative">
                  <input 
                    className={`block w-full font-mono text-sm px-4 py-3 focus:outline-none focus:ring-1 transition-all duration-500 ${isDarkMode ? 'bg-black/50 border border-gray-700 text-white focus:border-neon-blue focus:ring-neon-blue placeholder-gray-800' : 'bg-slate-50 border border-border-gray text-slate-900 focus:border-blue-600 focus:ring-blue-600 placeholder-slate-300'}`}
                    id="username" 
                    placeholder="USR_ID or EMAIL_ADDR" 
                    type="text"
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-500 ${isDarkMode ? 'text-gray-600' : 'text-slate-300'}`}>
                    <span className="material-symbols-outlined text-sm">badge</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 group/field">
                <label className={`block text-xs font-code uppercase tracking-widest transition-all duration-500 ${isDarkMode ? 'text-neon-blue group-hover/field:text-glow' : 'text-blue-600 font-bold'}`} htmlFor="password">
                  &gt; ACCESS_KEY
                </label>
                <div className="relative">
                  <input 
                    className={`block w-full font-mono text-sm px-4 py-3 focus:outline-none focus:ring-1 transition-all duration-500 ${isDarkMode ? 'bg-black/50 border border-gray-700 text-white focus:border-neon-blue focus:ring-neon-blue placeholder-gray-800' : 'bg-slate-50 border border-border-gray text-slate-900 focus:border-blue-600 focus:ring-blue-600 placeholder-slate-300'}`}
                    id="password" 
                    placeholder="****************" 
                    type="password"
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-500 ${isDarkMode ? 'text-gray-600' : 'text-slate-300'}`}>
                    <span className="material-symbols-outlined text-sm">key</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center">
                  <input 
                    className={`h-3 w-3 rounded transition-colors duration-500 ${isDarkMode ? 'border-gray-700 bg-black text-neon-blue focus:ring-neon-blue focus:ring-offset-black' : 'border-slate-200 bg-white text-blue-600 focus:ring-blue-600'}`} 
                    id="remember-me" 
                    name="remember-me" 
                    type="checkbox"
                  />
                  <label className={`ml-2 block cursor-pointer transition-colors duration-500 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} htmlFor="remember-me">MAINTAIN_SESSION</label>
                </div>
                <div className={`transition-colors duration-500 cursor-pointer ${isDarkMode ? 'text-gray-500 hover:text-neon-blue' : 'text-slate-400 hover:text-blue-600'}`}>
                  [ RECOVER_KEY? ]
                </div>
              </div>

              <button 
                className={`w-full relative group overflow-hidden font-code font-bold uppercase tracking-widest py-3 px-4 transition-all duration-300 mt-4 ${isDarkMode ? 'bg-neon-blue/10 border border-neon-blue text-neon-blue shadow-neon-sm hover:shadow-neon' : 'bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 shadow-md'}`} 
                type="submit"
              >
                <span className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${isDarkMode ? 'group-hover:text-black' : 'text-white'}`}>
                  ACCESS_SYSTEM
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">login</span>
                </span>
                {isDarkMode && (
                  <div className="absolute inset-0 bg-neon-blue transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 z-0"></div>
                )}
              </button>
            </form>

            <div className={`mt-8 text-center border-t pt-6 transition-colors duration-500 ${isDarkMode ? 'border-gray-800' : 'border-border-gray'}`}>
              <p className={`text-xs font-mono mb-4 transition-colors duration-500 ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>NEW_USER_DETECTED?</p>
              <Link 
                className={`inline-block text-xs font-code px-4 py-2 transition-all uppercase tracking-wider border transition-colors duration-500 ${isDarkMode ? 'text-white hover:text-neon-blue border-gray-700 hover:border-neon-blue glitch-hover' : 'text-blue-600 hover:text-blue-700 border-border-gray hover:border-blue-600 bg-blue-50/50'}`} 
                to="/signup"
              >
                &lt; CREATE_NEW_IDENTITY /&gt;
              </Link>
            </div>
          </div>
          {isDarkMode && (
            <div className="absolute top-0 left-0 w-full h-1 bg-neon-blue/30 shadow-[0_0_15px_rgba(0,209,255,0.5)] animate-[scan_3s_linear_infinite] pointer-events-none opacity-20"></div>
          )}
        </motion.div>
      </main>

      <footer className={`fixed bottom-0 left-0 right-0 z-50 border-t h-8 flex items-center justify-between px-4 sm:px-6 text-[9px] sm:text-[10px] font-mono uppercase transition-colors duration-500 ${isDarkMode ? 'border-neon-blue/20 bg-terminal-black/90 text-gray-500' : 'border-border-gray bg-white/90 text-slate-400'}`}>
        <div className="flex items-center gap-3 sm:gap-6">
          <span className="flex items-center gap-1.5 sm:gap-2">
            <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isDarkMode ? 'bg-neon-green' : 'bg-emerald-500'}`}></span>
            <span className="hidden xs:inline">AUTH_SERVER: ONLINE</span>
            <span className="xs:hidden">AUTH: OK</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-neon-green' : 'bg-emerald-500'}`}></span>
            DB_NODE_01: SYNCED
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden xs:inline">ENCRYPTION: AES-256</span>
          <span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'}>VER: 2.4.0_BETA</span>
        </div>
      </footer>

      {/* Side Rails */}
      <div className={`fixed top-1/2 left-6 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-0 pointer-events-none opacity-30 transition-colors duration-500`}>
        <div className={`w-1 h-32 bg-gradient-to-b from-transparent to-transparent ${isDarkMode ? 'via-neon-blue' : 'via-blue-600'}`}></div>
        <div className={`font-mono text-[10px] writing-mode-vertical rotate-180 ${isDarkMode ? 'text-neon-blue' : 'text-blue-600'}`} style={{ writingMode: 'vertical-rl' }}>SYSTEM_DIAGNOSTICS</div>
      </div>
      <div className={`fixed top-1/2 right-6 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-0 pointer-events-none opacity-30 items-end transition-colors duration-500`}>
        <div className={`font-mono text-[10px] writing-mode-vertical ${isDarkMode ? 'text-neon-blue' : 'text-blue-600'}`} style={{ writingMode: 'vertical-rl' }}>SECURE_CHANNEL</div>
        <div className={`w-1 h-32 bg-gradient-to-b from-transparent to-transparent ${isDarkMode ? 'via-neon-blue' : 'via-blue-600'}`}></div>
      </div>
    </div>
  );
};
