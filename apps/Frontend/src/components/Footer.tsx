import React from "react";
import { Terminal, Twitter, Github } from "lucide-react";

export const Footer = () => (
  <footer className="bg-black pt-20 pb-10 border-t-2 border-neon-blue">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Terminal className="text-neon-blue w-5 h-5" />
            <span className="text-lg font-code font-bold text-white tracking-tighter uppercase">Hydra_OS</span>
          </div>
          <p className="text-gray-600 text-[10px] font-mono leading-relaxed max-w-xs uppercase tracking-widest">
            // Decentralized Intelligence Network<br/>
            Running on Solana v1.18<br/>
            System State: ONLINE
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-600 hover:text-neon-blue transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-gray-600 hover:text-neon-blue transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <h4 className="text-neon-blue font-code text-[11px] uppercase tracking-[0.2em] mb-2">[ PLATFORM ]</h4>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Markets</a>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Portfolio</a>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Leaderboard</a>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="text-neon-blue font-code text-[11px] uppercase tracking-[0.2em] mb-2">[ RESOURCES ]</h4>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Docs_v1</a>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Blog_Feed</a>
          <a href="#" className="text-gray-600 hover:text-white text-[10px] font-mono uppercase tracking-widest hover:translate-x-1 transition-transform">&gt; Terms.txt</a>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 font-mono text-[10px]">
          <div className="flex items-center gap-2 text-neon-green mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
            SYSTEM OPERATIONAL
          </div>
          <div className="text-gray-600 uppercase tracking-widest leading-loose">
            TPS: 2,450<br/>
            Latency: 12ms
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-700 uppercase tracking-[0.2em]">
        <p>© 2024 HYDRA_MARKET. ALL RIGHTS RESERVED.</p>
        <p>NOT FINANCIAL ADVICE.</p>
      </div>
    </div>
  </footer>
);
