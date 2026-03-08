import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Terminal, Settings, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

export const SignUp = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);

  const getSecurityLevel = (pass: string) => {
    if (!pass) return { label: "NO_INPUT", color: "text-gray-500", bar: 0 };
    
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (hasLetters && hasNumbers && hasSpecial) {
      return { label: "HIGH_SECURE", darkColor: "text-neon-green", lightColor: "text-green-600", bar: 3 };
    }
    if (hasLetters && hasSpecial) {
      return { label: "MID_TIER", darkColor: "text-neon-yellow", lightColor: "text-yellow-600", bar: 2 };
    }
    return { label: "LOW_LEVEL", darkColor: "text-neon-red", lightColor: "text-red-600", bar: 1 };
  };

  const security = getSecurityLevel(passcode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen flex flex-col font-mono antialiased overflow-x-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-terminal-black text-white' : 'bg-white text-terminal-black'}`}>
      {/* CRT Overlay */}
      {isDarkMode && <div className="fixed inset-0 z-[100] crt-overlay opacity-20 pointer-events-none"></div>}
      
      {/* Grid Background */}
      <div className={`fixed inset-0 z-[-10] grid-bg opacity-30 pointer-events-none h-full w-full ${isDarkMode ? 'grid-neon' : ''}`}></div>

      <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-colors duration-300 ${isDarkMode ? 'border-neon-blue bg-terminal-black/90' : 'border-gray-200 bg-white/90'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Terminal className={`w-5 h-5 sm:w-6 sm:h-6 animate-pulse ${isDarkMode ? 'text-neon-blue' : 'text-blue-600'}`} />
            <span className={`text-sm sm:text-xl font-code font-bold tracking-tight uppercase transition-colors duration-300 ${isDarkMode ? 'text-white text-glow' : 'text-gray-900'}`}>
              Hydra<span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'}>_OS</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a className={`text-xs font-mono uppercase tracking-widest transition-all ${isDarkMode ? 'text-neon-blue/70 hover:text-neon-blue hover:text-glow' : 'text-gray-500 hover:text-blue-600'}`} href="#">[Status]</a>
            <a className={`text-xs font-mono uppercase tracking-widest transition-all ${isDarkMode ? 'text-neon-blue/70 hover:text-neon-blue hover:text-glow' : 'text-gray-500 hover:text-blue-600'}`} href="#">[Docs]</a>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-neon-blue' : 'hover:bg-gray-100 text-blue-600'}`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/" className={`flex h-9 items-center justify-center px-4 text-xs font-bold uppercase tracking-wider transition-all border ${isDarkMode ? 'text-neon-blue border-transparent hover:bg-neon-blue/10 hover:border-neon-blue/50' : 'text-blue-600 border-transparent hover:bg-blue-50 hover:border-blue-200'}`}>
              &lt; Back_Home /&gt;
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center relative pt-24 pb-12 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          {/* Decorative Corners */}
          <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 transition-colors duration-300 ${isDarkMode ? 'border-neon-blue/50' : 'border-blue-600/30'}`}></div>
          <div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 transition-colors duration-300 ${isDarkMode ? 'border-neon-blue/50' : 'border-blue-600/30'}`}></div>
          <div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 transition-colors duration-300 ${isDarkMode ? 'border-neon-blue/50' : 'border-blue-600/30'}`}></div>
          <div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 transition-colors duration-300 ${isDarkMode ? 'border-neon-blue/50' : 'border-blue-600/30'}`}></div>

          <div className={`relative backdrop-blur-xl border p-8 z-10 transition-all duration-300 ${isDarkMode ? 'bg-black/80 border-neon-blue shadow-neon' : 'bg-white/90 border-gray-200 shadow-xl'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50 ${!isDarkMode && 'via-blue-600'}`}></div>
            
            <div className="mb-8 text-center">
              <h1 className={`font-code text-3xl font-bold uppercase tracking-tighter mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white text-glow' : 'text-gray-900'}`}>
                <span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'}>&gt;</span> Initialize_User
              </h1>
              <p className={`text-xs font-mono uppercase tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                // Create New Identity Protocol
              </p>
            </div>

            <form className="space-y-6">
              <div className="space-y-2 group">
                <label className={`block text-xs font-code uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-neon-blue/80 group-hover:text-neon-blue' : 'text-gray-600 group-hover:text-blue-600'}`}>
                  &gt; Full_Name
                </label>
                <div className="relative">
                  <input 
                    className={`w-full border font-mono text-sm px-4 py-3 outline-none transition-all ${isDarkMode ? 'bg-black/50 border-gray-700 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:shadow-neon-input placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-gray-400'}`}
                    placeholder="Enter designation..." 
                    type="text"
                  />
                  {isDarkMode && <div className="absolute right-0 top-0 bottom-0 w-1 bg-neon-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </div>
              </div>

              <div className="space-y-2 group">
                <label className={`block text-xs font-code uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-neon-blue/80 group-hover:text-neon-blue' : 'text-gray-600 group-hover:text-blue-600'}`}>
                  &gt; Username_Handle
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-mono transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>@</span>
                  <input 
                    className={`w-full border font-mono text-sm pl-8 pr-4 py-3 outline-none transition-all ${isDarkMode ? 'bg-black/50 border-gray-700 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:shadow-neon-input placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-gray-400'}`}
                    placeholder="crypto_runner" 
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className={`block text-xs font-code uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-neon-blue/80 group-hover:text-neon-blue' : 'text-gray-600 group-hover:text-blue-600'}`}>
                  &gt; Comms_Email
                </label>
                <div className="relative">
                  <input 
                    className={`w-full border font-mono text-sm px-4 py-3 outline-none transition-all ${isDarkMode ? 'bg-black/50 border-gray-700 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:shadow-neon-input placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-gray-400'}`}
                    placeholder="node@network.com" 
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-end">
                  <label className={`block text-xs font-code uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-neon-blue/80 group-hover:text-neon-blue' : 'text-gray-600 group-hover:text-blue-600'}`}>
                    &gt; Passcode
                  </label>
                  <span className={`text-[10px] font-mono uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Input_Hidden</span>
                </div>
                <div className="relative">
                  <input 
                    className={`w-full border font-mono text-sm px-4 py-3 outline-none transition-all ${isDarkMode ? 'bg-black/50 border-gray-700 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue focus:shadow-neon-input placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-gray-400'}`}
                    placeholder="••••••••••••" 
                    type={showPasscode ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-code uppercase tracking-tighter transition-colors ${isDarkMode ? 'text-neon-blue hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    {showPasscode ? "[Hide]" : "[Show]"}
                  </button>
                </div>
                
                <div className={`mt-3 border p-2 relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-code uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Security_Level:</span>
                    <span className={`text-[10px] font-code uppercase tracking-wider ${security.label !== 'NO_INPUT' ? 'animate-pulse' : ''} ${isDarkMode ? security.darkColor : security.lightColor}`}>
                      {security.label}
                    </span>
                  </div>
                  <div className={`h-1.5 w-full flex gap-0.5 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div className={`h-full w-1/3 transition-all duration-300 ${security.bar >= 1 ? (isDarkMode ? 'bg-neon-red shadow-[0_0_5px_#FF003C]' : 'bg-red-500') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`}></div>
                    <div className={`h-full w-1/3 transition-all duration-300 ${security.bar >= 2 ? (isDarkMode ? 'bg-neon-yellow shadow-[0_0_5px_#FFD600]' : 'bg-yellow-500') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`}></div>
                    <div className={`h-full w-1/3 transition-all duration-300 ${security.bar >= 3 ? (isDarkMode ? 'bg-neon-green shadow-[0_0_5px_#00FF94]' : 'bg-green-500') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`}></div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => navigate("/dashboard")}
                  className={`w-full h-12 font-code font-bold text-sm uppercase tracking-wider transition-all border flex items-center justify-center gap-2 group ${isDarkMode ? 'bg-neon-blue text-black border-neon-blue hover:bg-white hover:text-black hover:shadow-neon' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
                >
                  <Settings className={`w-5 h-5 group-hover:animate-spin`} />
                  Initialize_Account
                </button>
              </div>

              <div className="text-center pt-2">
                <p className={`text-xs font-mono transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Already initialized? 
                  <Link className={`hover:underline underline-offset-4 transition-colors uppercase tracking-wide ml-1 ${isDarkMode ? 'text-neon-blue hover:text-white decoration-neon-blue' : 'text-blue-600 hover:text-blue-800 decoration-blue-600'}`} to="/login">
                    &lt; Access_Login /&gt;
                  </Link>
                </p>
              </div>
            </form>

            <div className={`mt-8 pt-6 border-t text-center transition-colors duration-300 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <p className={`text-[10px] font-mono uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                By initializing, you agree to Protocol <a className={`hover:text-neon-blue transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} href="#">Terms</a> & <a className={`hover:text-neon-blue transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} href="#">Privacy</a>.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className={`py-6 border-t relative z-10 transition-colors duration-300 ${isDarkMode ? 'bg-black border-neon-blue/30' : 'bg-gray-50 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs font-mono text-gray-600">
          <div>
            <span className={isDarkMode ? 'text-neon-blue' : 'text-blue-600'}>System_Status:</span> ONLINE
          </div>
          <div>
            © 2024 HYDRA_OS
          </div>
        </div>
      </footer>
    </div>
  );
};
