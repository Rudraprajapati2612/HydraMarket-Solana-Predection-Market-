import React from "react";
import { motion } from "motion/react";
import { SquareArrowOutUpRight } from "lucide-react";
import { StatCard } from "./ui/StatCard";

export const Hero = () => (
  <section className="relative max-w-7xl mx-auto px-6 mb-24 overflow-hidden">
    <div className="absolute inset-0 -z-10 grid-bg opacity-20 pointer-events-none h-[800px]" />
    
    <div className="max-w-5xl mx-auto pt-12 relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-neon-blue/40 text-[10px] font-code mb-8"
      >
        &gt; INITIALIZING PREDICTION PROTOCOL...<br/>
        &gt; ESTABLISHING SOLANA UPLINK... OK
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-3 px-4 py-1.5 border border-neon-green/30 bg-neon-green/5 text-neon-green text-[10px] font-code tracking-[0.2em] uppercase mb-8 rounded-sm"
      >
        <span className="w-1.5 h-1.5 bg-neon-green animate-pulse rounded-full" />
        System Status: BETA_LIVE
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-code text-5xl md:text-7xl leading-none mb-8 text-white tracking-tighter uppercase"
      >
        Trade The <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white text-glow">Future</span>.<br/>
        <span className="text-neon-blue">&gt;</span> Execute <span className="text-neon-blue italic">Prediction</span>.
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm md:text-base text-gray-500 mb-10 max-w-2xl font-mono border-l-2 border-neon-blue pl-6 py-2 uppercase tracking-wider leading-relaxed"
      >
        // ACCESS GLOBAL PREDICTION MARKETS<br/>
        High-frequency trading on real-world outcomes. Zero latency.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-6 mb-20"
      >
        <button className="h-14 px-8 bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black font-code font-bold text-sm transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] shadow-neon group">
          Initialize_Trade
          <SquareArrowOutUpRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button className="h-14 px-8 border border-white/10 hover:border-white text-gray-500 hover:text-white font-mono font-medium text-[11px] transition-all uppercase tracking-[0.3em] bg-white/5 backdrop-blur-md">
          [ Browse_Data ]
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full border border-neon-blue/30 bg-black/60 backdrop-blur-md relative"
      >
        <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-neon-blue" />
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-neon-blue" />
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-neon-blue" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-neon-blue" />
        
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neon-blue/20">
          <StatCard label="NET_VOLUME" value="$142M" change="▲ 12%" />
          <StatCard label="ACTIVE_NODES" value="12.5K" change="▲ 5%" />
          <StatCard label="OPEN_CONTRACTS" value="850" change="▲ 8%" />
        </div>
      </motion.div>
    </div>
  </section>
);
