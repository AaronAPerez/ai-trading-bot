/**
 * REACT HOOKS FOR WEBSOCKET INTEGRATION
 * 
 * Provides React hooks for easy WebSocket integration with:
 * - Automatic connection management
 * - Real-time market data updates
 * - Connection status monitoring
 * - Symbol subscription management
 * - Integration with Zustand store
 * 
 * @fileoverview React hooks for WebSocket service
 * @version 2.0.0
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getEnhancedWebSocketService, ConnectionStatus, AlpacaMessage } from '@/lib/services/enhancedWebSocketService';
import { useMarketStore } from '@/store/slices/marketSlice';

// ===============================================
// WEBSOCKET CONNECTION HOOK
// ===============================================

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocketConnection(symbols: string[] = []) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const wsService = useRef(getEnhancedWebSocketService());

  useEffect(() => {
    const service = wsService.current;

    // Subscribe to status changes
    const unsubStatus = service.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Connect if not already connected
    if (!service.isConnected() && symbols.length > 0) {
      service.connect(symbols).catch((err) => {
        console.error('WebSocket connection error:', err);
        setError(err);
      });
    } else if (service.isConnected() && symbols.length > 0) {
      // Already connected, just subscribe to new symbols
      service.subscribe(symbols);
    }

    return () => {
      unsubStatus();
    };
  }, [symbols.join(',')]);

  const connect = useCallback(async (newSymbols?: string[]) => {
    try {
      await wsService.current.connect(newSymbols || symbols);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [symbols]);

  const disconnect = useCallback(() => {
    wsService.current.disconnect();
  }, []);

  const subscribe = useCallback((newSymbols: string[]) => {
    wsService.current.subscribe(newSymbols);
  }, []);

  const unsubscribe = useCallback((oldSymbols: string[]) => {
    wsService.current.unsubscribe(oldSymbols);
  }, []);

  return {
    status,
    error,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    stats: wsService.current.getStats(),
  };
}

// ===============================================
// SYMBOL-SPECIFIC DATA HOOK
// ===============================================

/**
 * Hook for subscribing to a specific symbol's data
 */
export function useSymbolData(symbol: string) {
  const wsService = useRef(getEnhancedWebSocketService());
  const [quote, setQuote] = useState<any>(null);
  const [trade, setTrade] = useState<any>(null);
  const [bar, setBar] = useState<any>(null);

  useEffect(() => {
    const service = wsService.current;
    const unsubscribers: Array<() => void> = [];

    service.connect([symbol])
      .then(() => {
        // Subscribe to this symbol's quotes
        const unsubQuote = service.on(`q:${symbol}`, (data: AlpacaMessage) => {
          setQuote(data);
        });

        // Subscribe to this symbol's trades
        const unsubTrade = service.on(`t:${symbol}`, (data: AlpacaMessage) => {
          setTrade(data);
        });

        // Subscribe to this symbol's bars
        const unsubBar = service.on(`b:${symbol}`, (data: AlpacaMessage) => {
          setBar(data);
        });

        unsubscribers.push(unsubQuote, unsubTrade, unsubBar);
      })
      .catch(console.error);

    return () => {
      unsubscribers.forEach(unsub => unsub());
      service.unsubscribe([symbol]);
    };
  }, [symbol]);

  return { quote, trade, bar };
}

// ===============================================
// WATCHLIST SYNC HOOK
// ===============================================

/**
 * Hook that automatically syncs WebSocket subscriptions with watchlist
 */
export function useWatchlistSync() {
  const { watchlist } = useMarketStore();
  const wsService = useRef(getEnhancedWebSocketService());
  const prevWatchlistRef = useRef<string[]>([]);

  useEffect(() => {
    const service = wsService.current;
    const prevWatchlist = prevWatchlistRef.current;

    // Find added and removed symbols
    const added = watchlist.filter(s => !prevWatchlist.includes(s));
    const removed = prevWatchlist.filter(s => !watchlist.includes(s));

    if (added.length > 0) {
      console.log('📊 Adding to WebSocket:', added);
      if (service.isConnected()) {
        service.subscribe(added);
      } else {
        service.connect(added);
      }
    }

    if (removed.length > 0) {
      console.log('🚫 Removing from WebSocket:', removed);
      service.unsubscribe(removed);
    }

    prevWatchlistRef.current = [...watchlist];
  }, [watchlist]);

  return {
    watchlist,
    subscribedSymbols: wsService.current.getSubscribedSymbols(),
  };
}

// ===============================================
// CONNECTION HEALTH MONITOR HOOK
// ===============================================

/**
 * Hook for monitoring WebSocket connection health
 */
