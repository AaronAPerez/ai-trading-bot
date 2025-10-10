/**
 * AI Trading Bot Control API - PRODUCTION VERSION
 * Uses ONLY real Alpaca API and Supabase database data
 * 
 * @route POST /api/ai/bot-control
 * @version 3.0.0 - Real Data Only
 * 
 * NO MOCKS | NO SIMULATIONS | NO FAKE DATA
 */

import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/AlpacaClient'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/auth-utils'

// =============================================
// BOT STATE (In-Memory)
// For production, consider Redis for multi-instance
// =============================================

interface BotSession {
  userId: string
  isRunning: boolean
  startTime: Date
  sessionId: string
  config: BotConfig
  scanInterval: NodeJS.Timeout | null
  stats: {
    scansCompleted: number
    recommendationsGenerated: number
    tradesExecuted: number
    tradesSuccessful: number
    tradesFailed: number
    totalPnL: number
    lastScanTime: Date | null
    errors: string[]
  }
}

interface BotConfig {
  symbols: string[]
  scanIntervalMinutes: number
  maxConcurrentPositions: number
  autoExecuteOrders: boolean
  minConfidenceThreshold: number
  maxRiskPerTrade: number
  strategies: string[]
}

// Store active bot sessions
const activeSessions = new Map<string, BotSession>()

// =============================================
// MAIN API HANDLER
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config } = body

    // Get real user ID
    const userId = getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`🤖 Bot Control API: ${action} for user ${userId}`)

    switch (action) {
      case 'start':
        return await startRealBot(userId, config)
      
      case 'stop':
        return await stopBot(userId)
      
      case 'status':
        return await getBotStatus(userId)
      
      case 'force-scan':
        return await forceScan(userId)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Bot Control API Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// =============================================
// START BOT - REAL DATA ONLY
// =============================================

async function startRealBot(userId: string, config: BotConfig) {
  // Validate configuration
  if (!config.symbols || config.symbols.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No symbols provided' },
      { status: 400 }
    )
  }

  // Check if bot already running
  if (activeSessions.has(userId)) {
    return NextResponse.json(
      { success: false, error: 'Bot already running for this user' },
      { status: 409 }
    )
  }

  try {
    console.log('🚀 Starting Real AI Trading Bot')
    console.log('📊 Data Sources: REAL Alpaca API + REAL Supabase DB')

    // Initialize real Alpaca client
    const alpaca = new AlpacaClient()
    
    // Verify real Alpaca connection
    const account = await alpaca.getAccount()
    if (!account || !account.account_number) {
      throw new Error('Failed to connect to real Alpaca API')
    }
    
    console.log(`✅ Connected to real Alpaca account: ${account.account_number}`)
    console.log(`💰 Real buying power: $${parseFloat(account.buying_power).toFixed(2)}`)

    // Create bot session
    const sessionId = `bot_${userId}_${Date.now()}`
    const session: BotSession = {
      userId,
      isRunning: true,
      startTime: new Date(),
      sessionId,
      config: {
        symbols: config.symbols,
        scanIntervalMinutes: config.scanIntervalMinutes || 5,
        maxConcurrentPositions: config.maxConcurrentPositions || 5,
        autoExecuteOrders: config.autoExecuteOrders || false,
        minConfidenceThreshold: config.minConfidenceThreshold || 0.70,
        maxRiskPerTrade: config.maxRiskPerTrade || 0.02,
        strategies: config.strategies || ['TECHNICAL', 'MOMENTUM', 'MEAN_REVERSION']
      },
      scanInterval: null,
      stats: {
        scansCompleted: 0,
        recommendationsGenerated: 0,
        tradesExecuted: 0,
        tradesSuccessful: 0,
        tradesFailed: 0,
        totalPnL: 0,
        lastScanTime: null,
        errors: []
      }
    }

    // Run initial scan immediately with REAL data
    await performRealScan(session, alpaca)

    // Schedule periodic scans
    session.scanInterval = setInterval(
      async () => {
        try {
          await performRealScan(session, alpaca)
        } catch (error) {
          console.error('Scan error:', error)
          session.stats.errors.push(error instanceof Error ? error.message : 'Scan failed')
        }
      },
      session.config.scanIntervalMinutes * 60 * 1000
    )

    // Store active session
    activeSessions.set(userId, session)

    // Log bot start in Supabase
    await supabaseService.logBotActivity(userId, {
      type: 'system',
      message: `Bot started with ${config.symbols.length} symbols`,
      status: 'completed',
      details: JSON.stringify({
        sessionId,
        config: session.config,
        accountNumber: account.account_number,
        buyingPower: account.buying_power
      })
    })

    // Update bot metrics in Supabase
    await supabaseService.updateBotMetrics(userId, {
      is_running: true
    })

    return NextResponse.json({
      success: true,
      message: 'Real AI Trading Bot started successfully',
      session: {
        sessionId: session.sessionId,
        startTime: session.startTime,
        config: session.config,
        account: {
          accountNumber: account.account_number,
          buyingPower: parseFloat(account.buying_power),
          equity: parseFloat(account.equity)
        }
      }
    })

  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start bot' 
      },
      { status: 500 }
    )
  }
}

