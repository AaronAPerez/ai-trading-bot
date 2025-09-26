// ===============================================
// WEBSOCKET SERVER - Internal Communication Hub
// src/lib/websocket/WebSocketServer.ts
// ===============================================

import { WebSocketServer as WSServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { EventEmitter } from 'events'
import type { 
  AIRecommendation, 
  BotActivityLog, 
  BotMetrics,
  Order,
  Position
} from '@/types/trading'

// ===============================================
// WEBSOCKET MESSAGE TYPES
// ===============================================

export interface WebSocketMessage {
  type: string
  timestamp: string
  data?: any
  clientId?: string
}

export interface ClientInfo {
  id: string
  ip: string
  userAgent: string
  connectedAt: Date
  subscriptions: Set<string>
  lastPing: Date
}

// ===============================================
// WEBSOCKET SERVER CLASS
// ===============================================

export class TradingWebSocketServer extends EventEmitter {
  private wss: WSServer
  private server: any
  private clients: Map<WebSocket, ClientInfo> = new Map()
  private channels: Map<string, Set<WebSocket>> = new Map()
  private messageQueue: Map<string, WebSocketMessage[]> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private port: number
  private isRunning = false

  // Message handlers
  private messageHandlers: Map<string, (ws: WebSocket, data: any) => void> = new Map()

  constructor(port = 3001) {
    super()
    this.port = port
    this.setupMessageHandlers()
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 WebSocket server is already running')
      return
    }

    try {
      // Create HTTP server
      this.server = createServer()
      
      // Create WebSocket server
      this.wss = new WSServer({ 
        server: this.server,
        path: '/ws',
        clientTracking: true
      })

      // Setup WebSocket event handlers
      this.wss.on('connection', this.handleConnection.bind(this))
      this.wss.on('error', this.handleServerError.bind(this))

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, (error: any) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      // Start heartbeat
      this.startHeartbeat()

      this.isRunning = true
      console.log(`🚀 Trading WebSocket Server started on port ${this.port}`)
      this.emit('serverStarted', this.port)

    } catch (error) {
      console.error('❌ Failed to start WebSocket server:', error)
      throw error
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log('🛑 Stopping WebSocket server...')

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Close all client connections
    this.clients.forEach((clientInfo, ws) => {
      ws.close(1000, 'Server shutdown')
    })

    // Close WebSocket server
    if (this.wss) {
      this.wss.close()
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve())
      })
    }

    this.clients.clear()
    this.channels.clear()
    this.messageQueue.clear()
    this.isRunning = false

    console.log('✅ WebSocket server stopped')
    this.emit('serverStopped')
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = this.generateClientId()
    const clientInfo: ClientInfo = {
      id: clientId,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unknown',
      connectedAt: new Date(),
      subscriptions: new Set(),
      lastPing: new Date()
    }

    this.clients.set(ws, clientInfo)
    
    console.log(`🔗 Client connected: ${clientId} from ${clientInfo.ip}`)

    // Send welcome message
    this.sendToClient(ws, {
      type: 'welcome',
      timestamp: new Date().toISOString(),
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        version: '1.0.0'
      }
    })

    // Setup client event handlers
    ws.on('message', (data) => this.handleClientMessage(ws, data))
    ws.on('close', (code, reason) => this.handleClientDisconnect(ws, code, reason))
    ws.on('error', (error) => this.handleClientError(ws, error))
    ws.on('pong', () => this.handleClientPong(ws))

    this.emit('clientConnected', clientId, clientInfo)
  }

  /**
   * Handle client message
   */
  private handleClientMessage(ws: WebSocket, data: Buffer): void {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage
      message.clientId = clientInfo.id
      message.timestamp = message.timestamp || new Date().toISOString()

      console.log(`📨 Message from ${clientInfo.id}:`, message.type)

      // Handle message based on type
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        handler(ws, message.data)
      } else {
        console.warn(`⚠️ Unknown message type: ${message.type}`)
      }

      this.emit('messageReceived', clientInfo.id, message)

    } catch (error) {
      console.error(`Failed to parse message from ${clientInfo.id}:`, error)
      this.sendError(ws, 'Invalid message format')
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(ws: WebSocket, code: number, reason: Buffer): void {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    console.log(`🔌 Client disconnected: ${clientInfo.id} (${code}: ${reason})`)

    // Remove from all channels
    for (const [channel, subscribers] of this.channels.entries()) {
      subscribers.delete(ws)
      if (subscribers.size === 0) {
        this.channels.delete(channel)
      }
    }

    // Remove client
    this.clients.delete(ws)

    this.emit('clientDisconnected', clientInfo.id, { code, reason: reason.toString() })
  }

  /**
   * Handle client error
   */
  private handleClientError(ws: WebSocket, error: Error): void {
    const clientInfo = this.clients.get(ws)
    console.error(`❌ Client error ${clientInfo?.id || 'unknown'}:`, error)
    
    this.emit('clientError', clientInfo?.id, error)
  }

  /**
   * Handle client pong response
   */
  private handleClientPong(ws: WebSocket): void {
    const clientInfo = this.clients.get(ws)
    if (clientInfo) {
      clientInfo.lastPing = new Date()
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    // Subscription management
    this.messageHandlers.set('subscribe', (ws, data) => {
      this.handleSubscribe(ws, data.channels || [])
    })

    this.messageHandlers.set('unsubscribe', (ws, data) => {
      this.handleUnsubscribe(ws, data.channels || [])
    })

    // Ping/Pong
    this.messageHandlers.set('ping', (ws) => {
      this.sendToClient(ws, {
        type: 'pong',
        timestamp: new Date().toISOString()
      })
    })

    // Bot commands
    this.messageHandlers.set('bot_command', (ws, data) => {
      this.handleBotCommand(ws, data)
    })

    // Trading commands
    this.messageHandlers.set('order_update', (ws, data) => {
      this.handleOrderUpdate(ws, data)
    })

    // Recommendation feedback
    this.messageHandlers.set('recommendation_feedback', (ws, data) => {
      this.handleRecommendationFeedback(ws, data)
    })
  }

  /**
   * Handle channel subscription
   */
  private handleSubscribe(ws: WebSocket, channels: string[]): void {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    channels.forEach(channel => {
      // Add client to channel
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set())
      }
      this.channels.get(channel)!.add(ws)
      clientInfo.subscriptions.add(channel)

      console.log(`📡 Client ${clientInfo.id} subscribed to ${channel}`)
    })

    // Send subscription confirmation
    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      timestamp: new Date().toISOString(),
      data: { channels }
    })
  }

  /**
   * Handle channel unsubscription
   */
  private handleUnsubscribe(ws: WebSocket, channels: string[]): void {
    const clientInfo = this.clients.get(ws)
    if (!clientInfo) return

    channels.forEach(channel => {
      const subscribers = this.channels.get(channel)
      if (subscribers) {
        subscribers.delete(ws)
        if (subscribers.size === 0) {
          this.channels.delete(channel)
        }
      }
      clientInfo.subscriptions.delete(channel)

      console.log(`📡 Client ${clientInfo.id} unsubscribed from ${channel}`)
    })
  }

  /**
   * Handle bot commands
   */
  private handleBotCommand(ws: WebSocket, data: any): void {
    const { command, ...commandData } = data
    
    console.log(`🤖 Bot command received: ${command}`)
    
    // Emit bot command event for processing
    this.emit('botCommand', command, commandData)
    
    // Broadcast to bot channel subscribers
    this.broadcastToChannel('bot_updates', {
      type: 'bot_command_received',
      timestamp: new Date().toISOString(),
      data: { command, ...commandData }
    })
  }

  /**
   * Handle order updates
   */
  private handleOrderUpdate(ws: WebSocket, data: any): void {
    console.log('📊 Order update received:', data)
    
    // Emit order update event
    this.emit('orderUpdate', data)
    
    // Broadcast to trading channel subscribers
    this.broadcastToChannel('trading_updates', {
      type: 'order_updated',
      timestamp: new Date().toISOString(),
      data
    })
  }

  /**
   * Handle recommendation feedback
   */
  private handleRecommendationFeedback(ws: WebSocket, data: any): void {
    const { recommendationId, executed, result } = data
    
    console.log(`🎯 Recommendation feedback: ${recommendationId} - ${executed ? 'executed' : 'rejected'}`)
    
    // Emit feedback event
    this.emit('recommendationFeedback', { recommendationId, executed, result })
    
    // Broadcast to AI channel subscribers
    this.broadcastToChannel('ai_updates', {
      type: 'recommendation_feedback',
      timestamp: new Date().toISOString(),
      data: { recommendationId, executed, result }
    })
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): boolean {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Failed to send message to client:', error)
        return false
      }
    }
    return false
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendToClient(ws, {
      type: 'error',
      timestamp: new Date().toISOString(),
      data: { error }
    })
  }

  /**
   * Broadcast message to all clients
   */
  public broadcast(message: WebSocketMessage): void {
    let sent = 0
    let failed = 0

    this.clients.forEach((clientInfo, ws) => {
      if (this.sendToClient(ws, message)) {
        sent++
      } else {
        failed++
      }
    })

    console.log(`📢 Broadcasted ${message.type} to ${sent} clients (${failed} failed)`)
  }

  /**
   * Broadcast message to specific channel
   */
  public broadcastToChannel(channel: string, message: WebSocketMessage): void {
    const subscribers = this.channels.get(channel)
    if (!subscribers || subscribers.size === 0) {
      console.log(`📡 No subscribers for channel: ${channel}`)
      return
    }

    let sent = 0
    let failed = 0

    subscribers.forEach(ws => {
      if (this.sendToClient(ws, message)) {
        sent++
      } else {
        failed++
      }
    })

    console.log(`📡 Broadcasted ${message.type} to ${channel}: ${sent} clients (${failed} failed)`)
  }

  /**
   * Send AI recommendation to subscribers
   */
  public sendAIRecommendation(recommendation: AIRecommendation): void {
    this.broadcastToChannel('ai_updates', {
      type: 'ai_recommendation',
      timestamp: new Date().toISOString(),
      data: recommendation
    })
  }

  /**
   * Send bot activity to subscribers
   */
  public sendBotActivity(activity: BotActivityLog): void {
    this.broadcastToChannel('bot_updates', {
      type: 'bot_activity',
      timestamp: new Date().toISOString(),
      data: activity
    })
  }

  /**
   * Send bot metrics to subscribers
   */
  public sendBotMetrics(metrics: BotMetrics): void {
    this.broadcastToChannel('bot_updates', {
      type: 'bot_metrics',
      timestamp: new Date().toISOString(),
      data: metrics
    })
  }

  /**
   * Send price update to subscribers
   */
  public sendPriceUpdate(symbol: string, price: number, change: number = 0): void {
    this.broadcastToChannel('market_data', {
      type: 'price_update',
      timestamp: new Date().toISOString(),
      data: { symbol, price, change }
    })
  }

  /**
   * Send order update to subscribers
   */
  public sendOrderUpdate(order: Order): void {
    this.broadcastToChannel('trading_updates', {
      type: 'order_update',
      timestamp: new Date().toISOString(),
      data: order
    })
  }

  /**
   * Send position update to subscribers
   */
  public sendPositionUpdate(position: Position): void {
    this.broadcastToChannel('trading_updates', {
      type: 'position_update',
      timestamp: new Date().toISOString(),
      data: position
    })
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date()
      const staleThreshold = 60000 // 1 minute

      this.clients.forEach((clientInfo, ws) => {
        const timeSinceLastPing = now.getTime() - clientInfo.lastPing.getTime()

        if (timeSinceLastPing > staleThreshold) {
          console.log(`💔 Closing stale connection: ${clientInfo.id}`)
          ws.terminate()
        } else if (ws.readyState === WebSocket.OPEN) {
          // Send ping
          ws.ping()
        }
      })
    }, 30000) // Check every 30 seconds
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: Error): void {
    console.error('❌ WebSocket server error:', error)
    this.emit('serverError', error)
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    isRunning: boolean
    clientCount: number
    channelCount: number
    uptime: number
    port: number
    channels: Record<string, number>
  } {
    const channels: Record<string, number> = {}
    for (const [channel, subscribers] of this.channels.entries()) {
      channels[channel] = subscribers.size
    }

    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      channelCount: this.channels.size,
      uptime: this.isRunning ? Date.now() - (this.clients.values().next().value?.connectedAt.getTime() || Date.now()) : 0,
      port: this.port,
      channels
    }
  }

  /**
   * Get client information
   */
  public getClients(): ClientInfo[] {
    return Array.from(this.clients.values())
  }
}

