import WebSocket from 'ws'

/**
 * Alpaca WebSocket Client for Real-time Market Data
 * Connects to Alpaca's streaming API for live price updates
 */
export class AlpacaWebSocketClient {
  private ws: WebSocket | null = null
  private isConnected = false
  private subscriptions = new Set<string>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<string, (data: any) => void> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    console.log('📡 AlpacaWebSocketClient initialized')
  }

  /**
   * Connect to Alpaca WebSocket stream
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('⚠️ Already connected to Alpaca WebSocket')
      return
    }

    const apiKey = process.env.APCA_API_KEY_ID
    const secretKey = process.env.APCA_API_SECRET_KEY

    if (!apiKey || !secretKey) {
      throw new Error('Missing Alpaca API credentials')
    }

    // Use data stream for market data
    const wsUrl = process.env.NEXT_PUBLIC_TRADING_MODE === 'live'
      ? 'wss://stream.data.alpaca.markets/v2/iex'
      : 'wss://stream.data.alpaca.markets/v2/iex' // IEX data for paper trading

    console.log(`📡 Connecting to Alpaca WebSocket: ${wsUrl}`)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.on('open', () => {
          console.log('✅ WebSocket connected to Alpaca')

          // Authenticate
          this.send({
            action: 'auth',
            key: apiKey,
            secret: secretKey
          })
        })

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const messages = JSON.parse(data.toString())

            // Handle array of messages
            if (Array.isArray(messages)) {
              messages.forEach(msg => this.handleMessage(msg))
            } else {
              this.handleMessage(messages)
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error)
          }
        })

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error)
          reject(error)
        })

        this.ws.on('close', () => {
          console.log('🔌 WebSocket disconnected')
          this.isConnected = false
          this.attemptReconnect()
        })

        // Set a timeout for the initial connection
        setTimeout(() => {
          if (this.isConnected) {
            resolve()
          }
        }, 5000)

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(msg: any) {
    // Handle authentication success
    if (msg.T === 'success' && msg.msg === 'authenticated') {
      console.log('✅ WebSocket authenticated')
      this.isConnected = true

      // Resubscribe to previous subscriptions if reconnecting
      if (this.subscriptions.size > 0) {
        this.subscribeToSymbols(Array.from(this.subscriptions))
      }

      // Start heartbeat
      this.startHeartbeat()
      return
    }

    // Handle subscription confirmation
    if (msg.T === 'subscription') {
      console.log('📊 Subscription confirmed:', msg)
      return
    }

    // Handle trade updates (real-time price data)
    if (msg.T === 't') {
      const handler = this.messageHandlers.get('trade')
      if (handler) {
        handler({
          symbol: msg.S,
          price: msg.p,
          size: msg.s,
          timestamp: msg.t,
          exchange: msg.x
        })
      }
    }

    // Handle quote updates (bid/ask)
    if (msg.T === 'q') {
      const handler = this.messageHandlers.get('quote')
      if (handler) {
        handler({
          symbol: msg.S,
          bidPrice: msg.bp,
          bidSize: msg.bs,
          askPrice: msg.ap,
          askSize: msg.as,
          timestamp: msg.t
        })
      }
    }

    // Handle bar updates (minute bars)
    if (msg.T === 'b') {
      const handler = this.messageHandlers.get('bar')
      if (handler) {
        handler({
          symbol: msg.S,
          open: msg.o,
          high: msg.h,
          low: msg.l,
          close: msg.c,
          volume: msg.v,
          timestamp: msg.t
        })
      }
    }
  }

  /**
   * Subscribe to real-time data for symbols
   */
  subscribeToSymbols(symbols: string[], dataTypes: ('trades' | 'quotes' | 'bars')[] = ['trades', 'quotes']) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected, queuing subscription for:', symbols)
      symbols.forEach(s => this.subscriptions.add(s))
      return
    }

    symbols.forEach(s => this.subscriptions.add(s))

    const subscription: any = { action: 'subscribe' }

    if (dataTypes.includes('trades')) {
      subscription.trades = symbols
    }
    if (dataTypes.includes('quotes')) {
      subscription.quotes = symbols
    }
    if (dataTypes.includes('bars')) {
      subscription.bars = symbols
    }

    this.send(subscription)
    console.log(`📊 Subscribed to ${dataTypes.join(', ')} for: ${symbols.join(', ')}`)
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribeFromSymbols(symbols: string[]) {
    if (!this.isConnected) return

    symbols.forEach(s => this.subscriptions.delete(s))

    this.send({
      action: 'unsubscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols
    })

    console.log(`📊 Unsubscribed from: ${symbols.join(', ')}`)
  }

  /**
   * Register a handler for specific message types
   */
  onMessage(type: 'trade' | 'quote' | 'bar', handler: (data: any) => void) {
    this.messageHandlers.set(type, handler)
  }

  /**
   * Send a message to the WebSocket
   */
  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('⚠️ WebSocket not ready, cannot send:', data)
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.ping()
      }
    }, 30000)
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * Disconnect from WebSocket
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

    this.isConnected = false
    this.reconnectAttempts = 0
    console.log('🔌 Disconnected from Alpaca WebSocket')
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Singleton instance for server-side use
let wsClientInstance: AlpacaWebSocketClient | null = null

export function getAlpacaWebSocketClient(): AlpacaWebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new AlpacaWebSocketClient()
  }
  return wsClientInstance
}
