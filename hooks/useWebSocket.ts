'use client';

// ===============================================
// WEBSOCKET REACT HOOKS - Store Integration
// MIGRATED TO UNIFIED TRADING STORE
// src/hooks/useWebSocket.ts
// ===============================================

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { AlpacaWebSocketClient, WebSocketManager } from '@/lib/websocket/WebSocketClient'
import { useUnifiedTradingStore, useMarketActions, usePortfolioActions, useAIActions } from '@/store/unifiedTradingStore'
import type {
  MarketDataUpdate,
  AccountUpdate,
  BotUpdate
} from '@/lib/websocket/WebSocketClient'
import type { Quote, Trade, MarketData } from '@/types/trading'



// ===============================================
// MAIN WEBSOCKET HOOK
// ===============================================

/**
 * Main WebSocket hook for real-time trading data
 */
export const useWebSocket = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    marketData: boolean
    cryptoData: boolean
    tradingUpdates: boolean
    internalWs: boolean
  }>({
    marketData: false,
    cryptoData: false,
    tradingUpdates: false,
    internalWs: false
  })

  const alpacaClientRef = useRef<AlpacaWebSocketClient | null>(null)
  const internalWsRef = useRef<WebSocketManager | null>(null)
  const isMountedRef = useRef(true)

  // Store actions - memoized to prevent infinite loops
  const marketActionsHook = useMarketActions()
  const portfolioActionsHook = usePortfolioActions()
  const aiActionsHook = useAIActions()

  const marketActions = useMemo(() => ({
    updateQuote: marketActionsHook.updateQuote,
    updateQuotes: marketActionsHook.updateQuotes,
    setConnectionStatus: (status: string) => {
      // Connection status update if needed
      console.log('Connection status:', status)
    }
  }), [marketActionsHook])

  const portfolioActions = useMemo(() => ({
    updatePosition: portfolioActionsHook.updatePosition,
    setPositions: portfolioActionsHook.setPositions
  }), [portfolioActionsHook])

  const aiActions = useMemo(() => ({
    addRecommendation: aiActionsHook.addRecommendation,
    updateRecommendation: aiActionsHook.updateRecommendation
  }), [aiActionsHook])

  const watchlist = useUnifiedTradingStore(useCallback((state) => state.watchlist, []))

  /**
   * Map connection ID to status key
   */
  const getConnectionKey = useCallback((connectionId: string): keyof typeof connectionStatus => {
    switch (connectionId) {
      case 'market_data': return 'marketData'
      case 'crypto_data': return 'cryptoData'
      case 'trading_updates': return 'tradingUpdates'
      case 'internal': return 'internalWs'
      default: return 'marketData'
    }
  }, [])

  /**
   * Setup Alpaca event listeners
   */
  const setupAlpacaEventListeners = useCallback((client: AlpacaWebSocketClient) => {
    const eventEmitter = client.getEventEmitter()

    // Market data events
    eventEmitter.on('quote', (update: MarketDataUpdate) => {
      const quote = update.data as Quote
      const avgPrice = (quote.bid + quote.ask) / 2
      marketActions.updateQuote(quote.symbol, {
        symbol: quote.symbol,
        lastPrice: avgPrice,
        bid: quote.bid,
        ask: quote.ask,
        timestamp: new Date().toISOString()
      })
    })

    eventEmitter.on('trade', (update: MarketDataUpdate) => {
      const trade = update.data as Trade
      marketActions.updateQuote(trade.symbol, {
        symbol: trade.symbol,
        lastPrice: trade.price,
        volume: trade.size,
        timestamp: new Date().toISOString()
      })
    })

    eventEmitter.on('bar', (update: MarketDataUpdate) => {
      const bar = update.data as MarketData
      marketActions.updateQuote(bar.symbol, {
        symbol: bar.symbol,
        lastPrice: bar.close,
        timestamp: new Date().toISOString()
      })
    })

    // Account updates
    eventEmitter.on('accountUpdate', (update: AccountUpdate) => {
      switch (update.type) {
        case 'position':
          const positionUpdate = update.data
          portfolioActions.updatePosition(positionUpdate.symbol, positionUpdate)
          break
      }
    })

    // Connection status events
    eventEmitter.on('connected', (connectionId: string) => {
      if (isMountedRef.current) {
        setConnectionStatus(prev => ({
          ...prev,
          [getConnectionKey(connectionId)]: true
        }))
        marketActions.setConnectionStatus('connected')
      }
    })

    eventEmitter.on('disconnected', (connectionId: string) => {
      if (isMountedRef.current) {
        setConnectionStatus(prev => ({
          ...prev,
          [getConnectionKey(connectionId)]: false
        }))
        marketActions.setConnectionStatus('disconnected')
      }
    })

    eventEmitter.on('reconnectFailed', () => {
      marketActions.setConnectionStatus('disconnected')
    })
  }, [marketActions, portfolioActions, getConnectionKey])

  /**
   * Setup internal WebSocket event listeners
   */
  const setupInternalEventListeners = useCallback((wsManager: WebSocketManager) => {
    // Bot updates
    wsManager.on('botRecommendation', (update: BotUpdate) => {
      aiActions.addRecommendation(update.data)
    })

    // Price updates from internal sources
    wsManager.on('priceUpdate', (data: { symbol: string; price: number; change?: number }) => {
      marketActions.updateQuote(data.symbol, {
        symbol: data.symbol,
        lastPrice: data.price,
        change: data.change,
        timestamp: new Date().toISOString()
      })
    })

    // Connection status
    wsManager.on('connected', () => {
      if (isMountedRef.current) {
        setConnectionStatus(prev => ({ ...prev, internalWs: true }))
      }
    })

    wsManager.on('disconnected', () => {
      if (isMountedRef.current) {
        setConnectionStatus(prev => ({ ...prev, internalWs: false }))
      }
    })
  }, [aiActions, marketActions])

  /**
   * Initialize WebSocket connections
   */
  const initializeConnections = useCallback(async () => {
    if (isInitialized) return

    try {
      // Get API credentials from environment
      const apiKey = process.env.NEXT_PUBLIC_APCA_API_KEY_ID
      const apiSecret = process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
      const isPaperTrading = process.env.NEXT_PUBLIC_TRADING_MODE !== 'live'

      if (!apiKey || !apiSecret) {
        console.warn('⚠️ Alpaca API credentials not found, WebSocket disabled')
        return
      }

      // Skip Alpaca WebSocket connections in development to avoid authentication errors
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Skipping Alpaca WebSocket connections to avoid auth errors')
        // Only initialize internal WebSocket for bot communication
        const internalWs = new WebSocketManager()
        internalWsRef.current = internalWs

        try {
          const internalWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
          await internalWs.connect('internal', internalWsUrl)
          setupInternalEventListeners(internalWs)
          if (isMountedRef.current) {
            setConnectionStatus(prev => ({ ...prev, internalWs: true }))
            setIsInitialized(true)
          }
          console.log('✅ Internal WebSocket connection initialized (dev mode)')
        } catch (error) {
          // Suppress timeout errors for optional internal WebSocket
          if (!(error instanceof Error && error.message.includes('timeout'))) {
            console.warn('⚠️ Internal WebSocket server not available:', error)
          }
          if (isMountedRef.current) {
            setIsInitialized(true)
          }
        }
        return
      }

      console.log('🚀 Initializing WebSocket connections...')

      // Initialize Alpaca WebSocket client
      const alpacaClient = new AlpacaWebSocketClient(apiKey, apiSecret, isPaperTrading)
      alpacaClientRef.current = alpacaClient

      // Initialize internal WebSocket manager
      const internalWs = new WebSocketManager()
      internalWsRef.current = internalWs

      // Connect to Alpaca streams
      await Promise.all([
        alpacaClient.connectMarketData('iex'),
        alpacaClient.connectCryptoData(),
        alpacaClient.connectTradingUpdates()
      ])

      // Connect to internal WebSocket server (if available)
      try {
        const internalWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
        await internalWs.connect('internal', internalWsUrl)
        if (isMountedRef.current) {
          setConnectionStatus(prev => ({ ...prev, internalWs: true }))
        }
      } catch (error) {
        // Suppress timeout errors for optional internal WebSocket
        if (!(error instanceof Error && error.message.includes('timeout'))) {
          console.warn('⚠️ Internal WebSocket server not available:', error)
        }
      }

      // Setup event listeners
      setupAlpacaEventListeners(alpacaClient)
      setupInternalEventListeners(internalWs)

      // Subscribe to watchlist symbols
      if (watchlist.length > 0) {
        alpacaClient.subscribeToStocks(watchlist, ['quotes', 'trades'])
        
        // Subscribe to crypto symbols
        const cryptoSymbols = watchlist.filter((symbol: string) =>
          symbol.includes('USD') || symbol.includes('BTC') || symbol.includes('ETH')
        )
        if (cryptoSymbols.length > 0) {
          alpacaClient.subscribeToCrypto(cryptoSymbols, ['quotes', 'trades'])
        }
      }

      if (isMountedRef.current) {
        setIsInitialized(true)
      }
      console.log('✅ WebSocket connections initialized successfully')

    } catch (error) {
      console.error('❌ Failed to initialize WebSocket connections:', error)
    }
  }, [isInitialized, watchlist, setupAlpacaEventListeners, setupInternalEventListeners])

  /**
   * Subscribe to new symbols
   */
  const subscribeToSymbols = useCallback((symbols: string[]) => {
    const client = alpacaClientRef.current
    if (!client) return

    const stockSymbols = symbols.filter(s => !s.includes('USD'))
    const cryptoSymbols = symbols.filter(s => s.includes('USD'))

    if (stockSymbols.length > 0) {
      client.subscribeToStocks(stockSymbols, ['quotes', 'trades'])
    }

    if (cryptoSymbols.length > 0) {
      client.subscribeToCrypto(cryptoSymbols, ['quotes', 'trades'])
    }
  }, [])

  /**
   * Unsubscribe from symbols
   */
  const unsubscribeFromSymbols = useCallback((symbols: string[]) => {
    const client = alpacaClientRef.current
    if (!client) return

    const stockSymbols = symbols.filter(s => !s.includes('USD'))
    const cryptoSymbols = symbols.filter(s => s.includes('USD'))

    if (stockSymbols.length > 0) {
      client.unsubscribeFromStocks(stockSymbols, ['quotes', 'trades'])
    }

    if (cryptoSymbols.length > 0) {
      // TODO: Implement crypto unsubscription when available
      console.log('Crypto unsubscription not yet implemented for:', cryptoSymbols)
    }
  }, [])

  /**
   * Send message to internal WebSocket
   */
  const sendInternalMessage = useCallback((message: object) => {
    const internalWs = internalWsRef.current
    if (internalWs) {
      return internalWs.send('internal', message)
    }
    return false
  }, [])

  /**
   * Cleanup connections
   */
  const cleanup = useCallback(() => {
    isMountedRef.current = false

    if (alpacaClientRef.current) {
      alpacaClientRef.current.destroy()
      alpacaClientRef.current = null
    }

    if (internalWsRef.current) {
      internalWsRef.current.destroy()
      internalWsRef.current = null
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true
    initializeConnections()

    // Cleanup on unmount
    return cleanup
  }, [initializeConnections, cleanup])

  // Subscribe to watchlist changes
  useEffect(() => {
    if (isInitialized && watchlist.length > 0) {
      subscribeToSymbols(watchlist)
    }
  }, [watchlist, isInitialized, subscribeToSymbols])

  return {
    isInitialized,
    connectionStatus,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    sendInternalMessage,
    cleanup
  }
}

