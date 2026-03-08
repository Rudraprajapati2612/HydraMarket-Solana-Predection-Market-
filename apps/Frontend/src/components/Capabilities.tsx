import React from "react";
import { Bolt, ShieldCheck, TrendingUp } from "lucide-react";
import { CapabilityCard } from "./ui/CapabilityCard";

export const Capabilities = () => (
  <section className="max-w-7xl mx-auto px-6 py-16 border-t border-neon-blue/10 relative">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-6 text-neon-blue font-code text-[10px] uppercase tracking-[0.4em]">
      // SYSTEM_CAPABILITIES
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <CapabilityCard 
        icon={Bolt}
        title="Speed"
        description="Solana Mainnet execution. Sub-second finality confirmed."
        progress="98%"
        status="LATENCY: 400ms"
        colorClass="text-neon-blue"
      />
      <CapabilityCard 
        icon={ShieldCheck}
        title="Security"
        description="Non-custodial architecture. Audit verification complete."
        progress="100%"
        status="INTEGRITY: 100%"
        colorClass="text-neon-green"
      />
      <CapabilityCard 
        icon={TrendingUp}
        title="Yield"
        description="Idle capital utilization protocol active. Automated APY generation."
        progress="15%"
        status="APY: ACTIVE"
        colorClass="text-white"
      />
    </div>
  </section>
);
