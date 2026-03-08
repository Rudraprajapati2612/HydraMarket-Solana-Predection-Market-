import React from "react";

export const StepCard = ({ number, title, description, icon: Icon }: { number: string, title: string, description: string, icon: any }) => (
  <div className="border-b md:border-b-0 md:border-r last:border-r-0 border-white/10 p-10 hover:bg-neon-blue/5 transition-colors group">
    <div className="text-neon-blue/10 font-code text-6xl font-bold mb-6 group-hover:text-neon-blue/30 transition-all">{number}</div>
    <h3 className="text-lg font-bold text-white font-code uppercase mb-3 flex items-center gap-2">
      <Icon className="w-4 h-4 text-neon-blue" />
      {title}
    </h3>
    <p className="text-gray-500 text-[11px] font-mono leading-relaxed uppercase tracking-wide">
      {description}
    </p>
  </div>
);