// ===============================================
// SPECIALIZED WEBSOCKET HOOKS
// ===============================================

/**
 * Hook for real-time market data updates
 */
export const useRealTimeMarketData = (symbols?: string[]) => {
  const { subscribeToSymbols, unsubscribeFromSymbols, connectionStatus } = useWebSocket()
  const [prices, setPrices] = useState<Record<string, { price: number; timestamp: Date }>>({})

  // Get quotes from store
  const quotes = useUnifiedTradingStore(useCallback((state) => state.quotes, []))

  // Subscribe to symbols on mount
  useEffect(() => {
    if (symbols && symbols.length > 0 && connectionStatus.marketData) {
      subscribeToSymbols(symbols)

      return () => {
        unsubscribeFromSymbols(symbols)
      }
    }
  }, [symbols, connectionStatus.marketData, subscribeToSymbols, unsubscribeFromSymbols])

  // Update prices when store changes
  useEffect(() => {
    const priceData: Record<string, { price: number; timestamp: Date }> = {}
    Object.values(quotes).forEach(quote => {
      if (quote) {
        priceData[quote.symbol] = {
          price: quote.lastPrice,
          timestamp: new Date(quote.timestamp)
        }
      }
    })
    setPrices(priceData)
  }, [quotes])

  return {
    prices,
    isConnected: connectionStatus.marketData || connectionStatus.cryptoData,
    connectionStatus
  }
}

