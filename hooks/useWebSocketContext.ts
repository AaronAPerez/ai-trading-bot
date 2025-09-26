import { useContext, createContext } from "react"

interface WebSocketContextType {
  isInitialized: boolean
  connectionStatus: {
    marketData: boolean
    cryptoData: boolean
    tradingUpdates: boolean
    internalWs: boolean
  }
  subscribeToSymbols: (symbols: string[]) => void
  unsubscribeFromSymbols: (symbols: string[]) => void
  sendInternalMessage: (message: any) => boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

/**
 * Hook to use WebSocket context
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    // Provide fallback implementation instead of throwing
    console.warn('useWebSocketContext is being used outside of WebSocketProvider, providing fallback')
    return {
      isInitialized: false,
      connectionStatus: {
        marketData: false,
        cryptoData: false,
        tradingUpdates: false,
        internalWs: false
      },
      subscribeToSymbols: () => {},
      unsubscribeFromSymbols: () => {},
      sendInternalMessage: () => false
    }
  }
  return context
}

export { WebSocketContext }
