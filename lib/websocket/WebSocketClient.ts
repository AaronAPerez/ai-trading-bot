// ===============================================
// WEBSOCKET CLIENT - Real-time Data Streaming
// src/lib/websocket/WebSocketClient.ts
// ===============================================

import { EventEmitter } from 'events'
import type { 
  MarketData, 
  Quote, 
  Trade, 
  Order, 
  Position,
  AIRecommendation,
  BotActivityLog
} from '@/types/trading'

// ===============================================
// WEBSOCKET MESSAGE TYPES
// ===============================================

export interface WebSocketMessage {
  type: string
  timestamp: string
  data: any
}

export interface AlpacaStreamMessage {
  T: string // Message type
  S?: string // Symbol
  [key: string]: any
}

export interface MarketDataUpdate {
  type: 'trade' | 'quote' | 'bar' | 'dailyBar'
  symbol: string
  data: Trade | Quote | MarketData
  timestamp: Date
}

export interface AccountUpdate {
  type: 'order' | 'position' | 'account'
  data: Order | Position | any
  timestamp: Date
}

export interface BotUpdate {
  type: 'recommendation' | 'activity' | 'metrics'
  data: AIRecommendation | BotActivityLog | any
  timestamp: Date
}

// ===============================================
// WEBSOCKET CONNECTION MANAGER
// ===============================================

