'use client';

// ===============================================
// WEBSOCKET CONTEXT PROVIDER
// ===============================================

import { useWebSocket } from '@/hooks/useWebSocket'
import React, { ReactNode } from 'react'
import { WebSocketContext } from '@/hooks/useWebSocketContext'

/**
 * WebSocket Provider Component
 */
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const webSocketData = useWebSocket()

  return (
    <WebSocketContext.Provider value={webSocketData}>
      {children}
    </WebSocketContext.Provider>
  )
}

