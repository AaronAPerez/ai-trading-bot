// ===============================================
// WEBSOCKET UTILITIES
// ===============================================

/**
 * Utility to format WebSocket connection URLs based on environment
 */
export const getWebSocketUrl = (endpoint: string, isSecure = true): string => {
  const protocol = isSecure ? 'wss' : 'ws'
  const host = typeof window !== 'undefined' 
    ? window.location.host 
    : 'localhost:3000'
  
  return `${protocol}://${host}${endpoint}`
}

/**
 * Utility to validate WebSocket message format
 */
export const validateWebSocketMessage = (message: any): boolean => {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    typeof message.timestamp === 'string'
  )
}

/**
 * Utility to handle WebSocket errors gracefully
 */
export const handleWebSocketError = (error: Event, connectionId: string): void => {
  console.error(`WebSocket error on ${connectionId}:`, error)
  
  // You could integrate with error tracking service here
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'websocket_error', {
      connection_id: connectionId,
      error_type: 'connection_error'
    })
  }
}

/**
 * Utility for WebSocket reconnection with exponential backoff
 */
export const createReconnectionStrategy = (maxAttempts = 5, baseDelay = 1000) => {
  return (attempt: number): number => {
    if (attempt > maxAttempts) {
      return -1 // Stop reconnecting
    }
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
  }
}