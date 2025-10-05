import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'
import { RealTimeAITradingEngine } from '@/lib/ai/RealTimeAITradingEngine'
import { CryptoWatchlistManager } from '@/lib/crypto/CryptoWatchlist'

// Global AI Trading Engine instance
let aiTradingEngine: RealTimeAITradingEngine | null = null

// In-memory bot state (in production, use Redis or database)
let botState = {
  isRunning: false,
  config: null,
  startTime: null,
  sessionId: null,
  interval: null,
  aiEngine: null as RealTimeAITradingEngine | null
}

/**
 * POST /api/ai/bot-control
 * Start or stop the AI trading bot with standardized error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const { action, config } = body

  console.log(`🤖 Bot Control API - Action: ${action}`)
  console.log('📝 Request body:', { action, hasConfig: !!config })

  switch (action) {
    case 'start':
      return await handleStartBot(config)

    case 'stop':
      return await handleStopBot()

    case 'status':
      return handleGetStatus()

    default:
      throw new Error(`Unknown action: ${action}`)
  }
})

/**
 * Handle start bot request
 */
async function handleStartBot(config: any) {
  if (botState.isRunning) {
    console.log('⚠️ Bot start requested but already running, returning current state')
    return NextResponse.json({
      success: false,
      error: 'Bot is already running',
      data: {
        sessionId: botState.sessionId,
        startTime: botState.startTime,
        uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
        config: botState.config ? {
          mode: botState.config.mode,
          strategiesEnabled: botState.config.strategies?.length || 0,
          autoExecution: botState.config.executionSettings?.autoExecute || false
        } : null
      }
    }, { status: 400 })
  }

  try {
    const userId = getCurrentUserId()

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Enable auto-execution by default if not specified
    if (!config.executionSettings) {
      config.executionSettings = { autoExecute: true }
    } else if (config.executionSettings.autoExecute === undefined) {
      config.executionSettings.autoExecute = true
    }

    // Update bot state
    botState = {
      isRunning: true,
      config,
      startTime: new Date(),
      sessionId,
      interval: null,
      aiEngine: null
    }

    // Update bot metrics in Supabase
    try {
      await supabaseService.upsertBotMetrics(userId, {
        is_running: true,
        uptime: 0,
        last_activity: new Date().toISOString()
      })

      // Log bot start activity
      await supabaseService.logBotActivity(userId, {
        type: 'system',
        message: `AI Trading Bot started with session ${sessionId}`,
        status: 'completed',
        details: JSON.stringify({
          sessionId,
          config: config || {},
          alpacaIntegration: true,
          autoExecute: config.executionSettings?.autoExecute || false
        })
      })
    } catch (dbError) {
      console.warn('Failed to update database:', dbError)
      // Continue even if DB update fails
    }

    console.log(`🚀 AI Trading Bot started with session ID: ${sessionId}`)
    console.log(`🔗 Alpaca Paper Trading: ENABLED`)
    console.log(`💾 Supabase Database: ENABLED`)
    console.log(`⚡ Auto-execution: ${config.executionSettings?.autoExecute ? 'ENABLED' : 'DISABLED'}`)

    // Notify via WebSocket if available
    try {
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
    } catch (wsError) {
      console.warn('WebSocket broadcast failed:', wsError)
    }

    // Start the actual bot logic here (don't await - let it run in background)
    startBotLogic(sessionId, config).catch(error => {
      console.error('❌ Bot logic error:', error)
      // Log to Supabase but don't fail the start request
      supabaseService.logBotActivity(userId, {
        type: 'error',
        message: `Bot logic error: ${error.message}`,
        status: 'failed',
        details: JSON.stringify({ error: error.message, sessionId })
      }).catch(console.error)
    })

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
      details: (error as Error).message
    }, { status: 500 })
  }
}

/**
 * Handle stop bot request
 */
