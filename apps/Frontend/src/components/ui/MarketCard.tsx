import React from "react";
import { motion } from "motion/react";

export const MarketCard = ({ category, title, vol, trend, options, image }: {
  category: string,
  title: string,
  vol: string,
  trend: 'up' | 'down' | 'neutral',
  options: { label: string, value: string, color: string, width: string }[],
  image: string
}) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-terminal-black/80 backdrop-blur-md border border-neon-blue/30 hover:border-neon-blue hover:shadow-neon transition-all duration-300 group overflow-hidden"
  >
    <div className="h-32 bg-cover bg-center relative grayscale group-hover:grayscale-0 transition-all duration-500" style={{ backgroundImage: `url(${image})` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute top-0 left-0 bg-neon-blue text-black text-[10px] font-bold px-3 py-1 font-mono uppercase">
        {category}
      </div>
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-4">
        <h3 className="font-code font-bold text-white text-sm leading-tight uppercase tracking-tight">{title}</h3>
      </div>
    </div>
    <div className="p-5 border-t border-neon-blue/10">
      <div className="flex justify-between items-center mb-6 font-mono text-[10px]">
        <div className="text-gray-500 uppercase tracking-widest">VOL: <span className="text-white font-bold">{vol}</span></div>
        <div className="w-12 h-6 flex items-center">
          <svg viewBox="0 0 60 24" className="w-full h-full">
            <path 
              d={trend === 'up' ? "M1 20L10 14L20 17L30 10L40 12L50 6L59 4" : trend === 'down' ? "M1 5L10 8L20 6L30 15L40 12L50 16L59 14" : "M1 10L10 10L20 8L30 12L40 10L50 8L59 9"} 
              stroke={trend === 'up' ? "#00FF66" : trend === 'down' ? "#FF003C" : "#00D1FF"} 
              strokeWidth="1.5" 
              fill="none" 
            />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="relative h-8 bg-white/5 border border-white/10 hover:border-neon-blue/50 cursor-pointer group/opt overflow-hidden transition-colors">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: opt.width }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`absolute left-0 top-0 bottom-0 ${opt.color} opacity-20 border-r border-white/20`} 
            />
            <div className="flex justify-between items-center w-full h-full px-3 relative z-10 font-mono text-[10px]">
              <span className={`font-bold ${opt.color.replace('bg-', 'text-')}`}>{opt.label}</span>
              <span className="text-white/70">{opt.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);