// ===============================================
// WEBSOCKET SERVER MANAGER
// ===============================================

export class WebSocketServerManager {
  private server: TradingWebSocketServer | null = null
  private isInitialized = false

  /**
   * Initialize and start the WebSocket server
   */
  async initialize(port = 3001): Promise<TradingWebSocketServer> {
    if (this.isInitialized && this.server) {
      return this.server
    }

    this.server = new TradingWebSocketServer(port)
    
    // Setup event handlers
    this.setupEventHandlers()
    
    // Start the server
    await this.server.start()
    
    this.isInitialized = true
    return this.server
  }

  /**
   * Get the server instance
   */
  getServer(): TradingWebSocketServer | null {
    return this.server
  }

  /**
   * Stop the server
   */
  async shutdown(): Promise<void> {
    if (this.server) {
      await this.server.stop()
      this.server = null
      this.isInitialized = false
    }
  }

  /**
   * Setup event handlers for the server
   */
  private setupEventHandlers(): void {
    if (!this.server) return

    this.server.on('serverStarted', (port) => {
      console.log(`🚀 WebSocket server manager: Server started on port ${port}`)
    })

    this.server.on('serverStopped', () => {
      console.log('🛑 WebSocket server manager: Server stopped')
    })

    this.server.on('clientConnected', (clientId, clientInfo) => {
      console.log(`🔗 WebSocket server manager: Client ${clientId} connected from ${clientInfo.ip}`)
    })

    this.server.on('clientDisconnected', (clientId) => {
      console.log(`🔌 WebSocket server manager: Client ${clientId} disconnected`)
    })

    this.server.on('botCommand', (command, data) => {
      console.log(`🤖 WebSocket server manager: Bot command received - ${command}`)
      this.handleBotCommand(command, data)
    })

    this.server.on('orderUpdate', (data) => {
      console.log('📊 WebSocket server manager: Order update received')
      this.handleOrderUpdate(data)
    })

    this.server.on('recommendationFeedback', (feedback) => {
      console.log('🎯 WebSocket server manager: Recommendation feedback received')
      this.handleRecommendationFeedback(feedback)
    })
  }