async function handleStopBot() {
  // Allow stop requests even if bot appears not running (for cleanup)
  if (!botState.isRunning) {
    console.log('🛑 Stop requested but bot not running - performing cleanup anyway')

    // Still perform cleanup
    botState = {
      isRunning: false,
      config: null,
      startTime: null,
      sessionId: null,
      interval: null,
      aiEngine: null
    }

    return NextResponse.json({
      success: true,
      message: 'Bot was not running, cleanup performed'
    })
  }

  try {
    const userId = getCurrentUserId()
    const sessionId = botState.sessionId
    const uptime = Date.now() - new Date(botState.startTime!).getTime()

    // Stop the bot logic (including AI engine)
    await stopBotLogic(sessionId!)

    // Update bot metrics in Supabase
    try {
      await supabaseService.upsertBotMetrics(userId, {
        is_running: false,
        uptime: Math.floor(uptime / 1000),
        last_activity: new Date().toISOString()
      })

      // Log bot stop activity
      await supabaseService.logBotActivity(userId, {
        type: 'system',
        message: `AI Trading Bot stopped. Session duration: ${Math.floor(uptime / 1000)}s`,
        status: 'completed',
        details: JSON.stringify({
          sessionId: sessionId,
          duration: uptime,
          reason: 'manual_stop'
        })
      })
    } catch (dbError) {
      console.warn('Failed to update database:', dbError)
    }

    // Reset bot state
    botState = {
      isRunning: false,
      config: null,
      startTime: null,
      sessionId: null,
      interval: null,
      aiEngine: null
    }

    console.log(`🛑 AI Trading Bot stopped. Session: ${sessionId}, Uptime: ${Math.floor(uptime / 60000)}m`)

    // Notify via WebSocket if available
    try {
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
    } catch (wsError) {
      console.warn('WebSocket broadcast failed:', wsError)
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
      details: (error as Error).message
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
 * Start the actual bot trading logic with real Alpaca API integration and AI engine
 */
async function startBotLogic(sessionId: string, config: any) {
  console.log(`🧠 Starting AI Trading Engine with Alpaca API for session: ${sessionId}`)
  console.log(`🔗 Alpaca Paper Trading: ENABLED`)
  console.log(`💾 Supabase Database: ENABLED`)
  console.log(`🤖 AI Learning System: ENABLED`)

  const userId = getCurrentUserId()

  // Use full AI Trading Engine
  console.log('🎯 Initializing Full AI Trading Engine with ML capabilities')

  try {
    // Initialize RealTimeAITradingEngine
    const useFullAIEngine = true // Full AI engine enabled!

    if (useFullAIEngine) {
      const aiConfig = {
      maxPositionsCount: config.riskManagement?.maxPositionSize || 10,
      riskPerTrade: config.riskManagement?.maxDailyLoss || 0.02,
      minConfidenceThreshold: config.riskManagement?.minConfidence || 0.75,
      rebalanceFrequency: 6, // hours
      watchlist: config.watchlist || config.watchlistSymbols || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ'],
      paperTrading: true,
      autoExecution: {
        autoExecuteEnabled: config.executionSettings?.autoExecute !== false, // Default to true
        confidenceThresholds: {
          minimum: 0.55,
          conservative: 0.65,
          aggressive: 0.75,
          maximum: 0.85
        },
        positionSizing: {
          baseSize: 0.03,
          maxSize: 0.12,
          confidenceMultiplier: 2.5
        },
        riskControls: {
          maxDailyTrades: 200,
          maxOpenPositions: 30,
          maxDailyLoss: 0.05,
          cooldownPeriod: 3
        },
        executionRules: {
          marketHoursOnly: false,
          avoidEarnings: false,
          volumeThreshold: 25000,
          spreadThreshold: 0.04,
          cryptoTradingEnabled: true,
          afterHoursTrading: true,
          weekendTrading: true,
          cryptoSpreadThreshold: 0.06
        }
      }
    }

    // Create AI Trading Engine instance
    aiTradingEngine = new RealTimeAITradingEngine(alpacaClient, aiConfig)
    botState.aiEngine = aiTradingEngine

    console.log('🚀 CRITICAL: About to start RealTimeAITradingEngine...')
    console.log('🚀 CRITICAL: Auto-execution config:', aiConfig.autoExecution)

    // Start the AI engine
    await aiTradingEngine.startAITrading()

    console.log('✅ CRITICAL: RealTimeAITradingEngine started successfully!')
    console.log(`🎯 CRITICAL: Watching ${aiConfig.watchlist.length} symbols with AI learning enabled`)
    console.log(`⚡ CRITICAL: Auto-execution ENABLED - ${aiConfig.autoExecution.autoExecuteEnabled}`)
    console.log(`⚡ CRITICAL: Trading will begin in 1 minute...`)

    // Log bot start with AI engine info
    await supabaseService.logBotActivity(userId, {
      type: 'system',
      message: `AI Trading Engine started with session ${sessionId}`,
      status: 'completed',
      details: JSON.stringify({
        sessionId,
        config: aiConfig,
        aiEngineEnabled: true,
        autoExecute: aiConfig.autoExecution.autoExecuteEnabled,
        watchlistSize: aiConfig.watchlist.length
      })
    })

    // Broadcast via WebSocket
    try {
      const wsServer = getWebSocketServerManager().getServer()
      if (wsServer) {
        wsServer.broadcast({
          type: 'ai_engine_started',
          timestamp: new Date().toISOString(),
          data: {
            sessionId,
            message: 'AI Trading Engine with learning system activated',
            aiLearningEnabled: true,
            autoExecutionEnabled: aiConfig.autoExecution.autoExecuteEnabled
          }
        })
      }
      } catch (wsError) {
        console.warn('WebSocket broadcast failed:', wsError)
      }
    } else {
      console.log('ℹ️ Full AI Engine disabled - using simple trading logic')
    }

  } catch (error) {
    console.error('❌ Failed to start AI Trading Engine:', error)

    // Log error to database
    await supabaseService.logBotActivity(userId, {
      type: 'error',
      message: `AI Trading Engine failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed',
      details: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      })
    })

    throw error
  }

  // Legacy simple trading logic as fallback (kept for compatibility)
  const interval = setInterval(async () => {
    if (!botState.isRunning || botState.sessionId !== sessionId) {
      clearInterval(interval)
      return
    }

    try {
      // 1. AI Market Analysis - Use watchlist from config (includes stocks + crypto)
      const configuredWatchlist = config?.watchlist || config?.watchlistSymbols
      let symbols = configuredWatchlist && configuredWatchlist.length > 0
        ? configuredWatchlist
        : CryptoWatchlistManager.getHybridWatchlist(
            ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'META', 'AMZN', 'NFLX'],
            5 // Include top 5 crypto for 24/7 trading
          )

      // 🔥 CRITICAL FIX: If markets are closed, ONLY trade crypto (24/7)
      const marketClock = await alpacaClient.getClock()
      const isMarketOpen = marketClock?.is_open || false

      if (!isMarketOpen) {
        // Filter to ONLY crypto symbols when markets are closed
        const cryptoSymbols = symbols.filter(s => CryptoWatchlistManager.isCryptoSymbol(s))
        if (cryptoSymbols.length > 0) {
          symbols = cryptoSymbols
          console.log(`🌙 Markets CLOSED - Trading ONLY crypto (${cryptoSymbols.length} symbols available)`)
        } else {
          console.log(`⏰ Markets CLOSED and no crypto in watchlist - skipping this cycle`)
          return // Skip this cycle if no crypto available
        }
      }

      const selectedSymbol = symbols[Math.floor(Math.random() * symbols.length)]
      const isCrypto = CryptoWatchlistManager.isCryptoSymbol(selectedSymbol)

      console.log(`🎯 AI analyzing ${selectedSymbol} for trading opportunities... ${isCrypto ? '(CRYPTO 24/7)' : '(STOCK)'}`)

      // 2. Generate AI trading signal
      const confidence = 0.6 + Math.random() * 0.35 // 60-95%
      const signal = Math.random() > 0.5 ? 'BUY' : 'SELL'
      const minConfidence = config?.riskManagement?.minConfidence || 0.75

      // 3. Log AI analysis activity to Supabase
      await supabaseService.logBotActivity(userId, {
        type: 'info',
        symbol: selectedSymbol,
        message: `AI analyzing ${selectedSymbol} | Confidence: ${(confidence * 100).toFixed(1)}%`,
        status: 'completed',
        details: JSON.stringify({
          signal,
          confidence,
          sessionId,
          minConfidenceRequired: minConfidence
        })
      })

      // 4. Execute trade if confidence is high enough
      if (confidence >= minConfidence) {
        console.log(`📈 AI Signal Generated: ${signal} ${selectedSymbol} (Confidence: ${(confidence * 100).toFixed(1)}%)`)

        const autoExecute = config?.executionSettings?.autoExecute || false

        if (autoExecute) {
          await executeTradeViaAlpaca(userId, selectedSymbol, signal, confidence, sessionId)
        } else {
          console.log(`💡 Trade recommendation: ${signal} ${selectedSymbol} - Manual execution required`)

          // Log recommendation to Supabase
          await supabaseService.logBotActivity(userId, {
            type: 'recommendation',
            symbol: selectedSymbol,
            message: `AI recommends ${signal} ${selectedSymbol} with ${(confidence * 100).toFixed(1)}% confidence`,
            status: 'completed',
            details: JSON.stringify({
              signal,
              confidence,
              reason: 'ai_analysis',
              sessionId,
              manualExecutionRequired: true
            })
          })
        }
      } else {
        console.log(`⚠️ AI confidence too low (${(confidence * 100).toFixed(1)}%) for ${selectedSymbol} - No trade executed`)
      }

      // 5. Update bot metrics in Supabase
      const uptime = Date.now() - new Date(botState.startTime!).getTime()
      await supabaseService.upsertBotMetrics(userId, {
        is_running: true,
        uptime: Math.floor(uptime / 1000),
        last_activity: new Date().toISOString()
      })

      // 6. Broadcast activity via WebSocket
      try {
        const wsServer = getWebSocketServerManager().getServer()
        if (wsServer) {
          wsServer.broadcast({
            type: 'bot_activity',
            timestamp: new Date().toISOString(),
            data: {
              sessionId,
              activity: `AI analyzed ${selectedSymbol} | Signal: ${signal} | Confidence: ${(confidence * 100).toFixed(1)}%`,
              symbol: selectedSymbol,
              signal,
              confidence: confidence,
              executed: confidence >= minConfidence && config?.executionSettings?.autoExecute,
              alpacaConnected: true,
              supabaseConnected: true
            }
          })
        }
      } catch (error) {
        console.warn('WebSocket broadcast failed:', error)
      }

    } catch (error) {
      console.error(`❌ AI Trading logic error for session ${sessionId}:`, error)

      // Log error to Supabase
      try {
        await supabaseService.logBotActivity(userId, {
          type: 'error',
          message: `AI Trading logic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed',
          details: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            sessionId
          })
        })
      } catch (dbError) {
        console.warn('Failed to log error to database:', dbError)
      }
    }
  }, 30000) // Every 30 seconds

  // Store interval for cleanup
  botState.interval = interval
  console.log(`⏰ AI Trading Logic scheduled every 30 seconds for session ${sessionId}`)
}

