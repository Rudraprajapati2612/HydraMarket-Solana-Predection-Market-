import React from "react";
import { Wallet, CandlestickChart, CircleDollarSign } from "lucide-react";
import { StepCard } from "./ui/StepCard";

export const InitializationSequence = () => (
  <section className="max-w-7xl mx-auto px-6 py-24">
    <div className="text-left mb-16 border-l-4 border-neon-blue pl-6">
      <h2 className="font-code text-3xl text-white mb-2 uppercase tracking-tighter">Initialization Sequence</h2>
      <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em]">Begin Trading Protocol (3 Steps)</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 border border-white/10 bg-terminal-surface/40 backdrop-blur-md">
      <StepCard 
        number="01"
        title="Connect"
        description="Link Phantom or Solflare node. Deposit SOL collateral to initialize account."
        icon={Wallet}
      />
      <StepCard 
        number="02"
        title="Predict"
        description="Acquire positional shares. Market price indicates probability of outcome execution."
        icon={CandlestickChart}
      />
      <StepCard 
        number="03"
        title="Redeem"
        description="Winning shares redeem at 1.00 USDC. Automated smart contract settlement."
        icon={CircleDollarSign}
      />
    </div>
  </section>
);
