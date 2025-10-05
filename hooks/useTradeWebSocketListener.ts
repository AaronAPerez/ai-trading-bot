/**
 * WebSocket listener hook for trade updates
 * Automatically invalidates React Query cache when trades are executed
 *
 * Note: This is a simplified version that just provides the connection status.
 * Real-time updates are handled by React Query's refetchInterval.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketContext } from './useWebSocketContext'

export function useTradeWebSocketListener() {
  const queryClient = useQueryClient()
  const { connectionStatus } = useWebSocketContext()

  // Return connection status
  // React Query will handle automatic refetching via refetchInterval in hooks
  return {
    isConnected: connectionStatus.internalWs || connectionStatus.tradingUpdates,
    messageCount: 0 // Not tracking individual messages
  }
}
