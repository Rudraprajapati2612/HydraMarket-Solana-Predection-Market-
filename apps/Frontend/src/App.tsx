import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Capabilities } from "./components/Capabilities";
import { ActiveMarkets } from "./components/ActiveMarkets";
import { InitializationSequence } from "./components/InitializationSequence";
import { Footer } from "./components/Footer";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { MarketPortfolio } from "./pages/MarketPortfolio";
import { MarketsTerminal } from "./pages/MarketsTerminal";
import { Portfolio } from "./pages/Portfolio";
import { UserDashboard } from "./pages/UserDashboard";
import { CreateMarket } from "./pages/CreateMarket";
import { ResolveMarket } from "./pages/ResolveMarket";
import { Orders } from "./pages/Orders";
import { Payouts } from "./pages/Payouts";
import { Profile } from "./pages/Profile";
import TradingTerminal from "./pages/TradingTerminal";

const Home = () => {
  useEffect(() => {
    // Ensure main app is always dark
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  return (
    <div className="relative min-h-screen bg-terminal-black text-white selection:bg-neon-blue selection:text-black">
      {/* CRT Overlay */}
      <div className="fixed inset-0 z-[100] crt-overlay opacity-30 pointer-events-none"></div>

      <Navbar />

      <main className="relative pt-24 pb-12">
        <Hero />
        <Capabilities />
        <ActiveMarkets />
        <InitializationSequence />
      </main>

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#111',
          color: '#00D1FF',
          border: '1px solid rgba(0, 209, 255, 0.2)',
          fontFamily: 'monospace',
          fontSize: '12px',
        },
      }} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/market-portfolio" element={<MarketPortfolio />} />
        <Route path="/markets-terminal" element={<MarketsTerminal />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/create-market" element={<CreateMarket />} />
        <Route path="/resolve-market" element={<ResolveMarket />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/trading/:id" element={<TradingTerminal />} />
      </Routes>
    </BrowserRouter>
  );
}