  /**
   * Handle bot commands
   */
  private async handleBotCommand(command: string, data: any): Promise<void> {
    try {
      switch (command) {
        case 'start_bot':
          await this.handleStartBot(data)
          break
        case 'stop_bot':
          await this.handleStopBot(data)
          break
        case 'update_config':
          await this.handleUpdateBotConfig(data)
          break
        case 'generate_recommendation':
          await this.handleGenerateRecommendation(data)
          break
        default:
          console.warn(`Unknown bot command: ${command}`)
      }
    } catch (error) {
      console.error(`Error handling bot command ${command}:`, error)
    }
  }

  /**
   * Handle start bot command
   */
  private async handleStartBot(data: any): Promise<void> {
    // This would integrate with your actual bot starting logic
    console.log('🤖 Starting bot with config:', data)
    
    // Simulate bot start
    setTimeout(() => {
      this.server?.sendBotActivity({
        id: `activity_${Date.now()}`,
        timestamp: new Date(),
        type: 'system',
        message: 'Trading bot started successfully',
        status: 'completed',
        details: `Mode: ${data.mode}, Strategies: ${data.strategies?.length || 0}`
      })
    }, 1000)
  }

  /**
   * Handle stop bot command
   */
  private async handleStopBot(data: any): Promise<void> {
    console.log('🛑 Stopping bot')
    
    // Simulate bot stop
    setTimeout(() => {
      this.server?.sendBotActivity({
        id: `activity_${Date.now()}`,
        timestamp: new Date(),
        type: 'system',
        message: 'Trading bot stopped',
        status: 'completed'
      })
    }, 500)
  }