// =============================================
// PERFORM REAL MARKET SCAN
// =============================================

async function performRealScan(session: BotSession, alpaca: AlpacaClient) {
  console.log(`🔍 [${session.sessionId}] Starting real market scan...`)

  const scanStartTime = Date.now()

  try {
    // Get REAL account data from Alpaca
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()

    console.log(`💰 Real Account Status:`)
    console.log(`   Equity: $${parseFloat(account.equity).toFixed(2)}`)
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toFixed(2)}`)
    console.log(`   Positions: ${positions.length}`)

    // Check if we can take new positions
    if (positions.length >= session.config.maxConcurrentPositions) {
      console.log(`⚠️  Max positions reached (${positions.length}/${session.config.maxConcurrentPositions})`)
      await logActivity(session, 'analysis', 'Max positions reached', 'completed')
      return
    }

    // Scan each symbol with REAL market data
    for (const symbol of session.config.symbols) {
      try {
        // Skip if we already have a position
        if (positions.some(p => p.symbol === symbol)) {
          console.log(`⏭️  Skipping ${symbol} - already have position`)
          continue
        }

        console.log(`📊 Analyzing ${symbol} with REAL data...`)

        // Get REAL historical bars from Alpaca
        const barsResponse = await alpaca.getBars(symbol, '1Day', 100)

        if (!barsResponse || !barsResponse.bars || barsResponse.bars.length === 0) {
          console.log(`⚠️  No real data available for ${symbol}`)
          continue
        }

        const bars = barsResponse.bars

        console.log(`✅ Fetched ${bars.length} real bars for ${symbol}`)

        // Basic analysis - check if price is moving up
        const latestPrice = bars[bars.length - 1].c
        const prevPrice = bars[bars.length - 2]?.c || latestPrice
        const priceChange = ((latestPrice - prevPrice) / prevPrice) * 100

        console.log(`📈 ${symbol}: Current $${latestPrice.toFixed(2)}, Change: ${priceChange.toFixed(2)}%`)

        // Simple confidence calculation based on price momentum
        const confidence = Math.min(Math.abs(priceChange) / 2, 0.9)

        // Check confidence threshold
        if (confidence < session.config.minConfidenceThreshold) {
          console.log(`⚠️  Confidence too low: ${confidence.toFixed(2)} < ${session.config.minConfidenceThreshold}`)
          continue
        }

        session.stats.recommendationsGenerated++

        // Simple risk check - ensure we have buying power
        const maxPositionSize = parseFloat(account.buying_power) * session.config.maxRiskPerTrade
        const quantity = Math.floor(maxPositionSize / latestPrice)

        if (quantity < 1) {
          console.log(`⚠️  Insufficient buying power for ${symbol}`)
          continue
        }

        const recommendation = {
          symbol,
          action: priceChange > 0 ? 'BUY' : 'SELL',
          confidence,
          entryPrice: latestPrice,
          quantity,
          stopLoss: latestPrice * 0.98,
          targetPrice: latestPrice * 1.02,
          reasoning: `Price momentum: ${priceChange.toFixed(2)}%`
        }

        console.log(`✅ Recommendation: ${recommendation.action} ${quantity} shares of ${symbol}`)
        console.log(`   Entry: $${recommendation.entryPrice.toFixed(2)}`)
        console.log(`   Stop Loss: $${recommendation.stopLoss.toFixed(2)}`)
        console.log(`   Target: $${recommendation.targetPrice.toFixed(2)}`)

        // Log recommendation (Note: auto-execution is disabled for safety)
        await logActivity(
          session,
          'recommendation',
          `Generated ${recommendation.action} recommendation for ${symbol} (${(confidence * 100).toFixed(1)}% confidence)`,
          'completed',
          { recommendation }
        )

      } catch (symbolError) {
        console.error(`Error processing ${symbol}:`, symbolError)
        session.stats.errors.push(`${symbol}: ${symbolError instanceof Error ? symbolError.message : 'Unknown error'}`)
      }
    }

    // Update scan stats
    session.stats.scansCompleted++
    session.stats.lastScanTime = new Date()

    const scanDuration = Date.now() - scanStartTime
    console.log(`✅ Scan completed in ${scanDuration}ms`)

    await logActivity(
      session,
      'analysis',
      `Market scan completed - ${session.config.symbols.length} symbols analyzed`,
      'completed',
      { duration: scanDuration, recommendationsGenerated: session.stats.recommendationsGenerated }
    )

  } catch (error) {
    console.error('❌ Scan failed:', error)
    session.stats.errors.push(error instanceof Error ? error.message : 'Scan failed')
    
    await logActivity(
      session,
      'analysis',
      `Market scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'failed'
    )
  }
}

