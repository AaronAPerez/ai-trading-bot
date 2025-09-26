// ===============================================
// WEBSOCKET SERVER MANAGEMENT API
// app/api/websocket/route.ts
// ===============================================

import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'
import { NextResponse } from 'next/server'

// ===============================================
// WEBSOCKET SERVER STATS
// ===============================================

/**
 * GET /api/websocket
 * Returns WebSocket server statistics and status
 */
export async function GET() {
  try {
    const manager = getWebSocketServerManager()
    const server = manager.getServer()

    if (server) {
      const stats = server.getStats()
      const clients = server.getClients()

      return NextResponse.json({
        success: true,
        data: {
          server: stats,
          clients: clients.map(client => ({
            id: client.id,
            ip: client.ip,
            userAgent: client.userAgent,
            connectedAt: client.connectedAt,
            subscriptions: Array.from(client.subscriptions),
            lastPing: client.lastPing
          }))
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'WebSocket server not initialized'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('WebSocket stats error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// WEBSOCKET SERVER MANAGEMENT
// ===============================================

/**
 * POST /api/websocket
 * Start, stop, or restart the WebSocket server
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, port = 3001 } = body

    const manager = getWebSocketServerManager()

    switch (action) {
      case 'start':
        try {
          const server = await manager.initialize(port)
          return NextResponse.json({
            success: true,
            message: 'WebSocket server started successfully',
            data: server.getStats()
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to start WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }

      case 'stop':
        try {
          await manager.shutdown()
          return NextResponse.json({
            success: true,
            message: 'WebSocket server stopped successfully'
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to stop WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }

      case 'restart':
        try {
          await manager.shutdown()
          // Wait a moment before restarting
          await new Promise(resolve => setTimeout(resolve, 1000))
          const newServer = await manager.initialize(port)
          return NextResponse.json({
            success: true,
            message: 'WebSocket server restarted successfully',
            data: newServer.getStats()
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to restart WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: start, stop, restart'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('WebSocket management error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// WEBSOCKET MESSAGE BROADCASTING
// ===============================================

/**
 * PUT /api/websocket
 * Broadcast messages to WebSocket clients
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { channel, message, type = 'broadcast' } = body

    const manager = getWebSocketServerManager()
    const server = manager.getServer()

    if (!server) {
      return NextResponse.json({
        success: false,
        error: 'WebSocket server not initialized'
      }, { status: 503 })
    }

    const wsMessage = {
      type,
      timestamp: new Date().toISOString(),
      data: message
    }

    if (channel) {
      // Broadcast to specific channel
      server.broadcastToChannel(channel, wsMessage)
      return NextResponse.json({
        success: true,
        message: `Message broadcasted to channel: ${channel}`
      })
    } else {
      // Broadcast to all clients
      server.broadcast(wsMessage)
      return NextResponse.json({
        success: true,
        message: 'Message broadcasted to all clients'
      })
    }

  } catch (error) {
    console.error('WebSocket broadcast error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// WEBSOCKET TESTING UTILITIES
// ===============================================

/**
 * PATCH /api/websocket
 * Send test messages and perform diagnostics
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { test, data } = body

    const manager = getWebSocketServerManager()
    const server = manager.getServer()

    if (!server) {
      return NextResponse.json({
        success: false,
        error: 'WebSocket server not initialized'
      }, { status: 503 })
    }

    switch (test) {
      case 'ping_all':
        // Send ping to all clients
        server.broadcast({
          type: 'ping',
          timestamp: new Date().toISOString(),
          data: { test: true }
        })
        return NextResponse.json({
          success: true,
          message: `Ping sent to ${server.getStats().clientCount} clients`
        })

      case 'market_data':
        // Send test market data
        const testMarketData = {
          symbol: data?.symbol || 'AAPL',
          price: 150 + Math.random() * 10,
          change: (Math.random() - 0.5) * 5
        }
        server.sendPriceUpdate(testMarketData.symbol, testMarketData.price, testMarketData.change)
        return NextResponse.json({
          success: true,
          message: 'Test market data sent',
          data: testMarketData
        })

      case 'bot_activity':
        // Send test bot activity
        server.sendBotActivity({
          id: `test_${Date.now()}`,
          timestamp: new Date(),
          type: 'system',
          message: 'Test bot activity',
          status: 'completed',
          details: 'This is a test message from the API'
        })
        return NextResponse.json({
          success: true,
          message: 'Test bot activity sent'
        })

      case 'ai_recommendation':
        // Send test AI recommendation
        server.sendAIRecommendation({
          id: `test_rec_${Date.now()}`,
          symbol: data?.symbol || 'TSLA',
          action: Math.random() > 0.5 ? 'BUY' : 'SELL',
          confidence: 75 + Math.random() * 20,
          currentPrice: 200 + Math.random() * 50,
          targetPrice: 220 + Math.random() * 60,
          stopLoss: 180 + Math.random() * 30,
          reasoning: ['Test recommendation from API', 'Technical indicators look favorable'],
          riskScore: Math.floor(Math.random() * 100),
          aiScore: Math.floor(70 + Math.random() * 30),
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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
        })
        return NextResponse.json({
          success: true,
          message: 'Test AI recommendation sent'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid test. Supported tests: ping_all, market_data, bot_activity, ai_recommendation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('WebSocket test error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}