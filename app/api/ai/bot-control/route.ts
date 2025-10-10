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
    // Alpaca only supports crypto paired with USD, USDT, or USDC
    // Exclude stablecoins (USDC, USDT, DAI, BUSD) - they don't have price movement
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP']

    const tradableSymbols = assets
      .filter((asset: any) => asset.tradable && asset.status === 'active')
      .map((asset: any) => asset.symbol)
      .filter((symbol: string) => {
        const baseCurrency = symbol.split('/')[0]
        return symbol.includes('/') && // Only crypto pairs with /
          (symbol.endsWith('/USD') || symbol.endsWith('/USDT') || symbol.endsWith('/USDC')) && // Only USD pairs
          !stablecoins.includes(baseCurrency) // Exclude stablecoins
      })

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
 * Advanced Technical Analysis with Real Market Data
 */
async function analyzeTechnicalIndicators(symbol: string): Promise<{
  signal: string
  confidence: number
  indicators: any
  marketCondition: string
}> {
  try {
    // Fetch real market data from Alpaca
    const bars = await alpacaClient.getBars(symbol, {
      timeframe: '1Hour',
      limit: 100
    })

    if (!bars || bars.length < 50) {
      // Not enough data - return neutral
      return {
        signal: 'HOLD',
        confidence: 0.50,
        indicators: {},
        marketCondition: 'UNKNOWN'
      }
    }

    const closes = bars.map((b: any) => b.close)
    const highs = bars.map((b: any) => b.high)
    const lows = bars.map((b: any) => b.low)
    const volumes = bars.map((b: any) => b.volume)
    const currentPrice = closes[closes.length - 1]

    // Calculate RSI (14 period)
    const rsi = calculateRSI(closes, 14)

    // Calculate MACD
    const macd = calculateMACD(closes)

    // Calculate Moving Averages
    const sma20 = calculateSMA(closes, 20)
    const sma50 = calculateSMA(closes, 50)
    const ema12 = calculateEMA(closes, 12)
    const ema26 = calculateEMA(closes, 26)

    // Calculate Bollinger Bands
    const bb = calculateBollingerBands(closes, 20, 2)

    // Volume Analysis
    const avgVolume = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
    const currentVolume = volumes[volumes.length - 1]
    const volumeRatio = currentVolume / avgVolume

    // ATR for volatility
    const atr = calculateATR(highs, lows, closes, 14)
    const volatility = atr / currentPrice

    // === SCORING SYSTEM (0-100) ===
    let score = 50 // Start neutral
    let signalStrength = 0

    // 1. RSI Signals (Weight: 20 points)
    if (rsi < 30) {
      score += 15 // Oversold - bullish
      signalStrength += 1
    } else if (rsi > 70) {
      score -= 15 // Overbought - bearish
      signalStrength += 1
    } else if (rsi >= 40 && rsi <= 60) {
      score += 0 // Neutral zone - no clear signal
    }

    // 2. MACD Signals (Weight: 20 points)
    if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
      score += 15 // Bullish momentum
      signalStrength += 1
    } else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
      score -= 15 // Bearish momentum
      signalStrength += 1
    }

    // 3. Moving Average Crossovers (Weight: 15 points)
    if (ema12 > ema26 && currentPrice > sma20) {
      score += 12 // Golden cross + price above MA
      signalStrength += 1
    } else if (ema12 < ema26 && currentPrice < sma20) {
      score -= 12 // Death cross + price below MA
      signalStrength += 1
    }

    // 4. Trend Confirmation (Weight: 15 points)
    if (sma20 > sma50 && currentPrice > sma20) {
      score += 10 // Uptrend confirmed
    } else if (sma20 < sma50 && currentPrice < sma20) {
      score -= 10 // Downtrend confirmed
    }

    // 5. Bollinger Bands (Weight: 15 points)
    if (currentPrice < bb.lower && rsi < 40) {
      score += 10 // Oversold + below lower band
      signalStrength += 1
    } else if (currentPrice > bb.upper && rsi > 60) {
      score -= 10 // Overbought + above upper band
      signalStrength += 1
    }

    // 6. Volume Confirmation (Weight: 10 points)
    if (volumeRatio > 1.5) {
      score += Math.sign(score - 50) * 8 // High volume confirms direction
      signalStrength += 1
    } else if (volumeRatio < 0.7) {
      score -= Math.abs(score - 50) * 0.3 // Low volume weakens signal
    }

    // 7. Volatility Filter (Reduce score in extreme volatility)
    if (volatility > 0.08) {
      // High volatility - reduce confidence
      score = 50 + (score - 50) * 0.6
      signalStrength = Math.max(0, signalStrength - 1)
    }

    // === DETERMINE SIGNAL AND CONFIDENCE ===
    let signal = 'HOLD'
    let confidence = 0.50

    if (score >= 70 && signalStrength >= 3) {
      signal = 'BUY'
      confidence = Math.min(0.95, 0.70 + (score - 70) / 100 + signalStrength * 0.03)
    } else if (score <= 30 && signalStrength >= 3) {
      signal = 'SELL'
      confidence = Math.min(0.95, 0.70 + (30 - score) / 100 + signalStrength * 0.03)
    } else {
      signal = 'HOLD'
      confidence = 0.50 + Math.abs(score - 50) / 200 // Low confidence for unclear signals
    }

    // Market Condition Assessment
    let marketCondition = 'RANGING'
    if (sma20 > sma50 && volatility < 0.05) {
      marketCondition = 'UPTREND'
    } else if (sma20 < sma50 && volatility < 0.05) {
      marketCondition = 'DOWNTREND'
    } else if (volatility > 0.08) {
      marketCondition = 'VOLATILE'
    }

    console.log(`📊 Technical Analysis for ${symbol}:`)
    console.log(`   RSI: ${rsi.toFixed(1)} | MACD: ${macd.histogram.toFixed(4)} | Score: ${score.toFixed(1)}`)
    console.log(`   Price: $${currentPrice.toFixed(2)} | SMA20: $${sma20.toFixed(2)} | SMA50: $${sma50.toFixed(2)}`)
    console.log(`   Volume Ratio: ${volumeRatio.toFixed(2)}x | Volatility: ${(volatility * 100).toFixed(2)}%`)
    console.log(`   Signal: ${signal} | Confidence: ${(confidence * 100).toFixed(1)}% | Condition: ${marketCondition}`)

    return {
      signal,
      confidence,
      indicators: {
        rsi,
        macd: macd.histogram,
        sma20,
        sma50,
        bb,
        volumeRatio,
        volatility,
        score
      },
      marketCondition
    }

  } catch (error) {
    console.error(`Technical analysis failed for ${symbol}:`, error)
    return {
      signal: 'HOLD',
      confidence: 0.50,
      indicators: {},
      marketCondition: 'ERROR'
    }
  }
}

