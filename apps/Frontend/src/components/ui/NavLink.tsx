import React from "react";

export const NavLink = ({ children }: { children: React.ReactNode }) => (
  <a 
    href="#" 
    className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-blue/70 hover:text-neon-blue hover:text-glow transition-all"
  >
    [{children}]
  </a>
);
