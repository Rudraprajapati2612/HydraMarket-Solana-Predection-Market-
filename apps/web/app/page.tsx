'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ClaimButton from './components/ClaimButton';

const API_BASE = 'http://localhost:3000';

async function saveWalletToDb(walletAddress: string) {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ No token in localStorage — user not logged in');
    return false;
  }

  const res = await fetch(`${API_BASE}/users/wallet`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ walletAddress }),
  });

  const data = await res.json();
  if (data.success) {
    console.log('✅ Wallet saved to DB:', walletAddress);
    return true;
  } else {
    console.error('❌ Failed to save wallet:', data.error);
    return false;
  }
}

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [walletStatus, setWalletStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  // Save wallet whenever BOTH conditions are true:
  //   1. Wallet is connected
  //   2. User is logged in (token exists)
  // This handles both orderings: login-first or connect-first
  useEffect(() => {
    if (!connected || !publicKey || !isLoggedIn) return;

    setWalletStatus('saving');

    saveWalletToDb(publicKey.toBase58())
      .then(success => setWalletStatus(success ? 'saved' : 'error'))
      .catch(() => setWalletStatus('error'));

  }, [connected, publicKey, isLoggedIn]);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>HydraMarket</h1>

      {/* Login status */}
      {!isLoggedIn && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
          ⚠️ <a href="/login">Login first</a> before connecting your wallet
        </div>
      )}

      {/* Wallet connect */}
      <WalletMultiButton />

      {/* Wallet status feedback */}
      {connected && publicKey && (
        <p style={{ marginTop: 8, fontSize: 14 }}>
          {walletStatus === 'saving' && '⏳ Saving wallet address...'}
          {walletStatus === 'saved'  && '✅ Wallet linked to your account'}
          {walletStatus === 'error'  && '❌ Failed to link wallet — are you logged in?'}
          {walletStatus === 'idle'   && `Connected: ${publicKey.toBase58().slice(0,8)}...`}
        </p>
      )}

      <hr style={{ margin: '24px 0' }} />

      <h2>Open Positions</h2>

      {/* Only show claim button if wallet is linked */}
      {walletStatus !== 'saved' && connected && (
        <p style={{ color: '#ef4444' }}>
          Wallet must be linked before claiming. 
          {walletStatus === 'error' ? ' Please login and refresh.' : ''}
        </p>
      )}

      <ClaimButton
        marketId="e3ccfcca-8c83-4fdb-bcbd-8a1bfde57d0c"
        disabled={walletStatus !== 'saved'}
      />
    </div>
  );
}
