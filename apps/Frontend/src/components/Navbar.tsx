import React from "react";
import { Link } from "react-router-dom";
import { Terminal } from "lucide-react";
import { NavLink } from "./ui/NavLink";

export const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neon-blue/30 bg-black/80 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Terminal className="text-neon-blue w-6 h-6 animate-pulse" />
        <span className="text-xl font-code font-bold tracking-tighter text-white uppercase text-glow">
          Hydra<span className="text-neon-blue">_OS</span>
        </span>
      </div>
      
      <div className="hidden md:flex items-center gap-8">
        <NavLink>Markets</NavLink>
        <NavLink>System</NavLink>
        <NavLink>Logs</NavLink>
      </div>
      
      <div className="flex items-center gap-4">
        <Link to="/signup" className="hidden sm:block text-[10px] font-bold text-neon-blue uppercase tracking-widest hover:text-white transition-colors">
          Sign Up
        </Link>
        <Link to="/login" className="px-6 py-2 bg-neon-blue text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-neon">
          Log In
        </Link>
      </div>
    </div>
  </nav>
);
