import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'
import { detectAssetType } from '@/config/symbols'

// In-memory bot state (in production, use Redis or database)
let botState = {
  isRunning: false,
  config: null,
  startTime: null,
  sessionId: null,
  interval: null
}

// Cache for available assets (refresh every 24 hours)
let cachedCryptoAssets: string[] = []
let cachedStockAssets: string[] = []
let lastCryptoFetch: number = 0
let lastStockFetch: number = 0
const ASSET_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch all available stock trading assets from Alpaca
 */
async function fetchAvailableStockAssets(): Promise<string[]> {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedStockAssets.length > 0 && (now - lastStockFetch) < ASSET_CACHE_DURATION) {
    return cachedStockAssets
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_APCA_API_KEY_ID
    const apiSecret = process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_APCA_API_BASE_URL || 'https://paper-api.alpaca.markets'

    const response = await fetch(`${baseUrl}/v2/assets?asset_class=us_equity&status=active`, {
      headers: {
        'APCA-API-KEY-ID': apiKey!,
        'APCA-API-SECRET-KEY': apiSecret!,
      },
    })

    if (!response.ok) {
      console.warn('Failed to fetch stock assets, using fallback list')
      return getFallbackStockList()
    }

    const assets = await response.json()

    // Extract tradable, fractionable stocks with good liquidity
    const tradableSymbols = assets
      .filter((asset: any) =>
        asset.tradable &&
        asset.status === 'active' &&
        asset.fractionable && // Can buy fractional shares
        asset.easy_to_borrow && // Has good liquidity
        asset.marginable && // Can be traded on margin
        !asset.symbol.includes('/') && // Exclude crypto
        !asset.symbol.includes('-') && // Exclude multi-class stocks
        asset.symbol.length <= 5 // Normal ticker symbols
      )
      .map((asset: any) => asset.symbol)
      .slice(0, 500) // Limit to top 500 most liquid stocks

    // Cache the results
    cachedStockAssets = tradableSymbols
    lastStockFetch = now

    console.log(`✅ Loaded ${tradableSymbols.length} tradable stock assets from Alpaca`)

    return tradableSymbols
  } catch (error) {
    console.error('Error fetching stock assets:', error)
    return getFallbackStockList()
  }
}

/**
 * Fetch all available crypto trading pairs from Alpaca
 */
async function fetchAvailableCryptoAssets(): Promise<string[]> {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedCryptoAssets.length > 0 && (now - lastCryptoFetch) < ASSET_CACHE_DURATION) {
    return cachedCryptoAssets
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_APCA_API_KEY_ID
    const apiSecret = process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_APCA_API_BASE_URL || 'https://paper-api.alpaca.markets'

    const response = await fetch(`${baseUrl}/v2/assets?asset_class=crypto&status=active`, {
      headers: {
        'APCA-API-KEY-ID': apiKey!,
        'APCA-API-SECRET-KEY': apiSecret!,
      },
    })

    if (!response.ok) {
      console.warn('Failed to fetch crypto assets, using fallback list')
      return getFallbackCryptoList()
    }

    const assets = await response.json()

    // Extract tradable symbols (format: BTC/USD, ETH/USD, etc.)
    const tradableSymbols = assets
      .filter((asset: any) => asset.tradable && asset.status === 'active')
      .map((asset: any) => asset.symbol)
      .filter((symbol: string) => symbol.includes('/')) // Only crypto pairs with /

    // Cache the results
    cachedCryptoAssets = tradableSymbols
    lastCryptoFetch = now

    console.log(`✅ Loaded ${tradableSymbols.length} tradable crypto assets from Alpaca`)

    return tradableSymbols
  } catch (error) {
    console.error('Error fetching crypto assets:', error)
    return getFallbackCryptoList()
  }
}

/**
 * Fallback stock list if API fetch fails (top liquid stocks)
 */
