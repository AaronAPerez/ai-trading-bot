'use client';

import { useEffect, useState, useRef } from 'react';
import { getEnhancedWebSocketService, AlpacaMessage } from '@/lib/services/enhancedWebSocketService';
import { useMarketStore } from '@/store/slices/marketSlice';

// ===============================================
// REAL-TIME MARKET DATA HOOK
// ===============================================

/**
 * Hook for subscribing to real-time market data
 */
export function useRealTimeMarketData(symbols: string[]) {
  const wsService = useRef(getEnhancedWebSocketService());
  const { updateQuote, addBar, setConnected, setConnectionStatus } = useMarketStore();
  const [latestData, setLatestData] = useState<Record<string, AlpacaMessage>>({});

  useEffect(() => {
    const service = wsService.current;
    const unsubscribers: Array<() => void> = [];

    // Connect and subscribe
    service.connect(symbols)
      .then(() => {
        setConnected(true);
        setConnectionStatus('connected');

        // Subscribe to quotes (q)
        const unsubQuotes = service.on('q', (data: AlpacaMessage) => {
          if (data.S && data.bp && data.ap) {
            updateQuote(data.S, {
              symbol: data.S,
              lastPrice: (data.bp + data.ap) / 2, // Mid price
              bid: data.bp,
              ask: data.ap,
              bidSize: data.bs || 0,
              askSize: data.as || 0,
              timestamp: new Date(data.t || Date.now()).toISOString(),
            });

            setLatestData(prev => ({ ...prev, [data.S!]: data }));
          }
        });

        // Subscribe to trades (t)
        const unsubTrades = service.on('t', (data: AlpacaMessage) => {
          if (data.S && data.p) {
            updateQuote(data.S, {
              symbol: data.S,
              lastPrice: data.p,
              volume: data.s || 0,
              timestamp: new Date(data.t || Date.now()).toISOString(),
            });

            setLatestData(prev => ({ ...prev, [data.S!]: data }));
          }
        });

        // Subscribe to bars (b)
        const unsubBars = service.on('b', (data: AlpacaMessage) => {
          if (data.S && data.o && data.h && data.l && data.c) {
            addBar(data.S, {
              symbol: data.S,
              timestamp: new Date(data.t || Date.now()).toISOString(),
              open: data.o,
              high: data.h,
              low: data.l,
              close: data.c,
              volume: data.v || 0,
            });

            setLatestData(prev => ({ ...prev, [data.S!]: data }));
          }
        });

        unsubscribers.push(unsubQuotes, unsubTrades, unsubBars);
      })
      .catch((error) => {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
        setConnectionStatus('disconnected');
      });

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  return {
    latestData,
    subscribe: (newSymbols: string[]) => wsService.current.subscribe(newSymbols),
    unsubscribe: (oldSymbols: string[]) => wsService.current.unsubscribe(oldSymbols),
  };
}
