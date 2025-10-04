// ===============================================
// WATCHLIST SYNC HOOK
// ===============================================

import { getEnhancedWebSocketService } from "@/phase2_implementation";
import { useMarketStore } from "@/store/slices/marketSlice";
import { useRef, useEffect } from "react";

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
