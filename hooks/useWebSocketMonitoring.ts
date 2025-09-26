'use client';

import { useState, useEffect } from "react"
import { useWebSocket } from "./useWebSocket"

/**
 * Hook for WebSocket connection monitoring
 */
export const useWebSocketMonitoring = () => {
  const { connectionStatus } = useWebSocket()
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    timestamp: Date
    event: 'connected' | 'disconnected' | 'reconnecting'
    connection: string
  }>>([])

  const [healthScore, setHealthScore] = useState(100)

  // Monitor connection status changes
  useEffect(() => {
    const connections = Object.entries(connectionStatus)
    const connectedCount = connections.filter(([, status]) => status).length
    const totalConnections = connections.length

    const score = totalConnections > 0 ? (connectedCount / totalConnections) * 100 : 0
    setHealthScore(score)

    // Add to connection history
    connections.forEach(([connection, status]) => {
      setConnectionHistory(prev => [
        {
          timestamp: new Date(),
          event: status ? 'connected' : 'disconnected',
          connection
        },
        ...prev.slice(0, 49) // Keep last 50 events
      ])
    })
  }, [connectionStatus])

  const getConnectionSummary = () => ({
    total: Object.keys(connectionStatus).length,
    connected: Object.values(connectionStatus).filter(Boolean).length,
    disconnected: Object.values(connectionStatus).filter(status => !status).length,
    healthScore: Math.round(healthScore)
  })

  return {
    connectionStatus,
    connectionHistory,
    healthScore,
    summary: getConnectionSummary()
  }
}