  /**
   * Handle update bot config command
   */
  private async handleUpdateBotConfig(data: any): Promise<void> {
    console.log('⚙️ Updating bot configuration:', data)
    
    this.server?.sendBotActivity({
      id: `activity_${Date.now()}`,
      timestamp: new Date(),
      type: 'system',
      message: 'Bot configuration updated',
      status: 'completed',
      details: JSON.stringify(data)
    })
  }

  /**
   * Handle generate recommendation command
   */
  private async handleGenerateRecommendation(data: any): Promise<void> {
    const { symbol } = data
    console.log(`🎯 Generating recommendation for ${symbol}`)
    
    // Simulate AI recommendation generation
    setTimeout(() => {
      const recommendation = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        action: Math.random() > 0.5 ? 'BUY' : 'SELL' as 'BUY' | 'SELL',
        confidence: 60 + Math.random() * 35, // 60-95%
        currentPrice: 100 + Math.random() * 50,
        targetPrice: 100 + Math.random() * 60,
        stopLoss: 90 + Math.random() * 20,
        reasoning: [
          'Technical indicators show bullish momentum',
          'Volume analysis suggests institutional interest',
          'Market sentiment remains positive'
        ],
        riskScore: Math.floor(Math.random() * 100),
        aiScore: Math.floor(60 + Math.random() * 40),
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        safetyChecks: {
          passedRiskCheck: true,
          withinDailyLimit: true,
          positionSizeOk: true,
          correlationCheck: true,
          volumeCheck: true,
          volatilityCheck: true,
          marketHoursCheck: true,
          warnings: []
        }
      }

      this.server?.sendAIRecommendation(recommendation)
    }, 2000)
  }

  /**
   * Handle order updates
   */
  private handleOrderUpdate(data: any): void {
    // Process order update and potentially trigger other actions
    console.log('Processing order update:', data)
    
    // You could integrate with your trading system here
    // For example, update positions, calculate P&L, etc.
  }

  /**
   * Handle recommendation feedback
   */
  private handleRecommendationFeedback(feedback: any): void {
    const { recommendationId, executed, result } = feedback
    console.log(`Processing recommendation feedback: ${recommendationId} - ${executed}`)
    
    // You could use this feedback to improve AI models
    // Log performance, update success rates, etc.
  }
}