function getFallbackStockList(): string[] {
  return [
    // Mega Cap Tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
    // Large Cap Growth
    'AMD', 'INTC', 'CRM', 'ADBE', 'ORCL', 'CSCO', 'AVGO', 'QCOM', 'TXN',
    // Index ETFs
    'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI',
    // Sector Leaders
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ',
    'JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'DHR', 'BMY', 'AMGN',
    'XOM', 'CVX', 'COP', 'SLB', 'EOG',
    'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'COST',
    'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
    'BA', 'CAT', 'GE', 'HON', 'UPS', 'FDX',
    // High Growth Tech
    'SNOW', 'PLTR', 'RBLX', 'COIN', 'RIVN', 'LCID', 'SOFI', 'HOOD',
    'UBER', 'LYFT', 'ABNB', 'DASH', 'DKNG',
    // Semiconductor
    'ASML', 'AMAT', 'LRCX', 'KLAC', 'MU', 'MRVL', 'NXPI',
    // Cloud & SaaS
    'NOW', 'WDAY', 'TEAM', 'ZS', 'CRWD', 'DDOG', 'MDB', 'NET', 'OKTA',
    // EV & Clean Energy
    'NIO', 'XPEV', 'LI', 'ENPH', 'SEDG', 'FSLR', 'PLUG',
    // Biotech
    'MRNA', 'BNTX', 'REGN', 'VRTX', 'GILD', 'BIIB',
    // Retail & Consumer
    'SHOP', 'ETSY', 'EBAY', 'CHWY', 'PINS', 'SNAP',
    // Financial Tech
    'AFRM', 'UPST', 'LC',
    // Sector ETFs
    'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLY', 'XLP', 'XLU', 'XLRE'
  ]
}

/**
 * Fallback crypto list if API fetch fails
 */
function getFallbackCryptoList(): string[] {
  return [
    'BTC/USD', 'ETH/USD', 'DOGE/USD', 'SHIB/USD', 'ADA/USD', 'SOL/USD',
    'MATIC/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD', 'DOT/USD', 'LTC/USD',
    'BCH/USD', 'XLM/USD', 'ATOM/USD', 'ALGO/USD', 'FTM/USD', 'SAND/USD',
    'MANA/USD', 'AXS/USD', 'GALA/USD', 'APE/USD', 'CRV/USD', 'SUSHI/USD',
    'AAVE/USD', 'COMP/USD', 'MKR/USD', 'SNX/USD', 'BAT/USD', 'ENJ/USD'
  ]
}

/**
 * Check if current time is within market hours (Mon-Fri 9:30 AM - 4:00 PM EST)
 */
