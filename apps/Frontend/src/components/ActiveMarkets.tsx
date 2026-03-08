import React from "react";
import { MarketCard } from "./ui/MarketCard";

export const ActiveMarkets = () => (
  <section className="bg-black py-24 border-y border-neon-blue/20 relative overflow-hidden">
    <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="flex items-end justify-between mb-12 border-b border-white/5 pb-6">
        <div>
          <span className="text-neon-blue text-[10px] font-mono uppercase tracking-[0.4em] block mb-2">/// DATA_STREAM</span>
          <h2 className="font-code text-3xl md:text-4xl text-white uppercase tracking-tighter">Active_Markets</h2>
        </div>
        <button className="bg-transparent border border-neon-blue/50 text-neon-blue hover:bg-neon-blue hover:text-black text-[10px] font-bold py-2 px-6 uppercase tracking-[0.2em] transition-all font-mono">
          [View_All]
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <MarketCard 
          category="CRYPTO::BTC"
          title="BTC >= $100k BY Q4 2024?"
          vol="$4.2M"
          trend="up"
          image="https://lh3.googleusercontent.com/aida-public/AB6AXuDi_loTdC9j361qzDLwcK9c5ygG-qsrBcnRR1ARz09EFm1FDocYdEmk6p5wRvJT-GhMqB4bB1wq9q4pHnHgs4A1v_rW6b2wEQh8orV8vHc50Zl8VAr08ixLe4jeMnAOSUuoObgdl9bS3z7bj-ZI_tQ8do3nS3OLA_4MfKin_8xWRwCRd4wkw3yUe6PgOEIlk1PLJw7kjyUXiaeRy771U3bxaBB43yjSN0pNuXyShFsGSKt-cS59mKgGwiAZAg2tuqCwj9c43ga1A1c"
          options={[
            { label: "YES_SHARE", value: "0.32", color: "bg-neon-green", width: "32%" },
            { label: "NO_SHARE", value: "0.68", color: "bg-neon-red", width: "68%" }
          ]}
        />
        <MarketCard 
          category="SPORTS::NBA"
          title="LAKERS CHAMPIONSHIP 2024?"
          vol="$1.8M"
          trend="down"
          image="https://lh3.googleusercontent.com/aida-public/AB6AXuA7xp9KwOsH6RyRlNY__0guYvQ9ClKotRPorWkWyTMXfYqhXW7zqzzqjDWv4zYt1DANwnXlQQyLxNV97JbmK6a7fYhd6nOWxoBJs-jc4fQtD31nLjQWrdFooB47xJBYe0ZilbrO3ZsA9wNviK__MHmP2SskMHZwmZe7ACvDAO8z7Wq8hvL611geS5MAKSNsGVn50kltz8E3XOuGn4I3NjyyX3PHiHfY01-6R2DQ14mxIwZ8b9L2BnOM8Dix-0y41_VIWnxH-VqyaGU"
          options={[
            { label: "YES_SHARE", value: "0.14", color: "bg-neon-green", width: "14%" },
            { label: "NO_SHARE", value: "0.86", color: "bg-neon-red", width: "86%" }
          ]}
        />
        <MarketCard 
          category="POL::US_ELECTION"
          title="US PRES ELECTION WINNER"
          vol="$28.5M"
          trend="neutral"
          image="https://lh3.googleusercontent.com/aida-public/AB6AXuBpL7rXog1BdTZC8wso0WjohBWfHqE3CHhPYiq4uql2Ws2tLxsc9AG08qMwsXC9932W1ytKyY2FjdIC3fx9OIE7IWm37eizzzAzC2spNYuNgB7TRteRxRpMkpCR_wwDnhyQCzi5GL4wBXxtn0GICWXZfO1T6AjIidZIq0AVTOFW9KjBW038htU6z1B8d0_G_59D3Xb5UYk0YQdIS-AeMXdMx66aBcFumLs_tIfQxtPdBBUNoCuc9YpOKSmVynk3wuM2y9bfl91ls5g"
          options={[
            { label: "DEM_SHARE", value: "0.45", color: "bg-blue-500", width: "45%" },
            { label: "GOP_SHARE", value: "0.52", color: "bg-red-500", width: "52%" }
          ]}
        />
      </div>
    </div>
  </section>
);