// =============================================
// EXECUTE REAL TRADE VIA ALPACA API
// =============================================

async function executeRealTrade(
  session: BotSession,
  symbol: string,
  recommendation: any,
  riskAssessment: any,
  alpaca: AlpacaClient
) {
  console.log(`🚀 Executing REAL trade: ${recommendation.action} ${symbol}`)

  try {
    const notionalValue = riskAssessment.sizing.recommendedNotional

    // Place REAL order through Alpaca API
    const response = await fetch(`${process.env.ALPACA_BASE_URL}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol,
        notional: notionalValue,
        side: recommendation.action.toLowerCase(),
        type: 'market',
        time_in_force: 'day'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Alpaca order failed')
    }

    const order = await response.json()

    console.log(`✅ REAL order placed successfully`)
    console.log(`   Order ID: ${order.id}`)
    console.log(`   Symbol: ${symbol}`)
    console.log(`   Side: ${order.side}`)
    console.log(`   Notional: $${notionalValue.toFixed(2)}`)

    session.stats.tradesExecuted++
    session.stats.tradesSuccessful++

    // Save to REAL Supabase database
    const { error: tradeError } = await supabaseService.client
      .from('trade_history')
      .insert({
        user_id: session.userId,
        symbol,
        side: recommendation.action,
        quantity: parseFloat(order.qty || '0'),
        price: parseFloat(order.filled_avg_price || recommendation.entryPrice),
        value: notionalValue,
        type: 'MARKET',
        status: 'FILLED',
        source: 'AI_BOT',
        confidence: recommendation.confidence,
        strategy: recommendation.strategy,
        order_id: order.id,
        timestamp: new Date().toISOString()
      })

    if (tradeError) {
      console.error('Failed to save trade to Supabase:', tradeError)
    } else {
      console.log('💾 Trade saved to Supabase database')
    }

    // Log activity
    await logActivity(
      session,
      'trade',
      `AI executed ${recommendation.action} $${notionalValue.toFixed(2)} ${symbol}`,
      'completed',
      {
        orderId: order.id,
        confidence: recommendation.confidence,
        strategy: recommendation.strategy
      }
    )

    // Update bot metrics
    await supabaseService.updateBotMetrics(session.userId, {
      is_running: true
    })

  } catch (error) {
    console.error(`❌ Trade execution failed:`, error)
    
    session.stats.tradesFailed++
    session.stats.errors.push(`Trade failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

    await logActivity(
      session,
      'trade',
      `Trade execution failed for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'failed'
    )
  }
}

// =============================================
// STOP BOT
// =============================================

async function stopBot(userId: string) {
  const session = activeSessions.get(userId)
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'No active bot session found' },
      { status: 404 }
    )
  }

  try {
    // Clear scan interval
    if (session.scanInterval) {
      clearInterval(session.scanInterval)
    }

    // Log stop event
    await logActivity(
      session,
      'system',
      'Bot stopped by user',
      'completed',
      { stats: session.stats }
    )

    // Update Supabase
    await supabaseService.updateBotMetrics(userId, {
      is_running: false
    })

    // Remove session
    activeSessions.delete(userId)

    console.log(`🛑 Bot stopped for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Bot stopped successfully',
      stats: session.stats
    })

  } catch (error) {
    console.error('Error stopping bot:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to stop bot' },
      { status: 500 }
    )
  }
}

// =============================================
// GET BOT STATUS
// =============================================

async function getBotStatus(userId: string) {
  const session = activeSessions.get(userId)
  
  if (!session) {
    return NextResponse.json({
      success: true,
      isRunning: false,
      session: null
    })
  }

  return NextResponse.json({
    success: true,
    isRunning: true,
    session: {
      sessionId: session.sessionId,
      startTime: session.startTime,
      config: session.config,
      stats: session.stats
    }
  })
}

// =============================================
// FORCE IMMEDIATE SCAN
// =============================================

async function forceScan(userId: string) {
  const session = activeSessions.get(userId)
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'No active bot session' },
      { status: 404 }
    )
  }

  try {
    const alpaca = new AlpacaClient()
    await performRealScan(session, alpaca)

    return NextResponse.json({
      success: true,
      message: 'Scan completed',
      stats: session.stats
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Scan failed' },
      { status: 500 }
    )
  }
}

// =============================================
// HELPER: LOG ACTIVITY TO SUPABASE
// =============================================

async function logActivity(
  session: BotSession,
  type: 'analysis' | 'trade' | 'recommendation' | 'system',
  message: string,
  status: 'completed' | 'failed',
  metadata?: any
) {
  try {
    await supabaseService.logBotActivity(session.userId, {
      type,
      message,
      status,
      details: JSON.stringify({
        sessionId: session.sessionId,
        ...metadata
      })
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}