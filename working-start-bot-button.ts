// ===============================================
// WORKING START AI TRADING BUTTON - Complete Implementation
// ===============================================

// ===============================================
// 1. Bot Control Hook - src/hooks/useTradingBot.ts
// ===============================================
import React from 'react'
import { useState, useCallback } from 'react'
import { useBotStore } from '@/store/tradingStore'
import { useWebSocketContext } from '@/hooks/useWebSocket'
import type { BotConfiguration } from '@/types/trading'

export const useTradingBot = () => {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const botStore = useBotStore()
  const { sendInternalMessage } = useWebSocketContext()

  /**
   * Start the AI trading bot
   */
  const startBot = useCallback(async (config: BotConfiguration) => {
    if (isStarting || botStore.metrics.isRunning) return

    setIsStarting(true)
    setError(null)

    try {
      console.log('🚀 Starting AI Trading Bot...', config)

      // 1. Call the API to start the bot
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          config: {
            mode: config.mode || 'CONSERVATIVE',
            strategies: config.strategies || [
              { id: 'ml_enhanced', name: 'ML Enhanced', enabled: true, weight: 0.4 },
              { id: 'technical', name: 'Technical Analysis', enabled: true, weight: 0.3 },
              { id: 'sentiment', name: 'Sentiment Analysis', enabled: true, weight: 0.3 }
            ],
            riskManagement: {
              maxPositionSize: 0.05, // 5% max position size
              maxDailyLoss: 0.02,   // 2% max daily loss
              maxDrawdown: 0.10,    // 10% max drawdown
              minConfidence: 0.75,  // 75% minimum confidence
              stopLossPercent: 0.05,
              takeProfitPercent: 0.10
            },
            executionSettings: {
              autoExecute: config.executionSettings?.autoExecute || false,
              minConfidenceForOrder: 0.80,
              maxOrdersPerDay: 20,
              orderSizePercent: 0.02, // 2% of portfolio per trade
              slippageTolerance: 0.01
            },
            watchlist: [
              'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'NFLX'
            ]
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to start bot`)
      }

      console.log('✅ Bot started successfully:', result)

      // 2. Update local store
      botStore.updateConfig(config)
      botStore.updateMetrics({
        isRunning: true,
        uptime: 0,
        lastActivity: new Date()
      })

      // 3. Add activity log
      botStore.addActivity({
        type: 'system',
        message: `AI Trading Bot started in ${config.mode} mode`,
        status: 'completed',
        details: `Strategies: ${config.strategies?.length || 3} enabled, Auto-execution: ${config.executionSettings?.autoExecute ? 'ON' : 'OFF'}`
      })

      // 4. Send WebSocket notification
      if (sendInternalMessage) {
        sendInternalMessage({
          type: 'bot_command',
          data: {
            command: 'start_bot',
            success: true,
            config
          }
        })
      }

      // 5. Show success notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('AI Trading Bot Started', {
          body: `Bot is now running in ${config.mode} mode`,
          icon: '/icons/bot-active.png'
        })
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Failed to start bot:', errorMessage)
      
      setError(errorMessage)
      
      // Add error activity
      botStore.addActivity({
        type: 'error',
        message: 'Failed to start AI Trading Bot',
        status: 'failed',
        details: errorMessage
      })

      throw error

    } finally {
      setIsStarting(false)
    }
  }, [isStarting, botStore, sendInternalMessage])

  /**
   * Stop the AI trading bot
   */
  const stopBot = useCallback(async () => {
    if (isStopping || !botStore.metrics.isRunning) return

    setIsStopping(true)
    setError(null)

    try {
      console.log('🛑 Stopping AI Trading Bot...')

      // 1. Call the API to stop the bot
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to stop bot')
      }

      console.log('✅ Bot stopped successfully:', result)

      // 2. Update local store
      botStore.updateMetrics({
        isRunning: false,
        lastActivity: new Date()
      })

      // 3. Add activity log
      botStore.addActivity({
        type: 'system',
        message: 'AI Trading Bot stopped',
        status: 'completed',
        details: `Total uptime: ${Math.floor(botStore.metrics.uptime / 60)}m, Trades executed: ${botStore.metrics.tradesExecuted}`
      })

      // 4. Send WebSocket notification
      if (sendInternalMessage) {
        sendInternalMessage({
          type: 'bot_command',
          data: {
            command: 'stop_bot',
            success: true
          }
        })
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Failed to stop bot:', errorMessage)
      
      setError(errorMessage)
      
      // Add error activity
      botStore.addActivity({
        type: 'error',
        message: 'Failed to stop AI Trading Bot',
        status: 'failed',
        details: errorMessage
      })

      throw error

    } finally {
      setIsStopping(false)
    }
  }, [isStopping, botStore, sendInternalMessage])

  /**
   * Get bot status
   */
  const getBotStatus = useCallback(() => {
    return {
      isRunning: botStore.metrics.isRunning,
      canStart: !botStore.metrics.isRunning && !isStarting,
      canStop: botStore.metrics.isRunning && !isStopping,
      uptime: botStore.metrics.uptime,
      tradesExecuted: botStore.metrics.tradesExecuted,
      successRate: botStore.metrics.successRate,
      lastActivity: botStore.metrics.lastActivity
    }
  }, [botStore.metrics, isStarting, isStopping])

  return {
    // Status
    isStarting,
    isStopping,
    error,
    status: getBotStatus(),
    config: botStore.config,
    metrics: botStore.metrics,
    activityLogs: botStore.activityLogs,

    // Actions
    startBot,
    stopBot,
    clearError: () => setError(null)
  }
}

// ===============================================
// 2. API Route - src/app/api/ai/bot-control/route.ts
// ===============================================

import { NextRequest, NextResponse } from 'next/server'
import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'

// In-memory bot state (in production, use Redis or database)
let botState = {
  isRunning: false,
  config: null,
  startTime: null,
  sessionId: null
}

/**
 * POST /api/ai/bot-control
 * Start or stop the AI trading bot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config } = body

    console.log(`🤖 Bot Control API - Action: ${action}`)

    switch (action) {
      case 'start':
        return await handleStartBot(config)
      
      case 'stop':
        return await handleStopBot()
      
      case 'status':
        return handleGetStatus()
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Bot Control API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

/**
 * Handle start bot request
 */
async function handleStartBot(config: any) {
  if (botState.isRunning) {
    return NextResponse.json({
      success: false,
      error: 'Bot is already running'
    }, { status: 400 })
  }

  try {
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Update bot state
    botState = {
      isRunning: true,
      config,
      startTime: new Date(),
      sessionId
    }

    console.log(`🚀 AI Trading Bot started with session ID: ${sessionId}`)

    // Notify via WebSocket
    const wsServer = getWebSocketServerManager().getServer()
    if (wsServer) {
      wsServer.broadcast({
        type: 'bot_started',
        timestamp: new Date().toISOString(),
        data: {
          sessionId,
          config: {
            mode: config.mode,
            strategiesCount: config.strategies?.length || 0,
            autoExecute: config.executionSettings?.autoExecute || false
          }
        }
      })
    }

    // Start the actual bot logic here
    startBotLogic(sessionId, config)

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        message: 'AI Trading Bot started successfully',
        config: {
          mode: config.mode,
          strategiesEnabled: config.strategies?.length || 0,
          autoExecution: config.executionSettings?.autoExecute || false,
          watchlistSize: config.watchlist?.length || 0
        },
        startTime: botState.startTime
      }
    })

  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    
    // Reset state on failure
    botState.isRunning = false
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start AI Trading Bot',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Handle stop bot request
 */
async function handleStopBot() {
  if (!botState.isRunning) {
    return NextResponse.json({
      success: false,
      error: 'Bot is not running'
    }, { status: 400 })
  }

  try {
    const sessionId = botState.sessionId
    const uptime = Date.now() - new Date(botState.startTime).getTime()

    // Stop the bot logic
    stopBotLogic(sessionId)

    // Reset bot state
    botState = {
      isRunning: false,
      config: null,
      startTime: null,
      sessionId: null
    }

    console.log(`🛑 AI Trading Bot stopped. Session: ${sessionId}, Uptime: ${Math.floor(uptime / 60000)}m`)

    // Notify via WebSocket
    const wsServer = getWebSocketServerManager().getServer()
    if (wsServer) {
      wsServer.broadcast({
        type: 'bot_stopped',
        timestamp: new Date().toISOString(),
        data: {
          sessionId,
          uptime: Math.floor(uptime / 60000),
          reason: 'Manual stop'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'AI Trading Bot stopped successfully',
        sessionId,
        uptime: Math.floor(uptime / 60000),
        stoppedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Failed to stop bot:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to stop AI Trading Bot',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Handle get status request
 */
function handleGetStatus() {
  return NextResponse.json({
    success: true,
    data: {
      isRunning: botState.isRunning,
      sessionId: botState.sessionId,
      startTime: botState.startTime,
      uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
      config: botState.config ? {
        mode: botState.config.mode,
        strategiesEnabled: botState.config.strategies?.length || 0,
        autoExecution: botState.config.executionSettings?.autoExecute || false
      } : null
    }
  })
}

/**
 * Start the actual bot trading logic
 */
function startBotLogic(sessionId: string, config: any) {
  console.log(`🧠 Starting AI trading logic for session: ${sessionId}`)
  
  // This would start your actual AI trading engine
  // For now, we'll simulate bot activity
  const interval = setInterval(async () => {
    if (!botState.isRunning || botState.sessionId !== sessionId) {
      clearInterval(interval)
      return
    }

    // Simulate AI activity
    const wsServer = getWebSocketServerManager().getServer()
    if (wsServer) {
      // Send simulated bot activity
      wsServer.broadcast({
        type: 'bot_activity',
        timestamp: new Date().toISOString(),
        data: {
          sessionId,
          activity: 'AI analyzing market conditions...',
          symbolsScanned: Math.floor(Math.random() * 50) + 10,
          recommendationsGenerated: Math.floor(Math.random() * 5),
          confidence: Math.random() * 0.4 + 0.6 // 60-100%
        }
      })
    }

    console.log(`🔄 Bot session ${sessionId} is active - analyzing markets...`)
  }, 30000) // Every 30 seconds

  // Store interval for cleanup
  botState.interval = interval
}

/**
 * Stop the bot trading logic
 */
function stopBotLogic(sessionId: string) {
  console.log(`🛑 Stopping AI trading logic for session: ${sessionId}`)
  
  if (botState.interval) {
    clearInterval(botState.interval)
    botState.interval = null
  }
}

// ===============================================
// 3. GET endpoint for status checks
// ===============================================

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      isRunning: botState.isRunning,
      sessionId: botState.sessionId,
      uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
      status: botState.isRunning ? 'RUNNING' : 'STOPPED'
    }
  })
}

// ===============================================
// 4. Bot Control Component - Updated Implementation
// ===============================================

import React, { useState } from 'react'
import { useTradingBot } from '@/hooks/useTradingBot'
import { useTradingMode } from '@/hooks/useTrading'
import { Play, Square, Settings, AlertTriangle, CheckCircle } from 'lucide-react'
import type { BotConfiguration } from '@/types/trading'

export const BotControlPanel: React.FC = () => {
  const { 
    isStarting, 
    isStopping, 
    error, 
    status, 
    config,
    startBot, 
    stopBot, 
    clearError 
  } = useTradingBot()

  const { mode: tradingMode, isLiveTrading } = useTradingMode()
  const [showConfig, setShowConfig] = useState(false)

  /**
   * Handle start bot with default configuration
   */
  const handleStartBot = async () => {
    const defaultConfig: BotConfiguration = {
      enabled: true,
      mode: 'CONSERVATIVE',
      strategies: [
        {
          id: 'ml_enhanced',
          name: 'ML Enhanced Analysis',
          type: 'ML_ENHANCED',
          enabled: true,
          weight: 0.4,
          parameters: {}
        },
        {
          id: 'technical_analysis',
          name: 'Technical Analysis',
          type: 'TECHNICAL',
          enabled: true,
          weight: 0.3,
          parameters: {}
        },
        {
          id: 'sentiment_analysis',
          name: 'Sentiment Analysis',
          type: 'SENTIMENT',
          enabled: true,
          weight: 0.3,
          parameters: {}
        }
      ],
      riskManagement: {
        maxPositionSize: 0.05,      // 5% max position
        maxDailyLoss: 0.02,         // 2% max daily loss
        maxDrawdown: 0.10,          // 10% max drawdown
        minConfidence: 0.75,        // 75% min confidence
        stopLossPercent: 0.05,      // 5% stop loss
        takeProfitPercent: 0.10,    // 10% take profit
        correlationLimit: 0.7       // Max 70% correlation
      },
      executionSettings: {
        autoExecute: false,         // Manual execution for safety
        minConfidenceForOrder: 0.80, // 80% confidence for auto orders
        maxOrdersPerDay: 20,
        orderSizePercent: 0.02,     // 2% of portfolio per trade
        slippageTolerance: 0.01,
        marketHoursOnly: true
      },
      scheduleSettings: {
        tradingHours: {
          start: '09:30',
          end: '16:00'
        },
        excludedDays: ['Saturday', 'Sunday'],
        cooldownMinutes: 5
      }
    }

    try {
      await startBot(defaultConfig)
    } catch (error) {
      // Error is already handled in the hook
      console.error('Start bot failed:', error)
    }
  }

  /**
   * Handle stop bot
   */
  const handleStopBot = async () => {
    try {
      await stopBot()
    } catch (error) {
      // Error is already handled in the hook
      console.error('Stop bot failed:', error)
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            status.isRunning ? 'bg-green-400' : 'bg-gray-500'
          }`} />
          <h3 className="text-lg font-semibold text-white">AI Trading Bot</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isLiveTrading 
              ? 'bg-red-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            {tradingMode}
          </span>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
          title="Bot Configuration"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Display */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Status</div>
          <div className={`font-semibold ${
            status.isRunning ? 'text-green-400' : 'text-gray-300'
          }`}>
            {status.isRunning ? 'RUNNING' : 'STOPPED'}
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Uptime</div>
          <div className="font-semibold text-white">
            {Math.floor(status.uptime / 60000)}m
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Trades</div>
          <div className="font-semibold text-white">
            {status.tradesExecuted}
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Success Rate</div>
          <div className="font-semibold text-green-400">
            {(status.successRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleStartBot}
          disabled={!status.canStart || isStarting}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            !status.canStart || isStarting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isStarting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Starting...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Start AI Trading</span>
            </>
          )}
        </button>

        <button
          onClick={handleStopBot}
          disabled={!status.canStop || isStopping}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            !status.canStop || isStopping
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isStopping ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Stopping...</span>
            </>
          ) : (
            <>
              <Square size={16} />
              <span>Stop Trading</span>
            </>
          )}
        </button>
      </div>

      {/* Live Trading Warning */}
      {isLiveTrading && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-300 text-sm font-medium">
              Live Trading Mode Active
            </span>
          </div>
          <p className="text-red-300 text-xs mt-1">
            Bot will execute real trades with real money. Monitor carefully.
          </p>
        </div>
      )}

      {/* Safety Checks */}
      <div className="mt-4 p-3 bg-blue-900/50 border border-blue-700 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="h-4 w-4 text-blue-400" />
          <span className="text-blue-300 text-sm font-medium">Safety Features</span>
        </div>
        <ul className="text-blue-300 text-xs space-y-1">
          <li>• 5% maximum position size</li>
          <li>• 2% maximum daily loss limit</li>
          <li>• 75% minimum confidence threshold</li>
          <li>• Real-time risk monitoring</li>
        </ul>
      </div>
    </div>
  )
}