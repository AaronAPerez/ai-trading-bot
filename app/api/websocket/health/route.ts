// ===============================================
// WEBSOCKET HEALTH CHECK API ENDPOINT
// app/api/websocket/health/route.ts
// ===============================================

import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'
import { NextResponse } from 'next/server'

// ===============================================
// HEALTH CHECK ENDPOINT
// ===============================================

/**
 * GET /api/websocket/health
 * Returns the health status of the WebSocket server
 */
export async function GET() {
  try {
    const manager = getWebSocketServerManager()
    const server = manager.getServer()

    if (!server) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'WebSocket server not initialized',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    const stats = server.getStats()

    if (!stats.isRunning) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'WebSocket server not running',
        stats,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Get system information
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const health = {
      status: 'healthy',
      websocket: {
        isRunning: stats.isRunning,
        clientCount: stats.clientCount,
        channelCount: stats.channelCount,
        uptime: stats.uptime,
        port: stats.port,
        channels: stats.channels
      },
      system: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024) // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: Math.round(process.uptime()), // seconds
        nodeVersion: process.version,
        platform: process.platform
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(health)

  } catch (error) {
    console.error('Health check error:', error)

    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// ===============================================
// SERVER MANAGEMENT ENDPOINTS
// ===============================================

/**
 * POST /api/websocket/health
 * Manage WebSocket server (start, stop, restart)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, port = 3001 } = body

    const manager = getWebSocketServerManager()

    switch (action) {
      case 'start':
        const server = await manager.initialize(port)
        return NextResponse.json({
          success: true,
          message: 'WebSocket server started',
          data: server.getStats()
        })

      case 'stop':
        await manager.shutdown()
        return NextResponse.json({
          success: true,
          message: 'WebSocket server stopped'
        })

      case 'restart':
        await manager.shutdown()
        const newServer = await manager.initialize(port)
        return NextResponse.json({
          success: true,
          message: 'WebSocket server restarted',
          data: newServer.getStats()
        })

      case 'ping':
        const currentServer = manager.getServer()
        if (currentServer) {
          const stats = currentServer.getStats()
          return NextResponse.json({
            success: true,
            message: 'WebSocket server is responsive',
            data: stats
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'WebSocket server not initialized'
          }, { status: 503 })
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: start, stop, restart, ping'
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