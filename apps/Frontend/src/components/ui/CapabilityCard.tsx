import React from "react";
import { motion } from "motion/react";

export const CapabilityCard = ({ icon: Icon, title, description, progress, status, colorClass }: { 
  icon: any, 
  title: string, 
  description: string, 
  progress: string, 
  status: string,
  colorClass: string
}) => (
  <motion.div 
    whileHover={{ borderColor: 'currentColor' }}
    className="bg-terminal-surface/60 backdrop-blur-md border border-white/10 p-8 transition-colors group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-30">
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
    <h3 className="font-code text-xl text-white mb-4 uppercase flex items-center gap-2">
      <span className={`${colorClass}`}>&gt;</span> {title}
    </h3>
    <p className="text-gray-400 font-mono text-xs leading-relaxed mb-6 h-12">
      {description}
    </p>
    <div className="h-1 w-full bg-white/5 mt-auto">
      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: progress }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className={`h-full ${colorClass.replace('text-', 'bg-')}`} 
      />
    </div>
    <div className={`mt-2 text-right text-[10px] ${colorClass} font-mono uppercase tracking-widest`}>
      {status}
    </div>
  </motion.div>
);