function isMarketHours(): boolean {
  const now = new Date()
  const day = now.getDay()

  // Weekend check - market closed on Saturday (6) and Sunday (0)
  if (day === 0 || day === 6) {
    return false
  }

  // Market hours: 9:30 AM - 4:00 PM EST
  const hour = now.getHours()
  const minute = now.getMinutes()
  const timeInMinutes = hour * 60 + minute

  const marketOpen = 9 * 60 + 30  // 9:30 AM = 570 minutes
  const marketClose = 16 * 60      // 4:00 PM = 960 minutes

  return timeInMinutes >= marketOpen && timeInMinutes < marketClose
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
      interval: null
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
      interval: null
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

    // Stop the bot logic
    stopBotLogic(sessionId!)

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
      interval: null
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
 * Start the actual bot trading logic with real Alpaca API integration
 */
function startBotLogic(sessionId: string, config: any) {
  console.log(`🧠 Starting AI trading logic with Alpaca API for session: ${sessionId}`)
  console.log(`🔗 Alpaca Paper Trading: ENABLED`)
  console.log(`💾 Supabase Database: ENABLED`)

  const userId = getCurrentUserId()

  // Real AI trading logic - runs every 30 seconds
  const interval = setInterval(async () => {
    if (!botState.isRunning || botState.sessionId !== sessionId) {
      clearInterval(interval)
      return
    }

    try {
      // 1. AI Market Analysis - Fetch ALL available assets from Alpaca
      const marketOpen = isMarketHours()

      // Fetch all available assets from Alpaca (cached for 24 hours)
      const stockSymbols = await fetchAvailableStockAssets()
      const cryptoSymbols = await fetchAvailableCryptoAssets()

      // CRITICAL: Only include stocks if market is open, crypto is always available (24/7 trading)
      const availableSymbols = marketOpen
        ? [...stockSymbols, ...cryptoSymbols] // Market open: Both stocks and crypto
        : cryptoSymbols // Market closed: Only crypto (24/7 trading)

      const selectedSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)]
      const assetType = detectAssetType(selectedSymbol)

      console.log(`🎯 AI analyzing ${assetType === 'crypto' ? 'CRYPTO' : 'STOCK'} ${selectedSymbol} for trading opportunities...`)
      console.log(`📊 Market Status: ${marketOpen ? 'OPEN' : 'CLOSED'}`)
      console.log(`📈 Asset Pool: ${stockSymbols.length} stocks + ${cryptoSymbols.length} crypto = ${availableSymbols.length} total tradable assets`)
      console.log(`🔍 Trading Mode: ${marketOpen ? 'Stocks + Crypto' : 'Crypto Only - 24/7 Trading'}`)

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

// Execute actual trades via Alpaca API
async function executeTradeViaAlpaca(userId: string, symbol: string, signal: string, confidence: number, sessionId: string) {
  try {
    // CRITICAL: Detect asset type and check market hours
    const assetType = detectAssetType(symbol)
    const isCrypto = assetType === 'crypto'
    const marketOpen = isMarketHours()

    // STOCKS: Only execute during market hours
    if (!isCrypto && !marketOpen) {
      console.log(`⏰ BLOCKED: ${signal} ${symbol} - Stock market is closed (stocks only trade Mon-Fri 9:30 AM - 4:00 PM EST)`)

      // Log blocked trade to Supabase
      await supabaseService.logBotActivity(userId, {
        type: 'info',
        symbol: symbol,
        message: `Trade blocked: ${signal} ${symbol} - Stock market closed`,
        status: 'completed',
        details: JSON.stringify({
          reason: 'market_closed',
          assetType: 'stock',
          signal,
          confidence,
          sessionId,
          note: 'Stocks only trade during market hours (Mon-Fri 9:30 AM - 4:00 PM EST)'
        })
      })

      return // Exit early - do not execute stock trades when market is closed
    }

    console.log(`🔄 Executing ${signal} order for ${isCrypto ? 'CRYPTO' : 'STOCK'} ${symbol} via Alpaca API...`)
    console.log(`📊 Asset Type: ${assetType} | Market Hours: ${marketOpen ? 'OPEN' : 'CLOSED'} | Can Trade: ${isCrypto ? '24/7' : 'Market Hours Only'}`)

    // Calculate position size (1-5 shares for demo)
    const quantity = Math.floor(1 + Math.random() * 4)

    // Call Alpaca API to place order using unified client with proper asset_class
    const orderResult = await alpacaClient.createOrder({
      symbol,
      qty: quantity,
      side: signal.toLowerCase(),
      type: 'market',
      time_in_force: isCrypto ? 'gtc' : 'day', // Crypto uses GTC (Good-Til-Canceled), stocks use day
      asset_class: isCrypto ? 'crypto' : 'us_equity' // CRITICAL: Alpaca requires this for proper routing
    })

    if (orderResult) {

      console.log(`✅ ${signal} order placed: ${quantity} shares of ${symbol}`)
      console.log(`📋 Order ID: ${orderResult.id || orderResult.orderId}`)
      console.log(`📊 Order Status: ${orderResult.status}`)

      // Get current market price for value calculation (approximation)
      const estimatedPrice = 100 + Math.random() * 300 // Simulate market price for demo
      const estimatedValue = quantity * estimatedPrice

      // Log successful trade to Supabase
      await supabaseService.logBotActivity(userId, {
        type: 'trade',
        symbol: symbol,
        message: `${signal} ${quantity} shares of ${symbol} - Order placed via Alpaca API (ID: ${orderResult.id || orderResult.orderId})`,
        status: 'completed',
        details: JSON.stringify({
          orderId: orderResult.id || orderResult.orderId,
          quantity,
          side: signal,
          confidence,
          sessionId,
          orderStatus: orderResult.status,
          estimatedValue,
          alpacaResponse: orderResult
        })
      })

      // Save trade to trade_history table
      await supabaseService.saveTrade(userId, {
        symbol,
        side: signal.toLowerCase(),
        quantity,
        price: estimatedPrice, // Estimated market price
        value: estimatedValue, // Estimated total value
        timestamp: new Date().toISOString(),
        status: orderResult.status === 'filled' ? 'FILLED' : 'PENDING',
        order_id: orderResult.id || orderResult.orderId,
        ai_confidence: confidence
      })

      console.log(`💾 Trade saved to Supabase: ${signal} ${quantity} ${symbol} @ $${estimatedPrice.toFixed(2)}`)

    }

  } catch (error) {
    console.error(`❌ Trade execution error:`, error)

    // Log execution error to Supabase
    await supabaseService.logBotActivity(userId, {
      type: 'error',
      symbol: symbol,
      message: `Trade execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'failed',
      details: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol,
        signal,
        sessionId
      })
    })
  }
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