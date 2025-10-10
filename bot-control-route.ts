/**
 * AI Trading Bot Control API Route
 * Handles starting, stopping, and status checking of the AI trading bot
 * 
 * @route POST /api/ai/bot-control
 * @author AI Trading Bot Team
 * @version 2.0.0 - Production Ready with Enhanced Strategies
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/database/supabase-utils'
import { StrategyPortfolioOptimizer } from '@/lib/strategies/StrategyPortfolioOptimizer'
import { BotConfiguration } from '@/types/trading'
import { getCurrentUserId } from '@/lib/auth/auth-utils'

// ===============================================
// BOT STATE MANAGEMENT
// ===============================================

interface BotState {
  isRunning: boolean
  config: BotConfiguration | null
  startTime: Date | null
  sessionId: string | null
  interval: NodeJS.Timeout | null
  lastScanTime: Date | null
  scanCount: number
  errorCount: number
  lastError: string | null
}

// In-memory bot state (consider Redis for production multi-instance deployment)
let botState: BotState = {
  isRunning: false,
  config: null,
  startTime: null,
  sessionId: null,
  interval: null,
  lastScanTime: null,
  scanCount: 0,
  errorCount: 0,
  lastError: null
}

// Strategy instances
const strategyOptimizer = new StrategyPortfolioOptimizer()

// ===============================================
// ERROR HANDLING WRAPPER
// ===============================================

function withErrorHandling(handler: Function) {
  return async (request: NextRequest) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('❌ Bot Control API Error:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }
}

// ===============================================
// MAIN API HANDLER
// ===============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const { action, config } = body

  console.log(`🤖 Bot Control API - Action: ${action}`)

  // Validate action
  if (!action) {
    return NextResponse.json({
      success: false,
      error: 'Action is required',
      validActions: ['start', 'stop', 'status', 'restart']
    }, { status: 400 })
  }

  // Route to appropriate handler
  switch (action.toLowerCase()) {
    case 'start':
      return await handleStartBot(config)
    
    case 'stop':
      return await handleStopBot()
    
    case 'status':
      return handleGetStatus()
    
    case 'restart':
      await handleStopBot()
      return await handleStartBot(config)
    
    default:
      return NextResponse.json({
        success: false,
        error: `Unknown action: ${action}`,
        validActions: ['start', 'stop', 'status', 'restart']
      }, { status: 400 })
  }
})

// ===============================================
// START BOT HANDLER
// ===============================================

async function handleStartBot(config: BotConfiguration | null) {
  // Check if bot is already running
  if (botState.isRunning) {
    console.log('⚠️ Bot start requested but already running')
    return NextResponse.json({
      success: false,
      error: 'Bot is already running',
      data: {
        sessionId: botState.sessionId,
        startTime: botState.startTime,
        uptime: botState.startTime ? Date.now() - botState.startTime.getTime() : 0,
        scanCount: botState.scanCount
      }
    }, { status: 400 })
  }

  try {
    const userId = getCurrentUserId()

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Use provided config or create default
    const botConfig = config || createDefaultBotConfig()

    // Validate configuration
    if (!validateBotConfig(botConfig)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid bot configuration',
        details: 'Configuration must include enabled strategies and risk settings'
      }, { status: 400 })
    }

    // Initialize bot state
    botState = {
      isRunning: true,
      config: botConfig,
      startTime: new Date(),
      sessionId,
      interval: null,
      lastScanTime: null,
      scanCount: 0,
      errorCount: 0,
      lastError: null
    }

    console.log(`🚀 Starting AI Trading Bot...`)
    console.log(`📋 Session ID: ${sessionId}`)
    console.log(`⚙️ Mode: ${botConfig.mode}`)
    console.log(`🎯 Strategies: ${botConfig.strategies.filter(s => s.enabled).length} enabled`)
    console.log(`🤖 Auto-execution: ${botConfig.executionSettings.autoExecute ? 'ENABLED' : 'DISABLED'}`)

    // Update database
    try {
      await supabaseService.upsertBotMetrics(userId, {
        is_running: true,
        uptime: 0,
        last_activity: new Date().toISOString()
      })

      await supabaseService.logBotActivity(userId, {
        type: 'system',
        message: `AI Trading Bot started - Session ${sessionId}`,
        status: 'completed',
        details: JSON.stringify({
          sessionId,
          mode: botConfig.mode,
          strategiesEnabled: botConfig.strategies.filter(s => s.enabled).length,
          autoExecute: botConfig.executionSettings.autoExecute
        })
      })
    } catch (dbError) {
      console.warn('⚠️ Failed to update database, continuing anyway:', dbError)
    }

    // Start bot logic (async execution loop)
    startBotExecutionLoop(sessionId, botConfig, userId)

    return NextResponse.json({
      success: true,
      data: {
        message: 'AI Trading Bot started successfully',
        sessionId,
        startTime: botState.startTime,
        config: {
          mode: botConfig.mode,
          strategiesEnabled: botConfig.strategies.filter(s => s.enabled).length,
          autoExecute: botConfig.executionSettings.autoExecute,
          scanInterval: 60, // seconds
          marketHoursOnly: botConfig.executionSettings.marketHoursOnly
        }
      }
    })

  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    
    // Reset state on failure
    botState.isRunning = false
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start AI Trading Bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// STOP BOT HANDLER
// ===============================================

async function handleStopBot() {
  if (!botState.isRunning) {
    console.log('⚠️ Stop requested but bot not running - performing cleanup')
    
    // Cleanup anyway
    if (botState.interval) {
      clearInterval(botState.interval)
    }
    
    botState = {
      isRunning: false,
      config: null,
      startTime: null,
      sessionId: null,
      interval: null,
      lastScanTime: null,
      scanCount: 0,
      errorCount: 0,
      lastError: null
    }
    
    return NextResponse.json({
      success: true,
      message: 'Bot was not running, cleanup performed'
    })
  }

  try {
    const userId = getCurrentUserId()
    const sessionId = botState.sessionId
    const uptime = botState.startTime ? Date.now() - botState.startTime.getTime() : 0
    const scanCount = botState.scanCount

    console.log(`🛑 Stopping AI Trading Bot...`)
    console.log(`📋 Session ID: ${sessionId}`)
    console.log(`⏱️ Uptime: ${Math.floor(uptime / 60000)}m`)
    console.log(`🔍 Scans completed: ${scanCount}`)

    // Clear execution interval
    if (botState.interval) {
      clearInterval(botState.interval)
    }

    // Update database
    try {
      await supabaseService.upsertBotMetrics(userId, {
        is_running: false,
        uptime: Math.floor(uptime / 1000),
        last_activity: new Date().toISOString()
      })

      await supabaseService.logBotActivity(userId, {
        type: 'system',
        message: `AI Trading Bot stopped - Session ${sessionId}`,
        status: 'completed',
        details: JSON.stringify({
          sessionId,
          duration: uptime,
          scansCompleted: scanCount,
          errorCount: botState.errorCount
        })
      })
    } catch (dbError) {
      console.warn('⚠️ Failed to update database:', dbError)
    }

    // Reset bot state
    botState = {
      isRunning: false,
      config: null,
      startTime: null,
      sessionId: null,
      interval: null,
      lastScanTime: null,
      scanCount: 0,
      errorCount: 0,
      lastError: null
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'AI Trading Bot stopped successfully',
        sessionId,
        uptime: Math.floor(uptime / 60000), // minutes
        scansCompleted: scanCount,
        stoppedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Failed to stop bot:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to stop AI Trading Bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===============================================
// STATUS HANDLER
// ===============================================

function handleGetStatus() {
  const uptime = botState.startTime ? Date.now() - botState.startTime.getTime() : 0
  
  return NextResponse.json({
    success: true,
    data: {
      isRunning: botState.isRunning,
      sessionId: botState.sessionId,
      startTime: botState.startTime,
      uptime: uptime,
      uptimeFormatted: formatUptime(uptime),
      lastScanTime: botState.lastScanTime,
      scanCount: botState.scanCount,
      errorCount: botState.errorCount,
      lastError: botState.lastError,
      config: botState.config ? {
        mode: botState.config.mode,
        strategiesEnabled: botState.config.strategies.filter(s => s.enabled).length,
        autoExecute: botState.config.executionSettings.autoExecute,
        marketHoursOnly: botState.config.executionSettings.marketHoursOnly
      } : null,
      status: botState.isRunning ? 'RUNNING' : 'STOPPED',
      health: getHealthStatus()
    }
  })
}

// ===============================================
// BOT EXECUTION LOOP
// ===============================================

function startBotExecutionLoop(
  sessionId: string, 
  config: BotConfiguration, 
  userId: string
) {
  console.log('🔄 Starting bot execution loop...')

  // Initial scan
  performBotScan(sessionId, config, userId)

  // Set up recurring scans (every 60 seconds)
  const interval = setInterval(() => {
    if (!botState.isRunning) {
      clearInterval(interval)
      return
    }

    performBotScan(sessionId, config, userId)
  }, 60000) // 60 seconds

  botState.interval = interval
}

async function performBotScan(
  sessionId: string,
  config: BotConfiguration,
  userId: string
) {
  try {
    // Check if market hours only mode
    if (config.executionSettings.marketHoursOnly && !isMarketHours()) {
      console.log('⏸️ Outside market hours, skipping scan')
      return
    }

    console.log(`🔍 Performing bot scan #${botState.scanCount + 1}...`)
    botState.lastScanTime = new Date()
    botState.scanCount++

    // Get default watchlist
    const watchlist = config.watchlist || getDefaultWatchlist()
    console.log(`📊 Analyzing ${watchlist.length} symbols...`)

    // Generate AI recommendations for watchlist using strategy optimizer
    const recommendations = await strategyOptimizer.generateRecommendations(
      watchlist.slice(0, 10), // Limit to first 10 to avoid rate limits
      config
    )

    console.log(`✅ Generated ${recommendations.length} recommendations`)

    // Filter recommendations by confidence threshold
    const highConfidenceRecs = recommendations.filter(
      rec => rec.confidence >= config.executionSettings.minConfidenceForOrder
    )

    console.log(`🎯 ${highConfidenceRecs.length} recommendations meet confidence threshold`)

    // Log activity
    await supabaseService.logBotActivity(userId, {
      type: 'recommendation',
      message: `Scan #${botState.scanCount}: Generated ${recommendations.length} recommendations, ${highConfidenceRecs.length} actionable`,
      status: 'completed',
      details: JSON.stringify({
        sessionId,
        scanNumber: botState.scanCount,
        symbolsAnalyzed: watchlist.length,
        recommendationsGenerated: recommendations.length,
        highConfidenceCount: highConfidenceRecs.length
      })
    })

    // Auto-execute if enabled
    if (config.executionSettings.autoExecute && highConfidenceRecs.length > 0) {
      console.log('🤖 Auto-execution enabled, processing recommendations...')
      // Note: Actual order execution would be handled by separate service
      // to avoid blocking the scan loop
    }

  } catch (error) {
    console.error('❌ Error during bot scan:', error)
    botState.errorCount++
    botState.lastError = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    try {
      await supabaseService.logBotActivity(userId, {
        type: 'error',
        message: `Scan #${botState.scanCount} failed`,
        status: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function createDefaultBotConfig(): BotConfiguration {
  return {
    enabled: true,
    mode: 'BALANCED',
    strategies: [
      {
        id: 'enhanced_mean_reversion',
        name: 'Enhanced Mean Reversion',
        type: 'MEAN_REVERSION',
        enabled: true,
        weight: 0.4,
        parameters: {},
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'momentum',
        name: 'Momentum Trading',
        type: 'MOMENTUM',
        enabled: true,
        weight: 0.3,
        parameters: {},
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      },
      {
        id: 'breakout',
        name: 'Breakout Strategy',
        type: 'BREAKOUT',
        enabled: true,
        weight: 0.3,
        parameters: {},
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      }
    ],
    riskManagement: {
      maxPositionSize: 0.10,
      maxDailyLoss: 0.02,
      maxDrawdown: 0.15,
      minConfidence: 0.70,
      stopLossPercent: 2.0,
      takeProfitPercent: 4.0,
      correlationLimit: 0.7
    },
    executionSettings: {
      autoExecute: false, // Default to manual approval for safety
      minConfidenceForOrder: 0.75,
      maxOrdersPerDay: 20,
      orderSizePercent: 0.02,
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
    },
    watchlist: getDefaultWatchlist()
  }
}

function validateBotConfig(config: BotConfiguration): boolean {
  if (!config || typeof config !== 'object') return false
  if (!config.strategies || !Array.isArray(config.strategies)) return false
  if (config.strategies.filter(s => s.enabled).length === 0) return false
  if (!config.riskManagement || !config.executionSettings) return false
  
  return true
}

function getDefaultWatchlist(): string[] {
  return [
    // Tech giants
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
    // High volume stocks
    'SPY', 'QQQ', 'IWM',
    // Popular tech stocks
    'AMD', 'INTC', 'NFLX', 'ADBE', 'CRM', 'ORCL',
    // Growth stocks
    'SNOW', 'PLTR', 'RBLX', 'COIN', 'RIVN',
    // Consumer
    'WMT', 'HD', 'NKE', 'SBUX', 'MCD'
  ]
}

function isMarketHours(): boolean {
  const now = new Date()
  const day = now.getDay()
  
  // Weekend check
  if (day === 0 || day === 6) return false
  
  // Market hours: 9:30 AM - 4:00 PM EST
  const hour = now.getHours()
  const minute = now.getMinutes()
  const timeInMinutes = hour * 60 + minute
  
  const marketOpen = 9 * 60 + 30  // 9:30 AM
  const marketClose = 16 * 60      // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose
}

function formatUptime(ms: number): string {
  // Use centralized formatter
  const { formatUptime: formatUptimeUtil } = require('@/lib/utils/formatters')
  const seconds = Math.floor(ms / 1000)
  return formatUptimeUtil(seconds)
}

function getHealthStatus(): 'HEALTHY' | 'WARNING' | 'ERROR' {
  if (!botState.isRunning) return 'HEALTHY'
  
  // Check error rate
  const errorRate = botState.scanCount > 0 
    ? botState.errorCount / botState.scanCount 
    : 0
  
  if (errorRate > 0.5) return 'ERROR'
  if (errorRate > 0.2) return 'WARNING'
  
  // Check last scan time
  if (botState.lastScanTime) {
    const timeSinceLastScan = Date.now() - botState.lastScanTime.getTime()
    if (timeSinceLastScan > 5 * 60 * 1000) return 'ERROR' // 5 minutes
    if (timeSinceLastScan > 2 * 60 * 1000) return 'WARNING' // 2 minutes
  }
  
  return 'HEALTHY'
}

// ===============================================
// EXPORTS
// ===============================================

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'