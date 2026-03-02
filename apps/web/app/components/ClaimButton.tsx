'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { claimPayout } from '../lib/claimPayout';

type ClaimButtonProps = {
  marketId: string;
  disabled?: boolean;
};

export default function ClaimButton({ marketId, disabled = false }: ClaimButtonProps) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    // Check wallet connected
    if (!wallet.connected || !wallet.publicKey) {
      alert('Connect your Phantom wallet first');
      return;
    }

    // Check logged in
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to claim');
      return;
    }

    setLoading(true);
    try {
      const result = await claimPayout(marketId, wallet);
      alert(`🎉 Claimed ${result.payout} USDC!\nTx: ${result.txSignature}`);
      window.location.reload();
    } catch (err: any) {
      console.error('Claim error:', err);
      alert(`Claim failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClaim}
      disabled={disabled || loading || !wallet.connected}
      style={{
        padding: '10px 24px',
        backgroundColor: (!disabled && wallet.connected) ? '#10b981' : '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: (!disabled && wallet.connected) ? 'pointer' : 'not-allowed',
        fontSize: 16,
      }}
    >
      {loading ? 'Claiming...' : 'Claim Payout'}
    </button>
  );
}
