import { useState, useEffect, useRef } from 'react';

const BTC_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const HERMES_URL = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${BTC_FEED_ID}`;
const POLL_INTERVAL = 2000;
const MAX_HISTORY = 100;

export interface PricePoint {
  timestamp: number;
  price: number;
  publishTime: number;
}

export interface PythPrice {
  current: number | null;
  previous: number | null;
  confidence: number | null;
  priceHistory: PricePoint[];
  lastUpdated: number | null;
  isConnected: boolean;
  error: string | null;
}

export function usePythPrice(): PythPrice {
  const [current, setCurrent]           = useState<number | null>(null);
  const [previous, setPrevious]         = useState<number | null>(null);
  const [confidence, setConfidence]     = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [lastUpdated, setLastUpdated]   = useState<number | null>(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const intervalRef                     = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = async () => {
    try {
      const res  = await fetch(HERMES_URL);
      if (!res.ok) throw new Error(`Pyth returned ${res.status}`);

      const data = await res.json();
      const feed = data.parsed?.[0];
      if (!feed) throw new Error('No feed data');

      const expo     = Number(feed.price.expo);
      const price    = Number(feed.price.price) * Math.pow(10, expo);
      const conf     = Number(feed.price.conf)  * Math.pow(10, expo);
      const pubTime  = feed.price.publish_time;

      setPrevious(current);
      setCurrent(price);
      setConfidence(conf);
      setLastUpdated(Date.now());
      setIsConnected(true);
      setError(null);

      setPriceHistory(prev => {
        const newPoint = { timestamp: Date.now(), price, publishTime: pubTime };
        // Avoid duplicate points if publishTime hasn't changed (optional but good)
        if (prev.length > 0 && prev[prev.length - 1].publishTime === pubTime) {
            return prev;
        }
        return [...prev, newPoint].slice(-MAX_HISTORY);
      });
    } catch (e: any) {
      setError(e.message);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchPrice(); // immediate first fetch
    intervalRef.current = setInterval(fetchPrice, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { current, previous, confidence, priceHistory, lastUpdated, isConnected, error };
}