/**
 * Hook for real-time trading updates
 */
export const useTradingUpdates = () => {
  const { connectionStatus, sendInternalMessage } = useWebSocket()
  // Get data from store
  const positions = useUnifiedTradingStore(useCallback((state) => state.positions, []))

  const sendOrderUpdate = useCallback((orderData: object) => {
    return sendInternalMessage({
      type: 'order_update',
      data: orderData,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  return {
    positions,
    isConnected: connectionStatus.tradingUpdates,
    sendOrderUpdate
  }
}

/**
 * Hook for AI bot real-time updates
 */
export const useBotWebSocket = () => {
  const { connectionStatus, sendInternalMessage } = useWebSocket()

  // Get data from store
  const recommendations = useUnifiedTradingStore(useCallback((state) => state.recommendations, []))

  const sendBotCommand = useCallback((command: string, data?: unknown) => {
    return sendInternalMessage({
      type: 'bot_command',
      command,
      data,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  const sendRecommendationFeedback = useCallback((recommendationId: string, executed: boolean, result?: unknown) => {
    return sendInternalMessage({
      type: 'recommendation_feedback',
      recommendationId,
      executed,
      result,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  return {
    recommendations,
    isConnected: connectionStatus.internalWs,
    sendBotCommand,
    sendRecommendationFeedback
  }
}

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

// ===============================================
// WEBSOCKET CONTEXT PROVIDER
// ===============================================

import React, { createContext, useContext, ReactNode } from 'react'

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
  sendInternalMessage: (message: object) => boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

/**
 * WebSocket Provider Component
 */
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const webSocketData = useWebSocket()

  return React.createElement(
    WebSocketContext.Provider,
    { value: webSocketData },
    children
  )
}

/**
 * Hook to use WebSocket context
 */
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

// ===============================================
// WEBSOCKET STATUS COMPONENT
// ===============================================

import { Wifi, WifiOff, Activity } from 'lucide-react'

export const WebSocketStatusIndicator: React.FC = () => {
  const { connectionStatus, healthScore } = useWebSocketMonitoring()

  const getStatusColor = () => {
    if (healthScore >= 80) return 'text-green-400'
    if (healthScore >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = () => {
    if (healthScore >= 80) return React.createElement(Wifi, { size: 16 })
    if (healthScore >= 50) return React.createElement(Activity, { size: 16 })
    return React.createElement(WifiOff, { size: 16 })
  }

  const connectionIndicators = Object.entries(connectionStatus).map(([key, connected]) =>
    React.createElement('div', {
      key,
      className: `w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`,
      title: `${key}: ${connected ? 'Connected' : 'Disconnected'}`
    })
  )

  return React.createElement('div', {
    className: 'flex items-center space-x-2'
  }, [
    React.createElement('div', {
      key: 'icon',
      className: getStatusColor()
    }, getStatusIcon()),
    React.createElement('div', {
      key: 'status',
      className: 'text-xs text-gray-400'
    }, [
      React.createElement('div', {
        key: 'score'
      }, `WebSocket: ${healthScore}%`),
      React.createElement('div', {
        key: 'indicators',
        className: 'flex space-x-1'
      }, connectionIndicators)
    ])
  ])
}

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
export const validateWebSocketMessage = (message: unknown): boolean => {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof (message as Record<string, unknown>).type === 'string' &&
    typeof (message as Record<string, unknown>).timestamp === 'string'
  )
}

/**
 * Utility to handle WebSocket errors gracefully
 */
export const handleWebSocketError = (error: Event, connectionId: string): void => {
  console.error(`WebSocket error on ${connectionId}:`, error)

  // You could integrate with error tracking service here
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
    ;((window as unknown as Record<string, unknown>).gtag as (...args: unknown[]) => void)('event', 'websocket_error', {
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