export function useWebSocketHealth() {
  const wsService = useRef(getEnhancedWebSocketService());
  const [health, setHealth] = useState({
    status: 'disconnected' as ConnectionStatus,
    reconnectAttempts: 0,
    subscribedSymbols: 0,
    queuedMessages: 0,
    isAuthenticated: false,
    lastUpdate: new Date(),
  });

  useEffect(() => {
    const updateHealth = () => {
      const stats = wsService.current.getStats();
      setHealth({
        ...stats,
        lastUpdate: new Date(),
      });
    };

    // Update immediately
    updateHealth();

    // Update every 5 seconds
    const interval = setInterval(updateHealth, 5000);

    // Subscribe to status changes for immediate updates
    const unsubStatus = wsService.current.onStatusChange(() => {
      updateHealth();
    });

    return () => {
      clearInterval(interval);
      unsubStatus();
    };
  }, []);

  return health;
}

// ===============================================
// PRICE TICKER HOOK
// ===============================================

/**
 * Hook for displaying a real-time price ticker
 */
export function usePriceTicker(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  const wsService = useRef(getEnhancedWebSocketService());

  useEffect(() => {
    const service = wsService.current;
    const unsubscribers: Array<() => void> = [];

    service.connect(symbols)
      .then(() => {
        const unsubTrades = service.on('t', (data: AlpacaMessage) => {
          if (data.S && data.p) {
            setPrices(prev => {
              const prevPrice = prev[data.S!]?.price || data.p!;
              const change = data.p! - prevPrice;
              const changePercent = (change / prevPrice) * 100;

              return {
                ...prev,
                [data.S!]: {
                  price: data.p!,
                  change,
                  changePercent,
                },
              };
            });
          }
        });

        unsubscribers.push(unsubTrades);
      })
      .catch(console.error);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  return prices;
}

// ===============================================
// RECONNECTION HANDLER HOOK
// ===============================================

/**
 * Hook for handling reconnection with custom logic
 */
export function useWebSocketReconnection(onReconnect?: () => void) {
  const wsService = useRef(getEnhancedWebSocketService());
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    const service = wsService.current;

    const unsubStatus = service.onStatusChange((status) => {
      if (status === 'reconnecting') {
        setReconnecting(true);
        setReconnectCount(prev => prev + 1);
      } else if (status === 'connected') {
        setReconnecting(false);
        if (reconnectCount > 0 && onReconnect) {
          onReconnect();
        }
      }
    });

    return () => {
      unsubStatus();
    };
  }, [reconnectCount, onReconnect]);

  const forceReconnect = useCallback(() => {
    wsService.current.disconnect();
    // Wait a moment before reconnecting
    setTimeout(() => {
      wsService.current.connect([]);
    }, 1000);
  }, []);

  return {
    reconnecting,
    reconnectCount,
    forceReconnect,
  };
}

// ===============================================
// MESSAGE LISTENER HOOK
// ===============================================

/**
 * Hook for listening to specific WebSocket message types
 */
export function useWebSocketMessage<T = AlpacaMessage>(
  messageType: string,
  callback: (data: T) => void,
  deps: any[] = []
) {
  const wsService = useRef(getEnhancedWebSocketService());

  useEffect(() => {
    const unsubscribe = wsService.current.on(messageType, callback);

    return () => {
      unsubscribe();
    };
  }, [messageType, ...deps]);
}

// ===============================================
// AGGREGATED DATA HOOK
// ===============================================

/**
 * Hook for aggregating real-time data over a time window
 */
export function useAggregatedData(symbol: string, windowMs: number = 5000) {
  const [aggregated, setAggregated] = useState({
    symbol,
    tradeCount: 0,
    totalVolume: 0,
    avgPrice: 0,
    high: 0,
    low: Infinity,
    vwap: 0, // Volume-weighted average price
  });

  const tradesBuffer = useRef<Array<{ price: number; volume: number; timestamp: number }>>([]);
  const wsService = useRef(getEnhancedWebSocketService());

  useEffect(() => {
    const service = wsService.current;

    service.connect([symbol]).then(() => {
      const unsubTrade = service.on(`t:${symbol}`, (data: AlpacaMessage) => {
        if (data.p && data.s) {
          const now = Date.now();
          
          // Add to buffer
          tradesBuffer.current.push({
            price: data.p,
            volume: data.s,
            timestamp: now,
          });

          // Remove old trades outside window
          tradesBuffer.current = tradesBuffer.current.filter(
            t => now - t.timestamp < windowMs
          );

          // Calculate aggregated metrics
          const trades = tradesBuffer.current;
          if (trades.length > 0) {
            const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
            const totalValue = trades.reduce((sum, t) => sum + t.price * t.volume, 0);
            const prices = trades.map(t => t.price);

            setAggregated({
              symbol,
              tradeCount: trades.length,
              totalVolume,
              avgPrice: totalValue / totalVolume,
              high: Math.max(...prices),
              low: Math.min(...prices),
              vwap: totalValue / totalVolume,
            });
          }
        }
      });

      return unsubTrade;
    });

    // Cleanup
    return () => {
      tradesBuffer.current = [];
    };
  }, [symbol, windowMs]);

  return aggregated;
}

// ===============================================
// EXPORT ALL HOOKS
// ===============================================

export {
  getEnhancedWebSocketService,
  type ConnectionStatus,
  type AlpacaMessage,
};