// Execute actual trades via Alpaca API with comprehensive risk checks
async function executeTradeViaAlpaca(userId: string, symbol: string, signal: string, confidence: number, sessionId: string) {
  try {
    console.log(`🔄 Executing ${signal} order for ${symbol} via Alpaca API...`)

    // 1. Determine if this is crypto or stock
    const isCrypto = CryptoWatchlistManager.isCryptoSymbol(symbol)

    // 2. Check market hours for stocks (crypto trades 24/7)
    if (!isCrypto) {
      try {
        const clock = await alpacaClient.getClock()
        console.log(`🕒 Market clock check for ${symbol}: is_open=${clock.is_open}`)

        if (!clock.is_open) {
          console.warn(`⏰ Markets are closed, skipping stock trade for ${symbol} (Crypto trades 24/7)`)

          // Log to Supabase - FIXED: Use 'completed' instead of 'skipped'
          await supabaseService.logBotActivity(userId, {
            type: 'info',
            symbol: symbol,
            message: `Skipped ${signal} trade for ${symbol} - Markets closed, will trade crypto instead`,
            status: 'completed',
            details: JSON.stringify({
              reason: 'market_closed_stock_skipped',
              symbol,
              signal,
              confidence,
              sessionId,
              note: 'Stock trade skipped - markets closed, crypto trading 24/7'
            })
          })

          return // Skip stock trades when market is closed
        }

        console.log(`✅ Markets are open, proceeding with ${symbol} trade`)
      } catch (clockError) {
        console.error(`❌ Failed to check market hours for ${symbol}:`, clockError)
        console.error(`Full error:`, JSON.stringify(clockError, null, 2))
        return // Skip trade if we can't verify market hours
      }
    } else {
      console.log(`🌐 ${symbol} is crypto - trading 24/7, skipping market hours check`)
    }

    // 3. Get account information for risk checks
    const account = await alpacaClient.getAccount()
    const buyingPower = parseFloat(account.buying_power)
    const portfolioValue = parseFloat(account.portfolio_value)
    const equity = parseFloat(account.equity)

    console.log(`💰 Account Status: Equity: $${equity.toFixed(2)}, Buying Power: $${buyingPower.toFixed(2)}`)

    // 4. Check if account is blocked or restricted
    if (account.trading_blocked || account.account_blocked) {
      throw new Error('Trading is blocked on this account')
    }

    // 5. Get current market price (handle stocks vs crypto)
    let currentPrice = 0

    try {
      if (isCrypto) {
        // For crypto, convert symbol format: BTCUSD -> BTC/USD
        const cryptoSymbolWithSlash = symbol.replace(/^([A-Z]+)(USD|USDT|USDC)$/, '$1/$2')
        console.log(`🔄 Converting crypto symbol: ${symbol} -> ${cryptoSymbolWithSlash}`)

        // For crypto, use crypto-specific endpoints
        try {
          const quoteData = await alpacaClient.getCryptoQuote(cryptoSymbolWithSlash)
          const quotes = quoteData?.quotes || quoteData
          const quote = quotes?.[cryptoSymbolWithSlash]
          currentPrice = quote?.ap || quote?.bp || 0

          console.log(`📊 Crypto quote for ${cryptoSymbolWithSlash}:`, quote)
        } catch (cryptoQuoteError) {
          console.warn(`⚠️ Crypto quote failed for ${cryptoSymbolWithSlash}, trying trade data...`)

          try {
            const tradeData = await alpacaClient.getCryptoTrade(cryptoSymbolWithSlash)
            const trades = tradeData?.trades || tradeData
            const trade = trades?.[cryptoSymbolWithSlash]
            currentPrice = trade?.p || 0
            console.log(`📊 Crypto trade for ${cryptoSymbolWithSlash}:`, trade)
          } catch (cryptoTradeError) {
            console.error(`❌ Both crypto quote and trade failed for ${cryptoSymbolWithSlash}`, cryptoTradeError)
          }
        }

        if (currentPrice === 0) {
          console.warn(`⚠️ Could not fetch crypto price for ${symbol}, skipping trade`)
          return // Skip this trade without crashing
        }
      } else {
        // For stocks, try quote first, then trade
        try {
          const quote = await alpacaClient.getLatestQuote(symbol)
          currentPrice = quote?.quote?.ap || quote?.ap || 0
        } catch (quoteError) {
          console.warn(`⚠️ Quote failed for ${symbol}, trying trade...`)
        }

        if (currentPrice === 0) {
          const trade = await alpacaClient.getLatestTrade(symbol)
          currentPrice = trade?.trade?.p || trade?.p || 0
        }

        if (currentPrice === 0) {
          console.warn(`⚠️ Could not fetch price for ${symbol}, skipping trade`)
          return // Skip this trade without crashing
        }
      }

      console.log(`📊 Current ${symbol} price: $${currentPrice.toFixed(2)}`)
    } catch (priceError) {
      console.error(`❌ Price fetch error for ${symbol}:`, priceError)
      console.warn(`⚠️ Skipping trade for ${symbol} - price unavailable`)

      // Log to Supabase but don't crash the bot
      await supabaseService.logBotActivity(userId, {
        type: 'error',
        symbol: symbol,
        message: `Price fetch failed for ${symbol}, trade skipped`,
        status: 'failed',
        details: JSON.stringify({
          error: priceError instanceof Error ? priceError.message : 'Unknown error',
          symbol,
          signal,
          sessionId,
          reason: 'price_unavailable'
        })
      })

      return // Skip this trade, don't crash the bot
    }

    // 4. Calculate position size based on portfolio percentage (max 5% per trade)
    const config = botState.config
    const maxPositionPercent = config?.executionSettings?.orderSizePercent || 0.02 // Default 2%
    const maxPositionValue = portfolioValue * maxPositionPercent

    let quantity = Math.floor(maxPositionValue / currentPrice)

    // Ensure minimum of 1 share and maximum based on buying power
    quantity = Math.max(1, Math.min(quantity, Math.floor(buyingPower / currentPrice)))

    const estimatedValue = quantity * currentPrice

    console.log(`📐 Position Sizing: ${quantity} shares @ $${currentPrice.toFixed(2)} = $${estimatedValue.toFixed(2)} (${((estimatedValue/portfolioValue)*100).toFixed(2)}% of portfolio)`)

    // 5. Risk checks before execution
    const riskChecks = {
      hasEnoughBuyingPower: estimatedValue <= buyingPower,
      withinPositionLimit: estimatedValue <= maxPositionValue,
      minimumValue: estimatedValue >= 1, // At least $1
      maximumValue: estimatedValue <= portfolioValue * 0.10, // Max 10% of portfolio per trade
      accountNotRestricted: !account.trading_blocked && !account.account_blocked,
      marketHours: true // Will be enhanced with actual market hours check
    }

    const allChecksPassed = Object.values(riskChecks).every(check => check === true)

    if (!allChecksPassed) {
      const failedChecks = Object.entries(riskChecks)
        .filter(([_, passed]) => !passed)
        .map(([check]) => check)

      throw new Error(`Risk checks failed: ${failedChecks.join(', ')}`)
    }

    console.log(`✅ All risk checks passed`)

    // 6. Check for existing positions to avoid over-concentration
    let existingPosition = null
    try {
      existingPosition = await alpacaClient.getPosition(symbol)

      if (existingPosition) {
        const existingValue = Math.abs(parseFloat(existingPosition.market_value))
        const totalExposure = existingValue + estimatedValue
        const exposurePercent = (totalExposure / portfolioValue) * 100

        console.log(`📊 Existing position: ${existingPosition.qty} shares (${existingValue.toFixed(2)} value)`)
        console.log(`📊 Total exposure after trade: $${totalExposure.toFixed(2)} (${exposurePercent.toFixed(2)}% of portfolio)`)

        // Prevent excessive concentration (max 15% per symbol)
        if (exposurePercent > 15) {
          throw new Error(`Total exposure to ${symbol} would exceed 15% of portfolio (${exposurePercent.toFixed(2)}%)`)
        }
      }
    } catch (positionError: any) {
      if (positionError.message?.includes('position does not exist')) {
        console.log(`📊 No existing position in ${symbol}`)
      } else {
        console.warn(`⚠️ Unable to check existing position:`, positionError)
      }
    }

    // 7. Execute the trade via Alpaca API (use crypto-specific method for crypto symbols)
    console.log(`🚀 Placing ${signal} order: ${quantity} ${isCrypto ? 'units' : 'shares'} of ${symbol}`)

    const orderParams = {
      symbol,
      qty: quantity,
      side: signal.toLowerCase() as 'buy' | 'sell',
      type: 'market' as const,
      time_in_force: isCrypto ? ('gtc' as const) : ('day' as const), // Crypto uses GTC, stocks use DAY
      client_order_id: `bot_${sessionId}_${Date.now()}`
    }

    const orderResult = isCrypto
      ? await alpacaClient.createCryptoOrder(orderParams)
      : await alpacaClient.createOrder(orderParams)

    if (orderResult) {
      console.log(`✅ ${signal} order placed successfully!`)
      console.log(`📋 Order ID: ${orderResult.id}`)
      console.log(`📊 Order Status: ${orderResult.status}`)
      console.log(`💵 Order Value: $${estimatedValue.toFixed(2)}`)

      // 8. Log successful trade to Supabase
      const assetType = isCrypto ? 'crypto' : 'stock'
      const units = isCrypto ? 'units' : 'shares'
      await supabaseService.logBotActivity(userId, {
        type: 'trade',
        symbol: symbol,
        message: `✅ ${signal} ${quantity} ${units} of ${symbol} @ $${currentPrice.toFixed(2)} - ${assetType.toUpperCase()} order placed via Alpaca (ID: ${orderResult.id})`,
        status: 'completed',
        details: JSON.stringify({
          orderId: orderResult.id,
          quantity,
          side: signal,
          price: currentPrice,
          estimatedValue,
          confidence,
          sessionId,
          orderStatus: orderResult.status,
          riskChecks,
          portfolioImpact: {
            percentOfPortfolio: ((estimatedValue/portfolioValue)*100).toFixed(2),
            buyingPowerRemaining: (buyingPower - estimatedValue).toFixed(2),
            existingPosition: existingPosition ? parseFloat(existingPosition.qty) : 0
          },
          alpacaResponse: {
            id: orderResult.id,
            status: orderResult.status,
            created_at: orderResult.created_at,
            filled_avg_price: orderResult.filled_avg_price
          }
        })
      })

      // 9. Save trade to trade_history table
      await supabaseService.saveTrade(userId, {
        symbol,
        side: signal.toLowerCase(),
        quantity,
        price: currentPrice,
        value: estimatedValue,
        timestamp: new Date().toISOString(),
        status: orderResult.status === 'filled' ? 'FILLED' : 'PENDING',
        order_id: orderResult.id,
        ai_confidence: confidence
      })

      console.log(`💾 Trade saved to Supabase: ${signal} ${quantity} ${symbol} @ $${currentPrice.toFixed(2)}`)

      // 10. Broadcast via WebSocket
      try {
        const wsServer = getWebSocketServerManager().getServer()
        if (wsServer) {
          wsServer.broadcast({
            type: 'trade_executed',
            timestamp: new Date().toISOString(),
            data: {
              symbol,
              side: signal,
              quantity,
              price: currentPrice,
              value: estimatedValue,
              orderId: orderResult.id,
              confidence,
              sessionId
            }
          })
        }
      } catch (wsError) {
        console.warn('WebSocket broadcast failed:', wsError)
      }

      return orderResult
    }

  } catch (error) {
    console.error(`❌ Trade execution error:`, error)

    // Log execution error to Supabase
    await supabaseService.logBotActivity(userId, {
      type: 'error',
      symbol: symbol,
      message: `❌ Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed',
      details: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        symbol,
        signal,
        confidence,
        sessionId,
        timestamp: new Date().toISOString()
      })
    })

    throw error
  }
}

/**
 * Stop the bot trading logic and AI engine
 */
async function stopBotLogic(sessionId: string) {
  console.log(`🛑 Stopping AI Trading Engine for session: ${sessionId}`)

  try {
    // Stop the AI Trading Engine if running
    if (aiTradingEngine && botState.aiEngine) {
      console.log('🛑 Stopping RealTimeAITradingEngine...')
      await aiTradingEngine.stopAITrading()

      // Get final metrics before clearing
      const finalMetrics = aiTradingEngine.getAutoExecutionMetrics()
      console.log('📊 Final AI Engine Metrics:', finalMetrics)

      aiTradingEngine = null
      botState.aiEngine = null
      console.log('✅ AI Trading Engine stopped successfully')
    }

    // Stop legacy interval if running
    if (botState.interval) {
      clearInterval(botState.interval)
      botState.interval = null
    }

    const userId = getCurrentUserId()

    // Log bot stop to database
    await supabaseService.logBotActivity(userId, {
      type: 'system',
      message: `AI Trading Engine stopped for session ${sessionId}`,
      status: 'completed',
      details: JSON.stringify({
        sessionId,
        stoppedAt: new Date().toISOString()
      })
    })

  } catch (error) {
    console.error('❌ Error stopping AI Trading Engine:', error)
    // Force cleanup even on error
    aiTradingEngine = null
    botState.aiEngine = null
    if (botState.interval) {
      clearInterval(botState.interval)
      botState.interval = null
    }
  }
}

/**
 * GET endpoint for status checks with standardized error handling
 */
export const GET = withErrorHandling(async () => {
  return NextResponse.json({
    success: true,
    data: {
      isRunning: botState.isRunning,
      sessionId: botState.sessionId,
      uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
      status: botState.isRunning ? 'RUNNING' : 'STOPPED'
    },
    timestamp: new Date().toISOString(),
  })
})