export class WebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private isConnected: Map<string, boolean> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map()

  constructor() {
    super()
    this.setupHeartbeat()
  }

  /**
   * Connect to a WebSocket endpoint
   */
  connect(connectionId: string, url: string, protocols?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Connecting to WebSocket: ${connectionId} - ${url}`)

        const ws = new WebSocket(url, protocols)
        this.connections.set(connectionId, ws)
        this.reconnectAttempts.set(connectionId, 0)

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            // Suppress timeout warnings for internal WebSocket connections
            if (!connectionId.includes('internal')) {
              console.warn(`⏰ WebSocket connection timeout: ${connectionId}`)
            }
            ws.close()
            reject(new Error(`WebSocket connection timeout: ${connectionId}`))
          }
        }, 10000) // 10 second timeout

        ws.onopen = () => {
          console.log(`✅ WebSocket connected: ${connectionId}`)
          clearTimeout(connectionTimeout)
          this.isConnected.set(connectionId, true)
          this.emit('connected', connectionId)
          this.clearReconnectTimer(connectionId)
          resolve()
        }

        ws.onmessage = (event) => {
          this.handleMessage(connectionId, event.data)
        }

        ws.onclose = (event) => {
          console.log(`🔌 WebSocket closed: ${connectionId}`, event.code, event.reason)
          clearTimeout(connectionTimeout)
          this.isConnected.set(connectionId, false)
          this.emit('disconnected', connectionId, event)

          // Only attempt reconnect if the connection was successfully established initially
          // and the close wasn't intentional (code 1000)
          if (event.code !== 1000 && this.reconnectAttempts.get(connectionId) !== undefined) {
            this.attemptReconnect(connectionId, url, protocols)
          } else {
            // If connection never opened or was closed intentionally, reject the promise
            reject(new Error(`WebSocket connection failed: ${connectionId} (code: ${event.code})`))
          }
        }

        ws.onerror = (error) => {
          // Suppress error warnings for internal WebSocket connections
          if (!connectionId.includes('internal')) {
            console.warn(`⚠️ WebSocket connection failed: ${connectionId} (this is normal if WebSocket server is not running)`)
          }
          clearTimeout(connectionTimeout)
          this.isConnected.set(connectionId, false)
          this.emit('connectionError', connectionId, error)

          // Don't reject immediately, let onclose handle cleanup
          // This prevents uncaught promise rejections
        }

      } catch (error) {
        console.error(`Failed to create WebSocket connection: ${connectionId}`, error)
        reject(error)
      }
    })
  }

  /**
   * Send message to specific connection
   */
  send(connectionId: string, message: any): boolean {
    const ws = this.connections.get(connectionId)
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send message: ${connectionId} not connected`)
      return false
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message)
      ws.send(messageStr)
      return true
    } catch (error) {
      console.error(`Failed to send message to ${connectionId}:`, error)
      return false
    }
  }

  /**
   * Disconnect specific connection
   */
  disconnect(connectionId: string): void {
    const ws = this.connections.get(connectionId)
    
    if (ws) {
      this.clearReconnectTimer(connectionId)
      ws.close(1000, 'Manual disconnect')
      this.connections.delete(connectionId)
      this.isConnected.set(connectionId, false)
      this.subscriptions.delete(connectionId)
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId)
    }
  }

  /**
   * Check if connection is active
   */
  isConnectionActive(connectionId: string): boolean {
    return this.isConnected.get(connectionId) || false
  }

  /**
   * Get connection status for all connections
   */
  getConnectionStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {}
    for (const [connectionId, connected] of this.isConnected.entries()) {
      statuses[connectionId] = connected
    }
    return statuses
  }

  /**
   * Subscribe to specific channels/symbols
   */
  subscribe(connectionId: string, channels: string[]): boolean {
    if (!this.subscriptions.has(connectionId)) {
      this.subscriptions.set(connectionId, new Set())
    }

    const connectionSubs = this.subscriptions.get(connectionId)!
    channels.forEach(channel => connectionSubs.add(channel))

    return this.send(connectionId, {
      action: 'subscribe',
      channels
    })
  }

  /**
   * Unsubscribe from specific channels/symbols
   */
  unsubscribe(connectionId: string, channels: string[]): boolean {
    const connectionSubs = this.subscriptions.get(connectionId)
    if (connectionSubs) {
      channels.forEach(channel => connectionSubs.delete(channel))
    }

    return this.send(connectionId, {
      action: 'unsubscribe',
      channels
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: string, data: string): void {
    try {
      const parsed = JSON.parse(data)
      this.emit('message', connectionId, parsed)
      
      // Handle different message types
      if (Array.isArray(parsed)) {
        // Alpaca-style message array
        parsed.forEach(msg => this.processAlpacaMessage(connectionId, msg))
      } else {
        // Single message
        this.processMessage(connectionId, parsed)
      }

    } catch (error) {
      console.error(`Failed to parse WebSocket message from ${connectionId}:`, error)
      console.error('Raw message:', data)
    }
  }

  /**
   * Process Alpaca-style messages
   */
  private processAlpacaMessage(connectionId: string, message: AlpacaStreamMessage): void {
    const { T: type, S: symbol } = message

    switch (type) {
      case 'success':
        console.log(`✅ Alpaca WebSocket success: ${message.msg}`)
        break

      case 'subscription':
        console.log(`📡 Alpaca subscription confirmed:`, message)
        break

      case 't': // Trade
        this.emit('trade', {
          type: 'trade',
          symbol,
          data: this.parseAlpacaTrade(message),
          timestamp: new Date()
        } as MarketDataUpdate)
        break

      case 'q': // Quote
        this.emit('quote', {
          type: 'quote',
          symbol,
          data: this.parseAlpacaQuote(message),
          timestamp: new Date()
        } as MarketDataUpdate)
        break

      case 'b': // Bar (minute)
        this.emit('bar', {
          type: 'bar',
          symbol,
          data: this.parseAlpacaBar(message),
          timestamp: new Date()
        } as MarketDataUpdate)
        break

      case 'd': // Daily bar
        this.emit('dailyBar', {
          type: 'dailyBar',
          symbol,
          data: this.parseAlpacaBar(message),
          timestamp: new Date()
        } as MarketDataUpdate)
        break

      case 'trade_updates': // Account updates
        this.emit('accountUpdate', {
          type: 'order',
          data: message,
          timestamp: new Date()
        } as AccountUpdate)
        break

      case 'error':
        console.error(`Alpaca WebSocket error:`, message)
        this.emit('error', {
          type: 'websocket_error',
          error: message.msg || 'Unknown error',
          code: message.code,
          timestamp: new Date()
        })
        break

      default:
        console.log(`Unknown Alpaca message type: ${type}`, message)
    }
  }

  /**
   * Process custom application messages
   */
  private processMessage(connectionId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'bot_recommendation':
        this.emit('botRecommendation', {
          type: 'recommendation',
          data: message.data,
          timestamp: new Date(message.timestamp)
        } as BotUpdate)
        break

      case 'bot_activity':
        this.emit('botActivity', {
          type: 'activity',
          data: message.data,
          timestamp: new Date(message.timestamp)
        } as BotUpdate)
        break

      case 'bot_metrics':
        this.emit('botMetrics', {
          type: 'metrics',
          data: message.data,
          timestamp: new Date(message.timestamp)
        } as BotUpdate)
        break

      case 'price_update':
        this.emit('priceUpdate', message.data)
        break

      default:
        console.log(`Unknown message type: ${message.type}`, message)
    }
  }

  /**
   * Parse Alpaca trade message
   */
  private parseAlpacaTrade(message: AlpacaStreamMessage): Trade {
    return {
      symbol: message.S!,
      price: message.p,
      size: message.s,
      timestamp: new Date(message.t),
      conditions: message.c || []
    }
  }

  /**
   * Parse Alpaca quote message
   */
  private parseAlpacaQuote(message: AlpacaStreamMessage): Quote {
    return {
      symbol: message.S!,
      bid: message.bp,
      ask: message.ap,
      bidSize: message.bs,
      askSize: message.as,
      timestamp: new Date(message.t)
    }
  }

  /**
   * Parse Alpaca bar message
   */
  private parseAlpacaBar(message: AlpacaStreamMessage): MarketData {
    return {
      symbol: message.S!,
      timestamp: new Date(message.t),
      open: message.o,
      high: message.h,
      low: message.l,
      close: message.c,
      volume: message.v,
      vwap: message.vw,
      trades: message.n
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(connectionId: string, url: string, protocols?: string[]): void {
    const attempts = this.reconnectAttempts.get(connectionId) || 0
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${connectionId}`)
      this.emit('reconnectFailed', connectionId)
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts) // Exponential backoff
    console.log(`🔄 Reconnecting ${connectionId} in ${delay}ms (attempt ${attempts + 1})`)

    const timer = setTimeout(async () => {
      try {
        this.reconnectAttempts.set(connectionId, attempts + 1)
        await this.connect(connectionId, url, protocols)
        
        // Resubscribe to previous channels
        const subs = this.subscriptions.get(connectionId)
        if (subs && subs.size > 0) {
          this.send(connectionId, {
            action: 'subscribe',
            channels: Array.from(subs)
          })
        }

      } catch (error) {
        console.error(`Reconnection failed for ${connectionId}:`, error)
        this.attemptReconnect(connectionId, url, protocols)
      }
    }, delay)

    this.reconnectTimers.set(connectionId, timer)
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(connectionId: string): void {
    const timer = this.reconnectTimers.get(connectionId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(connectionId)
    }
    this.reconnectAttempts.set(connectionId, 0)
  }

  /**
   * Setup heartbeat to detect stale connections
   */
  private setupHeartbeat(): void {
    setInterval(() => {
      for (const [connectionId, ws] of this.connections.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          this.send(connectionId, { type: 'ping', timestamp: Date.now() })
        }
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer)
    }
    this.reconnectTimers.clear()

    // Close all connections
    this.disconnectAll()

    // Remove all listeners
    this.removeAllListeners()
  }
}

// ===============================================
// ALPACA WEBSOCKET CLIENT
// ===============================================

export class AlpacaWebSocketClient {
  private wsManager: WebSocketManager
  private apiKey: string
  private apiSecret: string
  private isPaperTrading: boolean
  private isAuthenticated: Map<string, boolean> = new Map()

  constructor(apiKey: string, apiSecret: string, isPaperTrading = true) {
    this.wsManager = new WebSocketManager()
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.isPaperTrading = isPaperTrading
    
    this.setupEventHandlers()
  }

  /**
   * Connect to Alpaca market data stream
   */
  async connectMarketData(feed: 'iex' | 'sip' | 'delayed_sip' = 'iex'): Promise<void> {
    const baseUrl = this.isPaperTrading 
      ? 'wss://stream.data.sandbox.alpaca.markets'
      : 'wss://stream.data.alpaca.markets'
    
    const url = `${baseUrl}/v2/${feed}`
    
    try {
      await this.wsManager.connect('market_data', url)
      await this.authenticateConnection('market_data')
    } catch (error) {
      throw new Error(`Failed to connect to Alpaca market data: ${error}`)
    }
  }

  /**
   * Connect to Alpaca crypto data stream
   */
  async connectCryptoData(): Promise<void> {
    const baseUrl = this.isPaperTrading
      ? 'wss://stream.data.sandbox.alpaca.markets'
      : 'wss://stream.data.alpaca.markets'
    
    const url = `${baseUrl}/v1beta3/crypto/us`
    
    try {
      await this.wsManager.connect('crypto_data', url)
      await this.authenticateConnection('crypto_data')
    } catch (error) {
      throw new Error(`Failed to connect to Alpaca crypto data: ${error}`)
    }
  }

  /**
   * Connect to Alpaca trading updates stream
   */
  async connectTradingUpdates(): Promise<void> {
    const baseUrl = this.isPaperTrading
      ? 'wss://paper-api.alpaca.markets'
      : 'wss://api.alpaca.markets'
    
    const url = `${baseUrl}/stream`
    
    try {
      await this.wsManager.connect('trading_updates', url)
      await this.authenticateConnection('trading_updates')
      
      // Subscribe to trade updates
      this.wsManager.send('trading_updates', {
        action: 'listen',
        data: {
          streams: ['trade_updates']
        }
      })
    } catch (error) {
      throw new Error(`Failed to connect to Alpaca trading updates: ${error}`)
    }
  }

  /**
   * Subscribe to stock quotes and trades
   */
  subscribeToStocks(symbols: string[], dataTypes: ('trades' | 'quotes' | 'bars')[] = ['quotes']): boolean {
    const subscription: any = { action: 'subscribe' }
    
    dataTypes.forEach(type => {
      subscription[type] = symbols
    })

    return this.wsManager.send('market_data', subscription)
  }

  /**
   * Subscribe to crypto data
   */
  subscribeToCrypto(symbols: string[], dataTypes: ('trades' | 'quotes' | 'bars')[] = ['quotes']): boolean {
    const subscription: any = { action: 'subscribe' }
    
    dataTypes.forEach(type => {
      subscription[type] = symbols
    })

    return this.wsManager.send('crypto_data', subscription)
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribeFromStocks(symbols: string[], dataTypes: ('trades' | 'quotes' | 'bars')[]): boolean {
    const subscription: any = { action: 'unsubscribe' }
    
    dataTypes.forEach(type => {
      subscription[type] = symbols
    })

    return this.wsManager.send('market_data', subscription)
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    marketData: boolean
    cryptoData: boolean
    tradingUpdates: boolean
  } {
    return {
      marketData: this.wsManager.isConnectionActive('market_data'),
      cryptoData: this.wsManager.isConnectionActive('crypto_data'),
      tradingUpdates: this.wsManager.isConnectionActive('trading_updates')
    }
  }

  /**
   * Authenticate WebSocket connection
   */
  private async authenticateConnection(connectionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Authentication timeout for ${connectionId}`))
      }, 10000)

      const handleAuth = (connId: string, message: any) => {
        if (connId === connectionId) {
          // Different streams have different success message formats
          const isAuthenticated =
            (message.T === 'success' && message.msg === 'authenticated') || // Market/crypto data
            (message.stream === 'authorization' && message.data && message.data.status === 'authorized') || // Trading updates
            (message.T === 'success' && message.msg === 'connected') // Alternative success format

          if (isAuthenticated) {
            console.log(`✅ Successfully authenticated ${connectionId}`)
            clearTimeout(timeout)
            this.isAuthenticated.set(connectionId, true)
            this.wsManager.removeListener('message', handleAuth)
            resolve()
          } else if (message.T === 'error' || (message.stream === 'authorization' && message.data?.status === 'unauthorized')) {
            console.error(`❌ Authentication failed for ${connectionId}:`, message)
            clearTimeout(timeout)
            this.wsManager.removeListener('message', handleAuth)
            reject(new Error(`Authentication failed: ${message.msg || message.data?.reason || 'Unknown error'}`))
          }
        }
      }

      this.wsManager.on('message', handleAuth)

      // Send authentication - format varies by stream type
      let authMessage: any

      if (connectionId === 'market_data' || connectionId === 'crypto_data') {
        // Market/crypto data stream authentication
        authMessage = {
          action: 'auth',
          key: this.apiKey,
          secret: this.apiSecret
        }
      } else if (connectionId === 'trading_updates') {
        // Trading updates stream authentication
        authMessage = {
          action: 'authenticate',
          data: {
            key_id: this.apiKey,
            secret_key: this.apiSecret
          }
        }
      } else {
        // Default format
        authMessage = {
          action: 'auth',
          key: this.apiKey,
          secret: this.apiSecret
        }
      }

      console.log(`🔐 Authenticating ${connectionId} with message:`, { action: authMessage.action, hasKey: !!authMessage.key || !!authMessage.data?.key_id })
      this.wsManager.send(connectionId, authMessage)
    })
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.wsManager.on('connected', (connectionId) => {
      console.log(`🔗 Alpaca WebSocket connected: ${connectionId}`)
    })

    this.wsManager.on('disconnected', (connectionId) => {
      console.log(`🔌 Alpaca WebSocket disconnected: ${connectionId}`)
      this.isAuthenticated.set(connectionId, false)
    })

    this.wsManager.on('error', (connectionId, error) => {
      console.error(`❌ Alpaca WebSocket error: ${connectionId}`, error)
    })
  }

  /**
   * Get event emitter for listening to data
   */
  getEventEmitter(): EventEmitter {
    return this.wsManager
  }

  /**
   * Disconnect all connections
   */
  disconnect(): void {
    this.wsManager.disconnectAll()
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.wsManager.destroy()
  }
}