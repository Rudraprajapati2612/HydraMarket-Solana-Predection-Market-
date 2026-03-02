// claimPayout.ts — simplified
export async function claimPayout(marketId: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3000/payouts/claim/${marketId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}
