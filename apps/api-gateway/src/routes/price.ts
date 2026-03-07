import {Elysia} from "elysia";
import { EventSource } from "eventsource";
// GET /price/btc/stream — WebSocket endpoint
// Elysia has built-in WebSocket support

export const priceStreamRoute = new Elysia()
  .ws('/price/:symbol/stream', {
    open(ws) {
      const symbol = ws.data.params.symbol.toUpperCase();
      
      const FEED_IDS: Record<string, string> = {
        BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
        ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
        SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
      };

      const feedId = FEED_IDS[symbol];
      if (!feedId) { ws.close(); return; }

      // Connect to Pyth's SSE stream
      const pythUrl = `https://hermes.pyth.network/v2/updates/price/stream?ids[]=${feedId}`;
      
      const eventSource = new EventSource(pythUrl);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const feed = data.parsed?.[0];
        if (!feed) return;

        const expo  = Number(feed.price.expo);
        const price = Number(feed.price.price) * Math.pow(10, expo);
        const conf  = Number(feed.price.conf)  * Math.pow(10, expo);

        ws.send(JSON.stringify({
          symbol,
          price:       Math.round(price * 100) / 100,
          confidence:  Math.round(conf  * 100) / 100,
          publishTime: feed.price.publish_time,
          timestamp:   Date.now(),
        }));
      };

      // Clean up Pyth connection when client disconnects
      (ws.data as any)._eventSource = eventSource;
    },

    close(ws) {
      const es = (ws.data as any)._eventSource as EventSource;
      es?.close();
    },
  });