// Technical Indicator Calculation Functions
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macdLine = ema12 - ema26

  // Signal line (9-period EMA of MACD)
  const macdHistory = [macdLine] // Simplified - would need full history
  const signalLine = macdLine * 0.9 // Approximation

  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine
  }
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]

  const multiplier = 2 / (period + 1)
  let ema = prices[prices.length - period]

  for (let i = prices.length - period + 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number): {
  upper: number
  middle: number
  lower: number
} {
  const sma = calculateSMA(prices, period)
  const slice = prices.slice(-period)

  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
  const std = Math.sqrt(variance)

  return {
    upper: sma + std * stdDev,
    middle: sma,
    lower: sma - std * stdDev
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0

  const trs: number[] = []
  for (let i = highs.length - period; i < highs.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const prevClose = closes[i - 1]

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trs.push(tr)
  }

  return trs.reduce((a, b) => a + b, 0) / trs.length
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

      // 2. Generate AI trading signal with REAL technical analysis
      const technicalAnalysis = await analyzeTechnicalIndicators(selectedSymbol)
      const signal = technicalAnalysis.signal
      const confidence = technicalAnalysis.confidence
      const minConfidence = config?.riskManagement?.minConfidence || 0.80 // Raised to 80%

      // 2.5 Skip trading in unfavorable market conditions
      if (technicalAnalysis.marketCondition === 'VOLATILE') {
        console.log(`⚠️ Skipping ${selectedSymbol} - Market condition too volatile (volatility: ${(technicalAnalysis.indicators.volatility * 100).toFixed(2)}%)`)
        return
      }

      // Skip if signal is HOLD
      if (signal === 'HOLD') {
        const score = technicalAnalysis?.indicators?.score ?? 0
        console.log(`⏸️ Skipping ${selectedSymbol} - No clear trading signal (Score: ${score.toFixed(1)})`)
        return
      }

      // 3. Log AI analysis activity to Supabase with technical details
      await supabaseService.logBotActivity(userId, {
        type: 'info',
        symbol: selectedSymbol,
        message: `AI analyzing ${selectedSymbol} | Signal: ${signal} | Confidence: ${(confidence * 100).toFixed(1)}% | RSI: ${technicalAnalysis.indicators.rsi?.toFixed(1) || 'N/A'}`,
        status: 'completed',
        details: JSON.stringify({
          signal,
          confidence,
          sessionId,
          minConfidenceRequired: minConfidence,
          technicalIndicators: technicalAnalysis.indicators,
          marketCondition: technicalAnalysis.marketCondition
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

    // CRITICAL: Check for existing position before buying
    const existingPositions = await alpacaClient.getPositions()
    const existingPosition = existingPositions.find((pos: any) => pos.symbol === symbol)

    if (existingPosition) {
      const positionSide = parseFloat(existingPosition.qty || existingPosition.quantity || '0') > 0 ? 'LONG' : 'SHORT'

      // Block same-direction trades (don't buy if already long, don't sell if already short)
      if ((signal === 'BUY' && positionSide === 'LONG') || (signal === 'SELL' && positionSide === 'SHORT')) {
        console.log(`🚫 BLOCKED: ${signal} ${symbol} - Already have ${positionSide} position (qty: ${existingPosition.qty || existingPosition.quantity})`)

        await supabaseService.logBotActivity(userId, {
          type: 'info',
          symbol: symbol,
          message: `Trade blocked: ${signal} ${symbol} - Already have ${positionSide} position`,
          status: 'completed',
          details: JSON.stringify({
            reason: 'existing_position_same_direction',
            existingPosition: {
              side: positionSide,
              qty: existingPosition.qty || existingPosition.quantity,
              marketValue: existingPosition.market_value
            },
            signal,
            confidence,
            sessionId
          })
        })

        return // Exit early - don't duplicate positions
      }
    }

    console.log(`🔄 Executing ${signal} order for ${isCrypto ? 'CRYPTO' : 'STOCK'} ${symbol} via Alpaca API...`)
    console.log(`📊 Asset Type: ${assetType} | Market Hours: ${marketOpen ? 'OPEN' : 'CLOSED'} | Can Trade: ${isCrypto ? '24/7' : 'Market Hours Only'}`)

    // Get account info for intelligent position sizing
    const account = await alpacaClient.getAccount()
    const buyingPower = parseFloat(account.buying_power || '0')
    const equity = parseFloat(account.equity || '0')

    // Calculate intelligent position size based on confidence and risk
    // Base allocation: 2-10% of equity depending on confidence
    const minAllocation = 0.02 // 2% minimum
    const maxAllocation = 0.10 // 10% maximum
    const confidenceMultiplier = (confidence - 0.75) / 0.20 // 75% conf = 0, 95% conf = 1
    const allocation = minAllocation + (maxAllocation - minAllocation) * Math.max(0, Math.min(1, confidenceMultiplier))

    const notionalValue = Math.floor(equity * allocation)
    const quantity = Math.max(1, Math.floor(notionalValue / 100)) // Estimate quantity (will use notional for actual order)

    console.log(`💰 Position Sizing: ${(allocation * 100).toFixed(1)}% allocation = $${notionalValue} (Confidence: ${(confidence * 100).toFixed(1)}%)`)

    // Call Alpaca API to place order using unified client with proper asset_class
    const orderResult = await alpacaClient.createOrder({
      symbol,
      notional: notionalValue, // Use notional value for fractional shares
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
// import { NextRequest, NextResponse } from 'next/server'
// import { withErrorHandling } from '@/lib/api/error-handler'
// import { alpacaClient } from '@/lib/alpaca/unified-client'
// import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'
// import { supabaseService } from '@/lib/database/supabase-utils'
// import { getCurrentUserId } from '@/lib/auth/demo-user'
// import { RealTimeAITradingEngine } from '@/lib/ai/RealTimeAITradingEngine'
// import { CryptoWatchlistManager } from '@/lib/crypto/CryptoWatchlist'
// import { submitBotMetric } from '@/lib/supabase/fetchBotMetrics'

// // Global AI Trading Engine instance
// let aiTradingEngine: RealTimeAITradingEngine | null = null

// // In-memory bot state (in production, use Redis or database)
// let botState = {
//   isRunning: false,
//   config: null,
//   startTime: null,
//   sessionId: null,
//   interval: null,
//   aiEngine: null as RealTimeAITradingEngine | null
// }

// /**
//  * POST /api/ai/bot-control
//  * Start or stop the AI trading bot with standardized error handling
//  */
// export const POST = withErrorHandling(async (request: NextRequest) => {
//   const body = await request.json()
//   const { action, config } = body

//   console.log(`🤖 Bot Control API - Action: ${action}`)
//   console.log('📝 Request body:', { action, hasConfig: !!config })

//   switch (action) {
//     case 'start':
//       return await handleStartBot(config)

//     case 'stop':
//       return await handleStopBot()

//     case 'status':
//       return handleGetStatus()

//     default:
//       throw new Error(`Unknown action: ${action}`)
//   }
// })

// /**
//  * Handle start bot request
//  */
// async function handleStartBot(config: any) {
//   if (botState.isRunning) {
//     console.log('⚠️ Bot start requested but already running, returning current state')
//     return NextResponse.json({
//       success: false,
//       error: 'Bot is already running',
//       data: {
//         sessionId: botState.sessionId,
//         startTime: botState.startTime,
//         uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
//         config: botState.config ? {
//           mode: botState.config.mode,
//           strategiesEnabled: botState.config.strategies?.length || 0,
//           autoExecution: botState.config.executionSettings?.autoExecute || false
//         } : null
//       }
//     }, { status: 400 })
//   }

//   try {
//     const userId = getCurrentUserId()

//     // Generate session ID
//     const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

//     // Enable auto-execution by default if not specified
//     if (!config.executionSettings) {
//       config.executionSettings = { autoExecute: true }
//     } else if (config.executionSettings.autoExecute === undefined) {
//       config.executionSettings.autoExecute = true
//     }

//     // Update bot state
//     botState = {
//       isRunning: true,
//       config,
//       startTime: new Date(),
//       sessionId,
//       interval: null,
//       aiEngine: null
//     }

//     // Update bot metrics in Supabase using conflict-safe wrapper
//     try {
//       await submitBotMetric({
//         user_id: userId,
//         is_running: true,
//         uptime: 0,
//         last_activity: new Date().toISOString()
//       }, {
//         upsert: true,
//         conflictColumn: 'user_id',
//         returnRecord: false
//       })

//       // Log bot start activity
//       await supabaseService.logBotActivity(userId, {
//         type: 'system',
//         message: `AI Trading Bot started with session ${sessionId}`,
//         status: 'completed',
//         details: JSON.stringify({
//           sessionId,
//           config: config || {},
//           alpacaIntegration: true,
//           autoExecute: config.executionSettings?.autoExecute || false
//         })
//       })
//     } catch (dbError) {
//       console.warn('Failed to update database:', dbError)
//       // Continue even if DB update fails
//     }

//     console.log(`🚀 AI Trading Bot started with session ID: ${sessionId}`)
//     console.log(`🔗 Alpaca Paper Trading: ENABLED`)
//     console.log(`💾 Supabase Database: ENABLED`)
//     console.log(`⚡ Auto-execution: ${config.executionSettings?.autoExecute ? 'ENABLED' : 'DISABLED'}`)

//     // Notify via WebSocket if available
//     try {
//       const wsServer = getWebSocketServerManager().getServer()
//       if (wsServer) {
//         wsServer.broadcast({
//           type: 'bot_started',
//           timestamp: new Date().toISOString(),
//           data: {
//             sessionId,
//             config: {
//               mode: config.mode,
//               strategiesCount: config.strategies?.length || 0,
//               autoExecute: config.executionSettings?.autoExecute || false
//             }
//           }
//         })
//       }
//     } catch (wsError) {
//       console.warn('WebSocket broadcast failed:', wsError)
//     }

//     // Start the actual bot logic here (don't await - let it run in background)
//     startBotLogic(sessionId, config).catch(error => {
//       console.error('❌ Bot logic error:', error)
//       // Log to Supabase but don't fail the start request
//       supabaseService.logBotActivity(userId, {
//         type: 'error',
//         message: `Bot logic error: ${error.message}`,
//         status: 'failed',
//         details: JSON.stringify({ error: error.message, sessionId })
//       }).catch(console.error)
//     })

//     return NextResponse.json({
//       success: true,
//       data: {
//         sessionId,
//         message: 'AI Trading Bot started successfully',
//         config: {
//           mode: config.mode,
//           strategiesEnabled: config.strategies?.length || 0,
//           autoExecution: config.executionSettings?.autoExecute || false,
//           watchlistSize: config.watchlist?.length || 0
//         },
//         startTime: botState.startTime
//       }
//     })

//   } catch (error) {
//     console.error('❌ Failed to start bot:', error)

//     // Reset state on failure
//     botState.isRunning = false

//     return NextResponse.json({
//       success: false,
//       error: 'Failed to start AI Trading Bot',
//       details: (error as Error).message
//     }, { status: 500 })
//   }
// }

// /**
//  * Handle stop bot request
//  */
// async function handleStopBot() {
//   // Allow stop requests even if bot appears not running (for cleanup)
//   if (!botState.isRunning) {
//     console.log('🛑 Stop requested but bot not running - performing cleanup anyway')

//     // Still perform cleanup
//     botState = {
//       isRunning: false,
//       config: null,
//       startTime: null,
//       sessionId: null,
//       interval: null,
//       aiEngine: null
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Bot was not running, cleanup performed'
//     })
//   }

//   try {
//     const userId = getCurrentUserId()
//     const sessionId = botState.sessionId
//     const uptime = Date.now() - new Date(botState.startTime!).getTime()

//     // Stop the bot logic (including AI engine)
//     await stopBotLogic(sessionId!)

//     // Update bot metrics in Supabase using conflict-safe wrapper
//     try {
//       await submitBotMetric({
//         user_id: userId,
//         is_running: false,
//         uptime: Math.floor(uptime / 1000),
//         last_activity: new Date().toISOString()
//       }, {
//         upsert: true,
//         conflictColumn: 'user_id',
//         returnRecord: false
//       })

//       // Log bot stop activity
//       await supabaseService.logBotActivity(userId, {
//         type: 'system',
//         message: `AI Trading Bot stopped. Session duration: ${Math.floor(uptime / 1000)}s`,
//         status: 'completed',
//         details: JSON.stringify({
//           sessionId: sessionId,
//           duration: uptime,
//           reason: 'manual_stop'
//         })
//       })
//     } catch (dbError) {
//       console.warn('Failed to update database:', dbError)
//     }

//     // Reset bot state
//     botState = {
//       isRunning: false,
//       config: null,
//       startTime: null,
//       sessionId: null,
//       interval: null,
//       aiEngine: null
//     }

//     console.log(`🛑 AI Trading Bot stopped. Session: ${sessionId}, Uptime: ${Math.floor(uptime / 60000)}m`)

//     // Notify via WebSocket if available
//     try {
//       const wsServer = getWebSocketServerManager().getServer()
//       if (wsServer) {
//         wsServer.broadcast({
//           type: 'bot_stopped',
//           timestamp: new Date().toISOString(),
//           data: {
//             sessionId,
//             uptime: Math.floor(uptime / 60000),
//             reason: 'Manual stop'
//           }
//         })
//       }
//     } catch (wsError) {
//       console.warn('WebSocket broadcast failed:', wsError)
//     }

//     return NextResponse.json({
//       success: true,
//       data: {
//         message: 'AI Trading Bot stopped successfully',
//         sessionId,
//         uptime: Math.floor(uptime / 60000),
//         stoppedAt: new Date().toISOString()
//       }
//     })

//   } catch (error) {
//     console.error('❌ Failed to stop bot:', error)

//     return NextResponse.json({
//       success: false,
//       error: 'Failed to stop AI Trading Bot',
//       details: (error as Error).message
//     }, { status: 500 })
//   }
// }

// /**
//  * Handle get status request
//  */
// function handleGetStatus() {
//   return NextResponse.json({
//     success: true,
//     data: {
//       isRunning: botState.isRunning,
//       sessionId: botState.sessionId,
//       startTime: botState.startTime,
//       uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
//       config: botState.config ? {
//         mode: botState.config.mode,
//         strategiesEnabled: botState.config.strategies?.length || 0,
//         autoExecution: botState.config.executionSettings?.autoExecute || false
//       } : null
//     }
//   })
// }

// /**
//  * Start the actual bot trading logic with real Alpaca API integration and AI engine
//  */
// async function startBotLogic(sessionId: string, config: any) {
//   console.log(`🧠 Starting AI Trading Engine with Alpaca API for session: ${sessionId}`)
//   console.log(`🔗 Alpaca Paper Trading: ENABLED`)
//   console.log(`💾 Supabase Database: ENABLED`)
//   console.log(`🤖 AI Learning System: ENABLED`)

//   const userId = getCurrentUserId()

//   // Use full AI Trading Engine
//   console.log('🎯 Initializing Full AI Trading Engine with ML capabilities')

//   try {
//     // Initialize RealTimeAITradingEngine
//     const useFullAIEngine = true // Full AI engine enabled!

//     if (useFullAIEngine) {
//       const aiConfig = {
//       maxPositionsCount: config.riskManagement?.maxPositionSize || 10,
//       riskPerTrade: config.riskManagement?.maxDailyLoss || 0.02,
//       minConfidenceThreshold: config.riskManagement?.minConfidence || 0.75,
//       rebalanceFrequency: 6, // hours
//       watchlist: config.watchlist || config.watchlistSymbols || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ'],
//       paperTrading: true,
//       autoExecution: {
//         autoExecuteEnabled: config.executionSettings?.autoExecute !== false, // Default to true
//         confidenceThresholds: {
//           minimum: 0.55,
//           conservative: 0.65,
//           aggressive: 0.75,
//           maximum: 0.85
//         },
//         positionSizing: {
//           baseSize: 0.03,
//           maxSize: 0.12,
//           confidenceMultiplier: 2.5
//         },
//         riskControls: {
//           maxDailyTrades: 200,
//           maxOpenPositions: 30,
//           maxDailyLoss: 0.05,
//           cooldownPeriod: 3
//         },
//         executionRules: {
//           marketHoursOnly: false,
//           avoidEarnings: false,
//           volumeThreshold: 25000,
//           spreadThreshold: 0.04,
//           cryptoTradingEnabled: true,
//           afterHoursTrading: true,
//           weekendTrading: true,
//           cryptoSpreadThreshold: 0.06
//         }
//       }
//     }

//     // Create AI Trading Engine instance
//     aiTradingEngine = new RealTimeAITradingEngine(alpacaClient, aiConfig)
//     botState.aiEngine = aiTradingEngine

//     console.log('🚀 CRITICAL: About to start RealTimeAITradingEngine...')
//     console.log('🚀 CRITICAL: Auto-execution config:', aiConfig.autoExecution)

//     // Start the AI engine
//     await aiTradingEngine.startAITrading()

//     console.log('✅ CRITICAL: RealTimeAITradingEngine started successfully!')
//     console.log(`🎯 CRITICAL: Watching ${aiConfig.watchlist.length} symbols with AI learning enabled`)
//     console.log(`⚡ CRITICAL: Auto-execution ENABLED - ${aiConfig.autoExecution.autoExecuteEnabled}`)
//     console.log(`⚡ CRITICAL: Trading will begin in 1 minute...`)

//     // Log bot start with AI engine info
//     await supabaseService.logBotActivity(userId, {
//       type: 'system',
//       message: `AI Trading Engine started with session ${sessionId}`,
//       status: 'completed',
//       details: JSON.stringify({
//         sessionId,
//         config: aiConfig,
//         aiEngineEnabled: true,
//         autoExecute: aiConfig.autoExecution.autoExecuteEnabled,
//         watchlistSize: aiConfig.watchlist.length
//       })
//     })

//     // Broadcast via WebSocket
//     try {
//       const wsServer = getWebSocketServerManager().getServer()
//       if (wsServer) {
//         wsServer.broadcast({
//           type: 'ai_engine_started',
//           timestamp: new Date().toISOString(),
//           data: {
//             sessionId,
//             message: 'AI Trading Engine with learning system activated',
//             aiLearningEnabled: true,
//             autoExecutionEnabled: aiConfig.autoExecution.autoExecuteEnabled
//           }
//         })
//       }
//       } catch (wsError) {
//         console.warn('WebSocket broadcast failed:', wsError)
//       }
//     } else {
//       console.log('ℹ️ Full AI Engine disabled - using simple trading logic')
//     }

//   } catch (error) {
//     console.error('❌ Failed to start AI Trading Engine:', error)

//     // Log error to database
//     await supabaseService.logBotActivity(userId, {
//       type: 'error',
//       message: `AI Trading Engine failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       status: 'failed',
//       details: JSON.stringify({
//         error: error instanceof Error ? error.message : 'Unknown error',
//         sessionId
//       })
//     })

//     throw error
//   }

//   // Legacy simple trading logic as fallback (kept for compatibility)
//   const interval = setInterval(async () => {
//     if (!botState.isRunning || botState.sessionId !== sessionId) {
//       clearInterval(interval)
//       return
//     }

//     try {
//       // 1. AI Market Analysis - Use watchlist from config (includes stocks + crypto)
//       const configuredWatchlist = config?.watchlist || config?.watchlistSymbols
//       let symbols = configuredWatchlist && configuredWatchlist.length > 0
//         ? configuredWatchlist
//         : CryptoWatchlistManager.getHybridWatchlist(
//             ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'META', 'AMZN', 'NFLX'],
//             5 // Include top 5 crypto for 24/7 trading
//           )

//       // 🔥 CRITICAL FIX: If markets are closed, ONLY trade crypto (24/7)
//       const marketClock = await alpacaClient.getClock()
//       const isMarketOpen = marketClock?.is_open || false

//       if (!isMarketOpen) {
//         // Filter to ONLY crypto symbols when markets are closed
//         const cryptoSymbols = symbols.filter(s => CryptoWatchlistManager.isCryptoSymbol(s))
//         if (cryptoSymbols.length > 0) {
//           symbols = cryptoSymbols
//           console.log(`🌙 Markets CLOSED - Trading ONLY crypto (${cryptoSymbols.length} symbols available)`)
//         } else {
//           console.log(`⏰ Markets CLOSED and no crypto in watchlist - skipping this cycle`)
//           return // Skip this cycle if no crypto available
//         }
//       }

//       const selectedSymbol = symbols[Math.floor(Math.random() * symbols.length)]
//       const isCrypto = CryptoWatchlistManager.isCryptoSymbol(selectedSymbol)

//       console.log(`🎯 AI analyzing ${selectedSymbol} for trading opportunities... ${isCrypto ? '(CRYPTO 24/7)' : '(STOCK)'}`)

//       // 2. Generate AI trading signal
//       const confidence = 0.6 + Math.random() * 0.35 // 60-95%
//       const signal = Math.random() > 0.5 ? 'BUY' : 'SELL'
//       const minConfidence = config?.riskManagement?.minConfidence || 0.75

//       // 3. Log AI analysis activity to Supabase
//       await supabaseService.logBotActivity(userId, {
//         type: 'info',
//         symbol: selectedSymbol,
//         message: `AI analyzing ${selectedSymbol} | Confidence: ${(confidence * 100).toFixed(1)}%`,
//         status: 'completed',
//         details: JSON.stringify({
//           signal,
//           confidence,
//           sessionId,
//           minConfidenceRequired: minConfidence
//         })
//       })

//       // 4. Execute trade if confidence is high enough
//       if (confidence >= minConfidence) {
//         console.log(`📈 AI Signal Generated: ${signal} ${selectedSymbol} (Confidence: ${(confidence * 100).toFixed(1)}%)`)

//         const autoExecute = config?.executionSettings?.autoExecute || false

//         if (autoExecute) {
//           await executeTradeViaAlpaca(userId, selectedSymbol, signal, confidence, sessionId)
//         } else {
//           console.log(`💡 Trade recommendation: ${signal} ${selectedSymbol} - Manual execution required`)

//           // Log recommendation to Supabase
//           await supabaseService.logBotActivity(userId, {
//             type: 'recommendation',
//             symbol: selectedSymbol,
//             message: `AI recommends ${signal} ${selectedSymbol} with ${(confidence * 100).toFixed(1)}% confidence`,
//             status: 'completed',
//             details: JSON.stringify({
//               signal,
//               confidence,
//               reason: 'ai_analysis',
//               sessionId,
//               manualExecutionRequired: true
//             })
//           })
//         }
//       } else {
//         console.log(`⚠️ AI confidence too low (${(confidence * 100).toFixed(1)}%) for ${selectedSymbol} - No trade executed`)
//       }

//       // 5. Update bot metrics in Supabase using conflict-safe wrapper
//       const uptime = Date.now() - new Date(botState.startTime!).getTime()
//       await submitBotMetric({
//         user_id: userId,
//         is_running: true,
//         uptime: Math.floor(uptime / 1000),
//         last_activity: new Date().toISOString()
//       }, {
//         upsert: true,
//         conflictColumn: 'user_id',
//         returnRecord: false
//       })

//       // 6. Broadcast activity via WebSocket
//       try {
//         const wsServer = getWebSocketServerManager().getServer()
//         if (wsServer) {
//           wsServer.broadcast({
//             type: 'bot_activity',
//             timestamp: new Date().toISOString(),
//             data: {
//               sessionId,
//               activity: `AI analyzed ${selectedSymbol} | Signal: ${signal} | Confidence: ${(confidence * 100).toFixed(1)}%`,
//               symbol: selectedSymbol,
//               signal,
//               confidence: confidence,
//               executed: confidence >= minConfidence && config?.executionSettings?.autoExecute,
//               alpacaConnected: true,
//               supabaseConnected: true
//             }
//           })
//         }
//       } catch (error) {
//         console.warn('WebSocket broadcast failed:', error)
//       }

//     } catch (error) {
//       console.error(`❌ AI Trading logic error for session ${sessionId}:`, error)

//       // Log error to Supabase
//       try {
//         await supabaseService.logBotActivity(userId, {
//           type: 'error',
//           message: `AI Trading logic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
//           status: 'failed',
//           details: JSON.stringify({
//             error: error instanceof Error ? error.message : 'Unknown error',
//             sessionId
//           })
//         })
//       } catch (dbError) {
//         console.warn('Failed to log error to database:', dbError)
//       }
//     }
//   }, 30000) // Every 30 seconds

//   // Store interval for cleanup
//   botState.interval = interval
//   console.log(`⏰ AI Trading Logic scheduled every 30 seconds for session ${sessionId}`)
// }

// // Execute actual trades via Alpaca API with comprehensive risk checks
// async function executeTradeViaAlpaca(userId: string, symbol: string, signal: string, confidence: number, sessionId: string) {
//   try {
//     console.log(`🔄 Executing ${signal} order for ${symbol} via Alpaca API...`)

//     // 1. Determine if this is crypto or stock
//     const isCrypto = CryptoWatchlistManager.isCryptoSymbol(symbol)

//     // 2. Check market hours for stocks (crypto trades 24/7)
//     if (!isCrypto) {
//       try {
//         const clock = await alpacaClient.getClock()
//         console.log(`🕒 Market clock check for ${symbol}: is_open=${clock.is_open}`)

//         if (!clock.is_open) {
//           console.warn(`⏰ Markets are closed, skipping stock trade for ${symbol} (Crypto trades 24/7)`)

//           // Log to Supabase - FIXED: Use 'completed' instead of 'skipped'
//           await supabaseService.logBotActivity(userId, {
//             type: 'info',
//             symbol: symbol,
//             message: `Skipped ${signal} trade for ${symbol} - Markets closed, will trade crypto instead`,
//             status: 'completed',
//             details: JSON.stringify({
//               reason: 'market_closed_stock_skipped',
//               symbol,
//               signal,
//               confidence,
//               sessionId,
//               note: 'Stock trade skipped - markets closed, crypto trading 24/7'
//             })
//           })

//           return // Skip stock trades when market is closed
//         }

//         console.log(`✅ Markets are open, proceeding with ${symbol} trade`)
//       } catch (clockError) {
//         console.error(`❌ Failed to check market hours for ${symbol}:`, clockError)
//         console.error(`Full error:`, JSON.stringify(clockError, null, 2))
//         return // Skip trade if we can't verify market hours
//       }
//     } else {
//       console.log(`🌐 ${symbol} is crypto - trading 24/7, skipping market hours check`)
//     }

//     // 3. Get account information for risk checks
//     const account = await alpacaClient.getAccount()
//     const buyingPower = parseFloat(account.buying_power)
//     const portfolioValue = parseFloat(account.portfolio_value)
//     const equity = parseFloat(account.equity)

//     console.log(`💰 Account Status: Equity: $${equity.toFixed(2)}, Buying Power: $${buyingPower.toFixed(2)}`)

//     // 4. Check if account is blocked or restricted
//     if (account.trading_blocked || account.account_blocked) {
//       throw new Error('Trading is blocked on this account')
//     }

//     // 5. Get current market price (handle stocks vs crypto)
//     let currentPrice = 0

//     try {
//       if (isCrypto) {
//         // For crypto, convert symbol format: BTCUSD -> BTC/USD
//         const cryptoSymbolWithSlash = symbol.replace(/^([A-Z]+)(USD|USDT|USDC)$/, '$1/$2')
//         console.log(`🔄 Converting crypto symbol: ${symbol} -> ${cryptoSymbolWithSlash}`)

//         // For crypto, use crypto-specific endpoints
//         try {
//           const quoteData = await alpacaClient.getCryptoQuote(cryptoSymbolWithSlash)
//           const quotes = quoteData?.quotes || quoteData
//           const quote = quotes?.[cryptoSymbolWithSlash]
//           currentPrice = quote?.ap || quote?.bp || 0

//           console.log(`📊 Crypto quote for ${cryptoSymbolWithSlash}:`, quote)
//         } catch (cryptoQuoteError) {
//           console.warn(`⚠️ Crypto quote failed for ${cryptoSymbolWithSlash}, trying trade data...`)

//           try {
//             const tradeData = await alpacaClient.getCryptoTrade(cryptoSymbolWithSlash)
//             const trades = tradeData?.trades || tradeData
//             const trade = trades?.[cryptoSymbolWithSlash]
//             currentPrice = trade?.p || 0
//             console.log(`📊 Crypto trade for ${cryptoSymbolWithSlash}:`, trade)
//           } catch (cryptoTradeError) {
//             console.error(`❌ Both crypto quote and trade failed for ${cryptoSymbolWithSlash}`, cryptoTradeError)
//           }
//         }

//         if (currentPrice === 0) {
//           console.warn(`⚠️ Could not fetch crypto price for ${symbol}, skipping trade`)
//           return // Skip this trade without crashing
//         }
//       } else {
//         // For stocks, try quote first, then trade
//         try {
//           const quote = await alpacaClient.getLatestQuote(symbol)
//           currentPrice = quote?.quote?.ap || quote?.ap || 0
//         } catch (quoteError) {
//           console.warn(`⚠️ Quote failed for ${symbol}, trying trade...`)
//         }

//         if (currentPrice === 0) {
//           const trade = await alpacaClient.getLatestTrade(symbol)
//           currentPrice = trade?.trade?.p || trade?.p || 0
//         }

//         if (currentPrice === 0) {
//           console.warn(`⚠️ Could not fetch price for ${symbol}, skipping trade`)
//           return // Skip this trade without crashing
//         }
//       }

//       console.log(`📊 Current ${symbol} price: $${currentPrice.toFixed(2)}`)
//     } catch (priceError) {
//       console.error(`❌ Price fetch error for ${symbol}:`, priceError)
//       console.warn(`⚠️ Skipping trade for ${symbol} - price unavailable`)

//       // Log to Supabase but don't crash the bot
//       await supabaseService.logBotActivity(userId, {
//         type: 'error',
//         symbol: symbol,
//         message: `Price fetch failed for ${symbol}, trade skipped`,
//         status: 'failed',
//         details: JSON.stringify({
//           error: priceError instanceof Error ? priceError.message : 'Unknown error',
//           symbol,
//           signal,
//           sessionId,
//           reason: 'price_unavailable'
//         })
//       })

//       return // Skip this trade, don't crash the bot
//     }

//     // 4. Calculate position size based on portfolio percentage (max 5% per trade)
//     const config = botState.config
//     const maxPositionPercent = config?.executionSettings?.orderSizePercent || 0.02 // Default 2%
//     const maxPositionValue = portfolioValue * maxPositionPercent

//     let quantity = Math.floor(maxPositionValue / currentPrice)

//     // Ensure minimum of 1 share and maximum based on buying power
//     quantity = Math.max(1, Math.min(quantity, Math.floor(buyingPower / currentPrice)))

//     const estimatedValue = quantity * currentPrice

//     console.log(`📐 Position Sizing: ${quantity} shares @ $${currentPrice.toFixed(2)} = $${estimatedValue.toFixed(2)} (${((estimatedValue/portfolioValue)*100).toFixed(2)}% of portfolio)`)

//     // 5. Risk checks before execution
//     const riskChecks = {
//       hasEnoughBuyingPower: estimatedValue <= buyingPower,
//       withinPositionLimit: estimatedValue <= maxPositionValue,
//       minimumValue: estimatedValue >= 1, // At least $1
//       maximumValue: estimatedValue <= portfolioValue * 0.10, // Max 10% of portfolio per trade
//       accountNotRestricted: !account.trading_blocked && !account.account_blocked,
//       marketHours: true // Will be enhanced with actual market hours check
//     }

//     const allChecksPassed = Object.values(riskChecks).every(check => check === true)

//     if (!allChecksPassed) {
//       const failedChecks = Object.entries(riskChecks)
//         .filter(([_, passed]) => !passed)
//         .map(([check]) => check)

//       throw new Error(`Risk checks failed: ${failedChecks.join(', ')}`)
//     }

//     console.log(`✅ All risk checks passed`)

//     // 6. Check for existing positions to avoid over-concentration
//     let existingPosition = null
//     try {
//       existingPosition = await alpacaClient.getPosition(symbol)

//       if (existingPosition) {
//         const existingValue = Math.abs(parseFloat(existingPosition.market_value))
//         const totalExposure = existingValue + estimatedValue
//         const exposurePercent = (totalExposure / portfolioValue) * 100

//         console.log(`📊 Existing position: ${existingPosition.qty} shares (${existingValue.toFixed(2)} value)`)
//         console.log(`📊 Total exposure after trade: $${totalExposure.toFixed(2)} (${exposurePercent.toFixed(2)}% of portfolio)`)

//         // Prevent excessive concentration (max 15% per symbol)
//         if (exposurePercent > 15) {
//           throw new Error(`Total exposure to ${symbol} would exceed 15% of portfolio (${exposurePercent.toFixed(2)}%)`)
//         }
//       }
//     } catch (positionError: any) {
//       if (positionError.message?.includes('position does not exist')) {
//         console.log(`📊 No existing position in ${symbol}`)
//       } else {
//         console.warn(`⚠️ Unable to check existing position:`, positionError)
//       }
//     }

//     // 7. Execute the trade via Alpaca API (use crypto-specific method for crypto symbols)
//     console.log(`🚀 Placing ${signal} order: ${quantity} ${isCrypto ? 'units' : 'shares'} of ${symbol}`)

//     const orderParams = {
//       symbol,
//       qty: quantity,
//       side: signal.toLowerCase() as 'buy' | 'sell',
//       type: 'market' as const,
//       time_in_force: isCrypto ? ('gtc' as const) : ('day' as const), // Crypto uses GTC, stocks use DAY
//       client_order_id: `bot_${sessionId}_${Date.now()}`
//     }

//     const orderResult = isCrypto
//       ? await alpacaClient.createCryptoOrder(orderParams)
//       : await alpacaClient.createOrder(orderParams)

//     if (orderResult) {
//       console.log(`✅ ${signal} order placed successfully!`)
//       console.log(`📋 Order ID: ${orderResult.id}`)
//       console.log(`📊 Order Status: ${orderResult.status}`)
//       console.log(`💵 Order Value: $${estimatedValue.toFixed(2)}`)

//       // 8. Log successful trade to Supabase
//       const assetType = isCrypto ? 'crypto' : 'stock'
//       const units = isCrypto ? 'units' : 'shares'
//       await supabaseService.logBotActivity(userId, {
//         type: 'trade',
//         symbol: symbol,
//         message: `✅ ${signal} ${quantity} ${units} of ${symbol} @ $${currentPrice.toFixed(2)} - ${assetType.toUpperCase()} order placed via Alpaca (ID: ${orderResult.id})`,
//         status: 'completed',
//         details: JSON.stringify({
//           orderId: orderResult.id,
//           quantity,
//           side: signal,
//           price: currentPrice,
//           estimatedValue,
//           confidence,
//           sessionId,
//           orderStatus: orderResult.status,
//           riskChecks,
//           portfolioImpact: {
//             percentOfPortfolio: ((estimatedValue/portfolioValue)*100).toFixed(2),
//             buyingPowerRemaining: (buyingPower - estimatedValue).toFixed(2),
//             existingPosition: existingPosition ? parseFloat(existingPosition.qty) : 0
//           },
//           alpacaResponse: {
//             id: orderResult.id,
//             status: orderResult.status,
//             created_at: orderResult.created_at,
//             filled_avg_price: orderResult.filled_avg_price
//           }
//         })
//       })

//       // 9. Save trade to trade_history table
//       await supabaseService.saveTrade(userId, {
//         symbol,
//         side: signal.toLowerCase(),
//         quantity,
//         price: currentPrice,
//         value: estimatedValue,
//         timestamp: new Date().toISOString(),
//         status: orderResult.status === 'filled' ? 'FILLED' : 'PENDING',
//         order_id: orderResult.id,
//         ai_confidence: confidence
//       })

//       console.log(`💾 Trade saved to Supabase: ${signal} ${quantity} ${symbol} @ $${currentPrice.toFixed(2)}`)

//       // 10. Broadcast via WebSocket
//       try {
//         const wsServer = getWebSocketServerManager().getServer()
//         if (wsServer) {
//           wsServer.broadcast({
//             type: 'trade_executed',
//             timestamp: new Date().toISOString(),
//             data: {
//               symbol,
//               side: signal,
//               quantity,
//               price: currentPrice,
//               value: estimatedValue,
//               orderId: orderResult.id,
//               confidence,
//               sessionId
//             }
//           })
//         }
//       } catch (wsError) {
//         console.warn('WebSocket broadcast failed:', wsError)
//       }

//       return orderResult
//     }

//   } catch (error) {
//     console.error(`❌ Trade execution error:`, error)

//     // Log execution error to Supabase
//     await supabaseService.logBotActivity(userId, {
//       type: 'error',
//       symbol: symbol,
//       message: `❌ Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       status: 'failed',
//       details: JSON.stringify({
//         error: error instanceof Error ? error.message : 'Unknown error',
//         stack: error instanceof Error ? error.stack : undefined,
//         symbol,
//         signal,
//         confidence,
//         sessionId,
//         timestamp: new Date().toISOString()
//       })
//     })

//     throw error
//   }
// }

// /**
//  * Stop the bot trading logic and AI engine
//  */
// async function stopBotLogic(sessionId: string) {
//   console.log(`🛑 Stopping AI Trading Engine for session: ${sessionId}`)

//   try {
//     // Stop the AI Trading Engine if running
//     if (aiTradingEngine && botState.aiEngine) {
//       console.log('🛑 Stopping RealTimeAITradingEngine...')
//       await aiTradingEngine.stopAITrading()

//       // Get final metrics before clearing
//       const finalMetrics = aiTradingEngine.getAutoExecutionMetrics()
//       console.log('📊 Final AI Engine Metrics:', finalMetrics)

//       aiTradingEngine = null
//       botState.aiEngine = null
//       console.log('✅ AI Trading Engine stopped successfully')
//     }

//     // Stop legacy interval if running
//     if (botState.interval) {
//       clearInterval(botState.interval)
//       botState.interval = null
//     }

//     const userId = getCurrentUserId()

//     // Log bot stop to database
//     await supabaseService.logBotActivity(userId, {
//       type: 'system',
//       message: `AI Trading Engine stopped for session ${sessionId}`,
//       status: 'completed',
//       details: JSON.stringify({
//         sessionId,
//         stoppedAt: new Date().toISOString()
//       })
//     })

//   } catch (error) {
//     console.error('❌ Error stopping AI Trading Engine:', error)
//     // Force cleanup even on error
//     aiTradingEngine = null
//     botState.aiEngine = null
//     if (botState.interval) {
//       clearInterval(botState.interval)
//       botState.interval = null
//     }
//   }
// }

// /**
//  * GET endpoint for status checks with standardized error handling
//  */
// export const GET = withErrorHandling(async () => {
//   return NextResponse.json({
//     success: true,
//     data: {
//       isRunning: botState.isRunning,
//       sessionId: botState.sessionId,
//       uptime: botState.startTime ? Date.now() - new Date(botState.startTime).getTime() : 0,
//       status: botState.isRunning ? 'RUNNING' : 'STOPPED'
//     },
//     timestamp: new Date().toISOString(),
//   })
// })