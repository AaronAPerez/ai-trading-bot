// ===============================================
// WEBSOCKET SERVICE - Real-time Market Data Streaming
// lib/services/websocketService.ts
// ===============================================

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useMarketActions } from '@/store/unifiedTradingStore'

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * WebSocket message types from Alpaca
 */
interface AlpacaMessage {
  T: string // Message type
  S?: string // Symbol
  p?: number // Price
  s?: number // Size
  t?: string // Timestamp
  bp?: number // Bid price
  ap?: number // Ask price
  bs?: number // Bid size
  as?: number // Ask size
  [key: string]: any
}

/**
 * WebSocket service class for managing real-time connections
 */
class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private messageQueue: any[] = []
  private subscribers = new Map<string, Set<(data: any) => void>>()

  /**
   * Connect to Alpaca WebSocket stream
   */
  connect(symbols: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use Alpaca paper trading WebSocket URL
        const wsUrl = 'wss://stream.data.alpaca.markets/v2/iex'
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected to Alpaca')
          this.reconnectAttempts = 0

          // Authenticate
          this.authenticate()

          // Subscribe to symbols
          this.subscribe(symbols)

          // Start heartbeat
          this.startHeartbeat()

          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected')
          this.handleDisconnect()
        }
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error)
        reject(error)
      }
    })
  }

  /**
   * Authenticate with Alpaca
   */
  private authenticate() {
    const authMessage = {
      action: 'auth',
      key: process.env.NEXT_PUBLIC_APCA_API_KEY_ID,
      secret: process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
    }

    this.send(authMessage)
  }

  /**
   * Subscribe to symbol streams
   */
  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, queueing subscription')
      this.messageQueue.push({ action: 'subscribe', symbols })
      return
    }

    const subscribeMessage = {
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols
    }

    this.send(subscribeMessage)
    console.log(`📡 Subscribed to ${symbols.length} symbols`)
  }

  /**
   * Unsubscribe from symbol streams
   */
  unsubscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols
    }

    this.send(unsubscribeMessage)
  }

  /**
   * Send message to WebSocket
   */
  private send(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message)
      return
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string) {
    try {
      const messages = JSON.parse(data)

      if (Array.isArray(messages)) {
        messages.forEach(msg => this.processMessage(msg))
      } else {
        this.processMessage(messages)
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error)
    }
  }

  /**
   * Process individual message
   */
  private processMessage(msg: AlpacaMessage) {
    // Notify subscribers
    const messageType = msg.T
    const subscribers = this.subscribers.get(messageType)

    if (subscribers) {
      subscribers.forEach(callback => callback(msg))
    }

    // Notify symbol-specific subscribers
    if (msg.S) {
      const symbolSubscribers = this.subscribers.get(`${messageType}:${msg.S}`)
      if (symbolSubscribers) {
        symbolSubscribers.forEach(callback => callback(msg))
      }
    }
  }

  /**
   * Subscribe to specific message types
   */
  on(eventType: string, callback: (data: any) => void) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }
    this.subscribers.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(eventType)
      if (subscribers) {
        subscribers.delete(callback)
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }))
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect() {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        // Reconnect with queued symbols
        const queuedSubscriptions = this.messageQueue.filter(m => m.action === 'subscribe')
        if (queuedSubscriptions.length > 0) {
          const symbols = queuedSubscriptions.flatMap(s => s.symbols || [])
          this.connect(symbols)
        }
      }, delay)
    } else {
      console.error('❌ Max reconnection attempts reached')
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscribers.clear()
    this.messageQueue = []
    this.reconnectAttempts = 0
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    if (!this.ws) return 'disconnected'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'error'
    }
  }
}

// Singleton instance
const websocketService = new WebSocketService()

/**
 * React Hook for WebSocket connection management
 */
export function useWebSocket(symbols: string[]) {
  const { updateQuote, addBar, setConnected } = useMarketActions()
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected')
  const unsubscribers = useRef<(() => void)[]>([])

  useEffect(() => {
    if (symbols.length === 0) return

    // Connect to WebSocket
    websocketService.connect(symbols)
      .then(() => {
        setStatus('connected')
        setConnected(true)

        // Subscribe to quote updates
        const unsubQuotes = websocketService.on('q', (data: AlpacaMessage) => {
          if (data.S && data.bp && data.ap) {
            updateQuote(data.S, {
              symbol: data.S,
              bidPrice: data.bp,
              askPrice: data.ap,
              bidSize: data.bs || 0,
              askSize: data.as || 0,
              lastPrice: (data.bp + data.ap) / 2,
              lastSize: 0,
              volume: 0,
              timestamp: new Date(data.t || Date.now())
            })
          }
        })

        // Subscribe to trade updates
        const unsubTrades = websocketService.on('t', (data: AlpacaMessage) => {
          if (data.S && data.p) {
            updateQuote(data.S, {
              symbol: data.S,
              lastPrice: data.p,
              lastSize: data.s || 0,
              volume: data.s || 0,
              bidPrice: 0,
              askPrice: 0,
              bidSize: 0,
              askSize: 0,
              timestamp: new Date(data.t || Date.now())
            })
          }
        })

        // Subscribe to bar updates
        const unsubBars = websocketService.on('b', (data: AlpacaMessage) => {
          if (data.S && data.o && data.h && data.l && data.c) {
            addBar(data.S, {
              symbol: data.S,
              open: data.o,
              high: data.h,
              low: data.l,
              close: data.c,
              volume: data.v || 0,
              timestamp: new Date(data.t || Date.now())
            })
          }
        })

        unsubscribers.current = [unsubQuotes, unsubTrades, unsubBars]
      })
      .catch((error) => {
        console.error('Failed to connect WebSocket:', error)
        setStatus('error')
        setConnected(false)
      })

    // Cleanup on unmount
    return () => {
      unsubscribers.current.forEach(unsub => unsub())
      websocketService.disconnect()
      setConnected(false)
    }
  }, [symbols.join(',')]) // Re-connect if symbols change

  return {
    status,
    isConnected: status === 'connected',
    subscribe: (newSymbols: string[]) => websocketService.subscribe(newSymbols),
    unsubscribe: (oldSymbols: string[]) => websocketService.unsubscribe(oldSymbols)
  }
}

export default websocketService