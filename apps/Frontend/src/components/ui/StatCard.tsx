import React from "react";

export const StatCard = ({ label, value, change }: { label: string, value: string, change: string }) => (
  <div className="p-6 flex flex-col gap-1 hover:bg-neon-blue/5 transition-colors border-neon-blue/20">
    <span className="text-neon-blue text-[10px] font-code uppercase tracking-widest mb-2 opacity-70">
      &gt;&gt; {label}
    </span>
    <div className="flex items-baseline gap-3">
      <span className="text-3xl md:text-4xl font-code font-bold text-white tracking-tighter">{value}</span>
      <span className="text-neon-green text-[10px] font-bold font-mono animate-pulse">{change}</span>
    </div>
  </div>
);