// ===============================================
// SINGLETON INSTANCE
// ===============================================

let serverManagerInstance: WebSocketServerManager | null = null

/**
 * Get the singleton WebSocket server manager instance
 */
export const getWebSocketServerManager = (): WebSocketServerManager => {
  if (!serverManagerInstance) {
    serverManagerInstance = new WebSocketServerManager()
  }
  return serverManagerInstance
}

// ===============================================
// NEXT.JS API ROUTE INTEGRATION
// ===============================================

/**
 * Next.js API route handler for WebSocket server management
 * src/app/api/websocket/route.ts
 */
export async function GET() {
  const manager = getWebSocketServerManager()
  const server = manager.getServer()
  
  if (server) {
    const stats = server.getStats()
    return Response.json({
      success: true,
      data: stats
    })
  } else {
    return Response.json({
      success: false,
      error: 'WebSocket server not initialized'
    }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const manager = getWebSocketServerManager()
  const { action, port = 3001 } = await request.json()
  
  try {
    switch (action) {
      case 'start':
        const server = await manager.initialize(port)
        return Response.json({
          success: true,
          message: 'WebSocket server started',
          data: server.getStats()
        })
        
      case 'stop':
        await manager.shutdown()
        return Response.json({
          success: true,
          message: 'WebSocket server stopped'
        })
        
      case 'restart':
        await manager.shutdown()
        const newServer = await manager.initialize(port)
        return Response.json({
          success: true,
          message: 'WebSocket server restarted',
          data: newServer.getStats()
        })
        
      default:
        return Response.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// DEVELOPMENT UTILITIES
// ===============================================

/**
 * Development utility to test WebSocket server
 */
export class WebSocketTester {
  private ws: WebSocket | null = null
  private url: string

  constructor(url = 'ws://localhost:3001/ws') {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('🔗 Test client connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 Received:', message)
        } catch (error) {
          console.log('📨 Received (raw):', event.data)
        }
      }

      this.ws.onclose = (event) => {
        console.log(`🔌 Test client disconnected: ${event.code} - ${event.reason}`)
      }

      this.ws.onerror = (error) => {
        console.error('❌ Test client error:', error)
        reject(error)
      }
    })
  }

  /**
   * Send test message
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Subscribe to channels
   */
  subscribe(channels: string[]): void {
    this.send({
      type: 'subscribe',
      timestamp: new Date().toISOString(),
      data: { channels }
    })
  }

  /**
   * Send bot command
   */
  sendBotCommand(command: string, data?: any): void {
    this.send({
      type: 'bot_command',
      timestamp: new Date().toISOString(),
      data: { command, ...data }
    })
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// ===============================================
// AUTO-START IN DEVELOPMENT
// ===============================================

/**
 * Auto-start WebSocket server in development mode
 */
if (process.env.NODE_ENV === 'development' && process.env.AUTO_START_WEBSOCKET === 'true') {
  const manager = getWebSocketServerManager()
  
  manager.initialize(parseInt(process.env.WEBSOCKET_PORT || '3001'))
    .then(() => {
      console.log('🚀 Auto-started WebSocket server for development')
    })
    .catch((error) => {
      console.error('❌ Failed to auto-start WebSocket server:', error)
    })
}

// ===============================================
// GRACEFUL SHUTDOWN
// ===============================================

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down WebSocket server...')
  const manager = getWebSocketServerManager()
  await manager.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down WebSocket server...')
  const manager = getWebSocketServerManager()
  await manager.shutdown()
  process.exit(0)
})