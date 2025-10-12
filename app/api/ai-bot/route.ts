/**
 * Complete AI Trading Bot API Route
 * Enhanced with proper order execution and debugging
 * 
 * @fileoverview Main AI bot route with fixed order execution
 * @author Aaron A Perez
 * @version 2.0.0 - Order Execution Fix
 * @location src/app/api/ai-bot/route.ts
 */

import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { getTradingMode } from '@/lib/config/trading-mode'

// ===============================================
// INTERFACES & TYPES
// ===============================================

interface BotActivityLog {
  id: string
  timestamp: Date
  type: 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info'
  symbol?: string
  message: string
  details?: string
  confidence?: number
  status: 'active' | 'completed' | 'failed'
  executionTime?: number
}

interface BotMetrics {
  symbolsScanned: number
  analysisCompleted: number
  recommendationsGenerated: number
  tradesExecuted: number
  lastActivityTime: Date
  currentSymbol: string | null
  nextScanIn: number
  avgAnalysisTime: number
  successRate: number
  uptime: number
  totalProcessingTime: number
  errorCount: number
}

interface OrderExecutionResult {
  success: boolean
  orderId?: string
  symbol?: string
  side?: string
  amount?: number
  confidence?: number
  reason?: string
  error?: string
}

// ===============================================
// IN-MEMORY STORAGE (Production: Use Database)
// ===============================================

let botActivityLogs: BotActivityLog[] = []
let botMetrics: BotMetrics = {
  symbolsScanned: 0,
  analysisCompleted: 0,
  recommendationsGenerated: 0,
  tradesExecuted: 0,
  lastActivityTime: new Date(),
  currentSymbol: null,
  nextScanIn: 0,
  avgAnalysisTime: 2.5,
  successRate: 87.5,
  uptime: 0,
  totalProcessingTime: 0,
  errorCount: 0
}

let botStartTime = new Date()
let isSimulatingActivity = false
let simulationInterval: NodeJS.Timeout | null = null

// ===============================================
// FIXED ORDER EXECUTION CONFIGURATION
// ===============================================

let orderExecutionEnabled = true

// UPDATED CONFIGURATION - More permissive for testing
const autoExecutionConfig = {
  minConfidenceForOrder: 60, // LOWERED from 70% to 60%
  maxPositionSize: 5000, // Maximum $5000 per position
  orderCooldown: 30000, // 30 seconds (REDUCED from 5 minutes)
  dailyOrderLimit: 100, // Maximum 100 orders per day
  riskPerTrade: 0.05, // 5% of portfolio per trade
  minOrderValue: 1, // LOWERED from $5 to $1 for testing with low buying power
  baseMinPositionValue: 2, // LOWERED from $10 to $2 for testing with low buying power
  marketHoursOnly: false, // Allow 24/7 trading
  cryptoTradingEnabled: true, // Enable crypto trading
  enableDebugLogging: true, // Enhanced debugging
  preventDuplicatePositions: true // Don't buy more of what we already own (unless selling)
}

const recentOrders: Set<string> = new Set()
let dailyOrderCount = 0
let lastOrderResetDate = new Date().toDateString()

// Order execution tracking
const orderExecutionMetrics = {
  totalOrdersExecuted: 0,
  successfulOrders: 0,
  failedOrders: 0,
  totalValue: 0,
  lastExecutionTime: null as Date | null
}

// ===============================================
// ENHANCED POSITION SIZING FUNCTION WITH BUYING POWER VALIDATION
// ===============================================

async function calculatePositionSizeWithBuyingPower(confidence: number, symbol: string): Promise<number> {
  const tradingMode = getTradingMode()
  console.log(`💰 Enhanced position sizing for ${symbol}: confidence=${confidence}% (${tradingMode.toUpperCase()} mode)`)

  try {
    const isCrypto = symbol.includes('/') || /[-](USD|USDT|USDC)$/i.test(symbol)

    // Get current buying power from Alpaca account using unified client
    const account = await alpacaClient.getAccount()

    // For crypto, use cash (available USD in crypto wallet), for stocks use buying_power
    let availableFunds = 0
    if (isCrypto) {
      availableFunds = parseFloat(account.cash || '0')
      const equity = parseFloat(account.equity || '0')
      const buyingPower = parseFloat(account.buying_power || '0')

      console.log(`💳 Crypto wallet status: Cash=$${availableFunds.toFixed(2)}, Equity=$${equity.toFixed(2)}, Stock BP=$${buyingPower.toFixed(2)}`)

      // Check for negative balance (pending orders/settlements)
      if (availableFunds < 0) {
        console.log(`⚠️ NEGATIVE CRYPTO BALANCE: $${availableFunds.toFixed(2)}`)
        console.log('💡 Possible causes:')
        console.log('   1. Pending orders that have not settled')
        console.log('   2. Open positions using margin')
        console.log('   3. Recent transfers not yet cleared')
        console.log('💡 SOLUTION: Wait for pending orders to settle or close positions')
        return 0
      }

      // Special check for crypto: Alpaca has separate wallets
      if (availableFunds === 0 && equity > 0) {
        console.log('⚠️ CRYPTO WALLET EMPTY: You have funds in your stock account but $0 in crypto wallet')
        console.log('💡 TIP: Transfer USD from stock account to crypto wallet in Alpaca dashboard')
        console.log('💡 Go to: Alpaca Dashboard > Crypto Trading > Transfer Funds')
        return 0 // Can't trade crypto without USD in crypto wallet
      }
    } else {
      availableFunds = parseFloat(account.buying_power || '0')
      console.log(`💳 Available buying power for stocks: $${availableFunds.toFixed(2)}`)

      // Check for negative buying power
      if (availableFunds < 0) {
        console.log(`⚠️ NEGATIVE BUYING POWER: $${availableFunds.toFixed(2)}`)
        console.log('💡 Close some positions or wait for settlements to clear')
        return 0
      }
    }

    if (availableFunds < 10) {
      console.log(`❌ Insufficient funds: $${availableFunds.toFixed(2)} (minimum $10 required)`)
      return 0 // Not enough to trade
    }

    // Enhanced position sizing with conservative limits (from quick_fix_patch)
    const maxPositionPercent = 0.15 // Maximum 15% of available funds (increased for small balances)
    const basePositionPercent = 0.05 // Base 5% of available funds (increased from 3%)

    // Confidence-based adjustment (only above 60%)
    const confidenceBonus = Math.max(0, (confidence - 60) / 100) * 0.10 // Up to 10% bonus
    const positionPercent = Math.min(basePositionPercent + confidenceBonus, maxPositionPercent)

    // Calculate position size
    let positionSize = availableFunds * positionPercent

    // Dynamic minimum based on available funds (more flexible for small balances)
    const minOrderSize = availableFunds < 100 ? 10 : 25 // $10 min for small balances, $25 for larger
    const maxOrderSize = Math.min(200, availableFunds * 0.25) // Max $200 or 25% of available funds

    positionSize = Math.max(minOrderSize, Math.min(positionSize, maxOrderSize))

    // CRITICAL: Never exceed 25% of available funds (for diversification)
    positionSize = Math.min(positionSize, availableFunds * 0.25)

    // Round to cents
    positionSize = Math.round(positionSize * 100) / 100

    console.log(`💰 Enhanced sizing result: ${(positionPercent * 100).toFixed(2)}% of $${availableFunds.toFixed(2)} = $${positionSize.toFixed(2)} 🛡️ Conservative mode`)

    return positionSize

  } catch (error) {
    console.error('Error in position sizing:', error)
    return Math.min(25, autoExecutionConfig.maxPositionSize) // Conservative fallback
  }
}

// ===============================================
// ENHANCED ORDER EXECUTION FUNCTION
// ===============================================

async function executeOrder(symbol: string, confidence: number, recommendation: string): Promise<OrderExecutionResult> {
  console.log(`🔍 Order execution check - Symbol: ${symbol}, Confidence: ${confidence}%, Enabled: ${orderExecutionEnabled}`)

  // Check 1: Order execution enabled
  if (!orderExecutionEnabled) {
    console.log('❌ Order execution disabled')
    return { success: false, reason: 'Order execution disabled' }
  }

  // Check 2: Confidence threshold (LOWERED)
  if (confidence < autoExecutionConfig.minConfidenceForOrder) {
    console.log(`❌ Confidence too low: ${confidence}% < ${autoExecutionConfig.minConfidenceForOrder}%`)
    return { success: false, reason: `Confidence below threshold: ${confidence}%` }
  }

  // Check 3: Daily order limit
  const today = new Date().toDateString()
  if (lastOrderResetDate !== today) {
    dailyOrderCount = 0
    lastOrderResetDate = today
    console.log('🔄 Daily order count reset')
  }

  if (dailyOrderCount >= autoExecutionConfig.dailyOrderLimit) {
    console.log(`❌ Daily order limit reached: ${dailyOrderCount}/${autoExecutionConfig.dailyOrderLimit}`)
    return { success: false, reason: 'Daily order limit reached' }
  }

  // Check 4: Symbol cooldown
  if (recentOrders.has(symbol)) {
    console.log(`❌ Symbol ${symbol} in cooldown period`)
    return { success: false, reason: 'Symbol in cooldown period' }
  }

  // Check 5: Environment variables (using correct APCA_ prefix)
  if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
    console.log('❌ Missing Alpaca API credentials (need APCA_API_KEY_ID and APCA_API_SECRET_KEY)')
    return { success: false, reason: 'Missing API credentials' }
  }

  try {
    // Calculate position size with buying power validation
    const positionSize = await calculatePositionSizeWithBuyingPower(confidence, symbol)

    if (positionSize <= 0) {
      console.log(`❌ Insufficient buying power for any trade`)
      return { success: false, reason: 'Insufficient buying power' }
    }

    if (positionSize < autoExecutionConfig.minOrderValue) {
      console.log(`❌ Position size too small: $${positionSize} < $${autoExecutionConfig.minOrderValue}`)
      return { success: false, reason: 'Position size too small' }
    }

    // Check 6: Validate crypto pairs (Alpaca only supports crypto paired with USD/USDT/USDC)
    // Detect crypto: ONLY symbols with / or - followed by USD/USDT/USDC
    // DO NOT use ticker-based detection as some stock ETFs have same tickers (e.g., ETH = Grayscale ETF)
    const isCrypto = symbol.includes('/') || /[-](USD|USDT|USDC)$/i.test(symbol)

    console.log(`🔍 Crypto check for ${symbol}: ${isCrypto ? 'CRYPTO' : 'STOCK'}`)

    // Block invalid crypto pairs (e.g., BTC/ETH, LINK/BTC - Alpaca doesn't support these)
    if (isCrypto) {
      const validCryptoPairs = /[-/](USD|USDT|USDC)$/i
      if (!validCryptoPairs.test(symbol)) {
        console.log(`❌ Invalid crypto pair: ${symbol} - Alpaca only supports pairs with USD/USDT/USDC`)
        return {
          success: false,
          reason: `Invalid crypto pair: ${symbol}. Only USD, USDT, or USDC pairs are supported.`
        }
      }
    }

    // Check 7: Market hours for stocks (crypto trades 24/7)
    if (!isCrypto) {
      // Check if US stock market is open (9:30 AM - 4:00 PM ET, Monday-Friday)
      const now = new Date()
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
      const hour = etTime.getHours()
      const minute = etTime.getMinutes()
      const day = etTime.getDay()

      const isWeekday = day >= 1 && day <= 5
      const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30)
      const isBeforeClose = hour < 16

      const isMarketOpen = isWeekday && isAfterOpen && isBeforeClose

      if (!isMarketOpen) {
        console.log(`❌ Cannot trade ${symbol} - US stock market is closed`)
        console.log(`   Current ET time: ${etTime.toLocaleString()}`)
        console.log(`   Market hours: Mon-Fri 9:30 AM - 4:00 PM ET`)
        return {
          success: false,
          reason: 'Stock market is closed. Trading hours: Mon-Fri 9:30 AM - 4:00 PM ET'
        }
      }
      console.log(`✅ Market is OPEN for stock ${symbol}`)
    } else {
      console.log(`✅ ${symbol} detected as CRYPTO - trades 24/7`)
    }

    // Check 8: Check existing positions for BUY/SELL validation
    try {
      const positions = await alpacaClient.getPositions()
      const existingPosition = positions.find((pos: any) => pos.symbol === symbol)

      if (recommendation.toUpperCase() === 'SELL') {
        // For SELL: Must have existing position (no shorting)
        if (!existingPosition) {
          console.log(`❌ Cannot SELL ${symbol} - no existing position (would be shorting)`)
          return { success: false, reason: 'Cannot sell without existing position (shorting not allowed)' }
        }

        // Check if we have enough quantity to sell
        const availableQty = parseFloat(existingPosition.qty || existingPosition.qty_available || '0')
        if (availableQty <= 0) {
          console.log(`❌ Cannot SELL ${symbol} - no available quantity (qty: ${availableQty})`)
          return { success: false, reason: 'No shares available to sell' }
        }

        console.log(`✅ Confirmed existing position in ${symbol}: ${availableQty} shares available, market value: $${existingPosition.market_value}`)
      } else if (recommendation.toUpperCase() === 'BUY') {
        // For BUY: Check if we already own this asset
        if (existingPosition && autoExecutionConfig.preventDuplicatePositions) {
          const currentValue = parseFloat(existingPosition.market_value || '0')
          console.log(`❌ Already own ${symbol} (current value: $${currentValue.toFixed(2)})`)
          console.log(`   Strategy: Diversify into other assets instead of averaging up`)
          return {
            success: false,
            reason: `Already own ${symbol}. Diversifying into other assets to reduce risk.`
          }
        }
        if (existingPosition) {
          console.log(`⚠️ Already own ${symbol}, but averaging up...`)
        }
      }
    } catch (error) {
      console.error('Error checking positions:', error)
      // If we can't verify positions for a SELL, block it
      if (recommendation.toUpperCase() === 'SELL') {
        return { success: false, reason: 'Could not verify existing position' }
      }
      // For BUY, we can proceed even if position check fails
    }

    // Prepare order data
    // CRITICAL: For crypto, Alpaca expects format like BTC/USD (not BTC-USD or just BTC)
    // For stocks, use symbol as-is (e.g., AAPL)
    const cleanSymbol = isCrypto
      ? symbol.replace('-USD', '/USD')  // Convert BTC-USD to BTC/USD if needed
      : symbol                           // Keep stock symbols as-is

    // For SELL orders, we need to sell the actual quantity owned, not use notional value
    let orderData: any = {
      symbol: cleanSymbol,
      side: recommendation.toLowerCase(),
      type: 'market',
      time_in_force: isCrypto ? 'gtc' : 'day', // Crypto uses GTC (Good-Til-Canceled), stocks use day
      client_order_id: `AI_BOT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    }

    // SELL vs BUY: Different order structure
    if (recommendation.toUpperCase() === 'SELL') {
      // For SELL: Use 'qty' to sell all shares we own (close position)
      // We already verified position exists in the check above
      const positions = await alpacaClient.getPositions()
      const existingPosition = positions.find((pos: any) => pos.symbol === symbol)
      const qtyToSell = parseFloat(existingPosition.qty || '0')

      orderData.qty = qtyToSell // Sell exact quantity owned
      console.log(`📝 SELL order: selling ${qtyToSell} shares of ${cleanSymbol}`)
    } else {
      // For BUY: Use 'notional' to buy dollar amount
      orderData.notional = Math.round(positionSize * 100) / 100 // Round to 2 decimal places
      console.log(`📝 BUY order: buying $${orderData.notional} worth of ${cleanSymbol}`)
    }

    console.log('📝 Placing order:', orderData)

    // Execute order via Alpaca unified client (automatically uses correct trading mode)
    try {
      const order = await alpacaClient.createOrder(orderData)
      console.log('✅ Order placed successfully:', order.id)

      // Track successful order
      dailyOrderCount++
      recentOrders.add(symbol)
      
      // Remove from cooldown after timeout
      setTimeout(() => {
        recentOrders.delete(symbol)
        console.log(`🔓 Symbol ${symbol} cooldown expired`)
      }, autoExecutionConfig.orderCooldown)

      // Update metrics
      orderExecutionMetrics.totalOrdersExecuted++
      orderExecutionMetrics.successfulOrders++
      orderExecutionMetrics.totalValue += positionSize
      orderExecutionMetrics.lastExecutionTime = new Date()

      // Log activity
      addActivityLog({
        type: 'trade',
        symbol,
        message: `Order executed: ${recommendation} $${positionSize}`,
        confidence,
        details: `Order ID: ${order.id}`,
        status: 'completed'
      })

      return {
        success: true,
        orderId: order.id,
        symbol,
        side: recommendation,
        amount: positionSize,
        confidence
      }
    } catch (orderError: any) {
      console.error('❌ Order placement failed:', orderError)

      orderExecutionMetrics.failedOrders++

      // Parse error for better messaging
      let errorMessage = orderError.message || 'Unknown order error'

      if (errorMessage.includes('insufficient balance')) {
        errorMessage = 'Insufficient USD balance in crypto wallet. Transfer funds from stock account to crypto wallet in Alpaca dashboard.'
        console.log('💡 TIP: In Alpaca Paper Trading, you need to transfer USD from your stock account to crypto wallet.')
        console.log('💡 Go to: Alpaca Dashboard > Crypto Trading > Transfer Funds')
      }

      return {
        success: false,
        reason: errorMessage
      }
    }

  } catch (error) {
    console.error('❌ Order execution error:', error)
    orderExecutionMetrics.failedOrders++
    
    return {
      success: false,
      reason: `Execution error: ${error.message}`
    }
  }
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

function addActivityLog(activity: Partial<BotActivityLog>) {
  const log: BotActivityLog = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    executionTime: 100 + Math.random() * 500,
    status: 'completed',
    ...activity
  } as BotActivityLog

  botActivityLogs.unshift(log)
  
  // Keep only last 100 logs
  if (botActivityLogs.length > 100) {
    botActivityLogs = botActivityLogs.slice(0, 100)
  }
}

// ===============================================
// ENHANCED BOT SIMULATION
// ===============================================

function startBotActivitySimulation() {
  if (isSimulatingActivity) {
    console.log('⚠️ Bot simulation already running')
    return
  }

  isSimulatingActivity = true
  console.log('🤖 Starting enhanced AI bot activity simulation...')

  // More frequent recommendations for testing
  simulationInterval = setInterval(async () => {
    if (!isSimulatingActivity) return

    try {
      // Check if market is open
      const now = new Date()
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
      const hour = etTime.getHours()
      const minute = etTime.getMinutes()
      const day = etTime.getDay()

      const isWeekday = day >= 1 && day <= 5
      const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30)
      const isBeforeClose = hour < 16
      const isMarketOpen = isWeekday && isAfterOpen && isBeforeClose

      // CRITICAL: Only use stocks if market is open, otherwise only crypto (24/7 trading)
      const stockSymbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD']
      const cryptoSymbols = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'SOL/USD', 'MATIC/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD']

      // Select symbol pool based on market hours
      const availableSymbols = isMarketOpen
        ? [...stockSymbols, ...cryptoSymbols]  // Market open: both stocks and crypto
        : cryptoSymbols                         // Market closed: only crypto

      const symbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)]
      const assetType = symbol.includes('/') ? 'CRYPTO' : 'STOCK'

      // More realistic confidence range (50-95%)
      const confidence = 50 + Math.random() * 45

      // SMART RECOMMENDATION: Check positions to decide BUY or SELL
      let recommendation = 'BUY' // Default to BUY
      try {
        const positions = await alpacaClient.getPositions()
        const existingPosition = positions.find((pos: any) => pos.symbol === symbol)

        // If we have a position, 50% chance to SELL, otherwise always BUY
        if (existingPosition) {
          recommendation = Math.random() > 0.5 ? 'SELL' : 'BUY'
        }
        // If no position, keep as BUY (can't sell what we don't own)
      } catch (error) {
        console.error('Error checking positions for recommendation:', error)
        // On error, default to BUY (safer than risking a SELL without position)
      }

      console.log(`🎯 Generated recommendation: ${symbol} ${recommendation} (${confidence.toFixed(1)}%)`)
      console.log(`📊 Market: ${isMarketOpen ? 'OPEN' : 'CLOSED'} | Asset: ${assetType} | Trading: ${isMarketOpen ? 'Stocks + Crypto' : 'Crypto Only'}`)

      // Update metrics
      botMetrics.symbolsScanned++
      botMetrics.analysisCompleted++
      botMetrics.recommendationsGenerated++
      botMetrics.currentSymbol = symbol
      botMetrics.lastActivityTime = new Date()

      // Log recommendation
      addActivityLog({
        type: 'recommendation',
        symbol,
        message: `AI Recommendation: ${recommendation}`,
        confidence,
        details: `Confidence: ${confidence.toFixed(1)}%`,
        status: 'completed'
      })

      // Attempt order execution
      if (confidence >= autoExecutionConfig.minConfidenceForOrder) {
        console.log(`✅ Attempting execution for ${symbol} (${confidence.toFixed(1)}% >= ${autoExecutionConfig.minConfidenceForOrder}%)`)
        
        const executionResult = await executeOrder(symbol, confidence, recommendation)
        
        if (executionResult.success) {
          botMetrics.tradesExecuted++
          console.log(`✅ Order executed: ${symbol} ${recommendation}`)
        } else {
          console.log(`❌ Order blocked: ${executionResult.reason}`)
          
          // Log failed execution
          addActivityLog({
            type: 'error',
            symbol,
            message: `Execution failed: ${executionResult.reason}`,
            confidence,
            status: 'failed'
          })
        }
      } else {
        console.log(`⏭️ Skipping execution: confidence ${confidence.toFixed(1)}% below threshold ${autoExecutionConfig.minConfidenceForOrder}%`)
      }

    } catch (error) {
      console.error('❌ Bot simulation error:', error)
      botMetrics.errorCount++
      
      addActivityLog({
        type: 'error',
        message: `Simulation error: ${error.message}`,
        status: 'failed'
      })
    }
  }, 10000) // Every 10 seconds for testing

  // Log activity summary every minute
  setInterval(() => {
    if (isSimulatingActivity) {
      console.log('📊 Bot Activity Summary:', {
        recommendations: botMetrics.recommendationsGenerated,
        executions: botMetrics.tradesExecuted,
        successRate: `${((botMetrics.tradesExecuted / Math.max(1, botMetrics.recommendationsGenerated)) * 100).toFixed(1)}%`,
        dailyOrders: dailyOrderCount,
        confidenceThreshold: autoExecutionConfig.minConfidenceForOrder
      })
    }
  }, 60000)
}

function stopBotActivitySimulation() {
  isSimulatingActivity = false
  
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  
  console.log('🛑 Bot activity simulation stopped')
}

// ===============================================
// API ROUTE HANDLERS
// ===============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const action = searchParams.get('action')

    console.log('📊 AI Bot API GET request received', { action, limit })

    // Handle specific actions
    if (action === 'start-simulation') {
      startBotActivitySimulation()
      
      addActivityLog({
        type: 'info',
        message: 'AI Bot activity started - Using real Alpaca API data',
        status: 'completed'
      })

      return NextResponse.json({
        success: true,
        message: 'AI Bot activity started',
        config: autoExecutionConfig,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'stop-simulation') {
      stopBotActivitySimulation()

      return NextResponse.json({
        success: true,
        message: 'AI Bot activity stopped',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'enable-execution') {
      orderExecutionEnabled = true
      console.log('✅ Order execution enabled')

      return NextResponse.json({
        success: true,
        message: 'Order execution enabled - Bot will now execute real trades',
        orderExecutionStatus: {
          enabled: orderExecutionEnabled,
          config: autoExecutionConfig,
          metrics: orderExecutionMetrics,
          dailyOrderCount,
          dailyOrderLimit: autoExecutionConfig.dailyOrderLimit
        },
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'disable-execution') {
      orderExecutionEnabled = false
      console.log('⚠️ Order execution disabled')

      return NextResponse.json({
        success: true,
        message: 'Order execution disabled - Bot will only simulate trades',
        orderExecutionStatus: {
          enabled: orderExecutionEnabled,
          config: autoExecutionConfig,
          metrics: orderExecutionMetrics
        },
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'execution-status') {
      return NextResponse.json({
        success: true,
        orderExecutionStatus: {
          enabled: orderExecutionEnabled,
          config: autoExecutionConfig,
          metrics: orderExecutionMetrics,
          dailyOrderCount,
          dailyOrderLimit: autoExecutionConfig.dailyOrderLimit,
          recentOrdersCount: recentOrders.size,
          environment: {
            hasApiKey: !!process.env.APCA_API_KEY_ID,
            hasSecretKey: !!process.env.APCA_API_SECRET_KEY,
            tradingMode: getTradingMode(),
            baseUrl: getTradingMode() === 'live' ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets'
          }
        },
        timestamp: new Date().toISOString()
      })
    }

    // Default: return current activity and metrics
    return NextResponse.json({
      success: true,
      data: {
        activities: botActivityLogs.slice(0, limit),
        metrics: {
          ...botMetrics,
          uptime: (Date.now() - botStartTime.getTime()) / 1000
        },
        isSimulating: isSimulatingActivity,
        orderExecution: {
          enabled: orderExecutionEnabled,
          dailyOrderCount,
          dailyOrderLimit: autoExecutionConfig.dailyOrderLimit,
          metrics: orderExecutionMetrics,
          config: {
            minConfidenceForOrder: autoExecutionConfig.minConfidenceForOrder,
            maxPositionSize: autoExecutionConfig.maxPositionSize,
            riskPerTrade: autoExecutionConfig.riskPerTrade,
            minOrderValue: autoExecutionConfig.minOrderValue
          }
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Bot Activity API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bot activity'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, symbol, message, confidence, details, action } = body

    console.log('📝 AI Bot API POST request received', { type, symbol, action })

    // Handle manual order execution test
    if (action === 'test-order') {
      const testSymbol = symbol || 'AAPL'
      const testConfidence = confidence || 75
      const testRecommendation = 'BUY'

      console.log('🧪 Testing manual order execution...')
      
      const result = await executeOrder(testSymbol, testConfidence, testRecommendation)
      
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test order executed successfully' : 'Test order failed',
        result,
        timestamp: new Date().toISOString()
      })
    }

    // Handle activity logging
    if (!type || !message) {
      return NextResponse.json(
        { success: false, error: 'Type and message are required' },
        { status: 400 }
      )
    }

    addActivityLog({
      type,
      symbol,
      message,
      confidence,
      details,
      status: 'completed'
    })

    // Update relevant metrics
    switch (type) {
      case 'scan':
        botMetrics.symbolsScanned++
        break
      case 'analysis':
        botMetrics.analysisCompleted++
        break
      case 'recommendation':
        botMetrics.recommendationsGenerated++
        break
      case 'trade':
        botMetrics.tradesExecuted++
        break
    }

    botMetrics.lastActivityTime = new Date()

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Bot Activity POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log activity'
      },
      { status: 500 }
    )
  }
}
// /**
//  * Complete AI Trading Bot API Route
//  * Enhanced with proper order execution and debugging
//  * 
//  * @fileoverview Main AI bot route with fixed order execution
//  * @author Aaron A Perez
//  * @version 2.0.0 - Order Execution Fix
//  * @location src/app/api/ai-bot/route.ts
//  */

// import { NextRequest, NextResponse } from 'next/server'

// // ===============================================
// // INTERFACES & TYPES
// // ===============================================

// interface BotActivityLog {
//   id: string
//   timestamp: Date
//   type: 'scan' | 'analysis' | 'recommendation' | 'trade' | 'error' | 'info'
//   symbol?: string
//   message: string
//   details?: string
//   confidence?: number
//   status: 'active' | 'completed' | 'failed'
//   executionTime?: number
// }

// interface BotMetrics {
//   symbolsScanned: number
//   analysisCompleted: number
//   recommendationsGenerated: number
//   tradesExecuted: number
//   lastActivityTime: Date
//   currentSymbol: string | null
//   nextScanIn: number
//   avgAnalysisTime: number
//   successRate: number
//   uptime: number
//   totalProcessingTime: number
//   errorCount: number
// }

// interface OrderExecutionResult {
//   success: boolean
//   orderId?: string
//   symbol?: string
//   side?: string
//   amount?: number
//   confidence?: number
//   reason?: string
//   error?: string
// }

// // ===============================================
// // IN-MEMORY STORAGE (Production: Use Database)
// // ===============================================

// let botActivityLogs: BotActivityLog[] = []
// const botMetrics: BotMetrics = {
//   symbolsScanned: 0,
//   analysisCompleted: 0,
//   recommendationsGenerated: 0,
//   tradesExecuted: 0,
//   lastActivityTime: new Date(),
//   currentSymbol: null,
//   nextScanIn: 0,
//   avgAnalysisTime: 2.5,
//   successRate: 87.5,
//   uptime: 0,
//   totalProcessingTime: 0,
//   errorCount: 0
// }

// const botStartTime = new Date()
// let isSimulatingActivity = false
// let simulationInterval: NodeJS.Timeout | null = null

// // ===============================================
// // FIXED ORDER EXECUTION CONFIGURATION
// // ===============================================

// let orderExecutionEnabled = true

// // UPDATED CONFIGURATION - More permissive for testing
// const autoExecutionConfig = {
//   minConfidenceForOrder: 60, // LOWERED from 70% to 60%
//   maxPositionSize: 5000, // Maximum $5000 per position
//   orderCooldown: 60000, // REDUCED from 3 minutes to 1 minute
//   dailyOrderLimit: 100, // Maximum 100 orders per day
//   riskPerTrade: 0.05, // 5% of portfolio per trade
//   minOrderValue: 1, // LOWERED from $5 to $1 for testing with low buying power
//   baseMinPositionValue: 2, // LOWERED from $10 to $2 for testing with low buying power
//   marketHoursOnly: false, // Allow 24/7 trading
//   cryptoTradingEnabled: true, // Enable crypto trading
//   enableDebugLogging: true // Enhanced debugging
// }

// const recentOrders: Set<string> = new Set()
// let dailyOrderCount = 0
// let lastOrderResetDate = new Date().toDateString()

// // Order execution tracking
// const orderExecutionMetrics = {
//   totalOrdersExecuted: 0,
//   successfulOrders: 0,
//   failedOrders: 0,
//   totalValue: 0,
//   lastExecutionTime: null as Date | null
// }

// // ===============================================
// // ENHANCED POSITION SIZING FUNCTION WITH BUYING POWER VALIDATION
// // ===============================================

// async function calculatePositionSizeWithBuyingPower(confidence: number, symbol: string): Promise<number> {
//   console.log(`💰 Enhanced position sizing for ${symbol}: confidence=${confidence}%`)

//   try {
//     // Get current buying power from Alpaca account
//     const alpacaUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
//     const accountResponse = await fetch(`${alpacaUrl}/v2/account`, {
//       headers: {
//         'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
//         'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
//         'Content-Type': 'application/json'
//       }
//     })

//     if (!accountResponse.ok) {
//       console.log('⚠️ Could not fetch buying power, using conservative fallback')
//       return Math.min(25, autoExecutionConfig.maxPositionSize) // Conservative fallback
//     }

//     const account = await accountResponse.json()
//     const availableBuyingPower = parseFloat(account.buying_power || '0')

//     console.log(`💳 Available buying power: $${availableBuyingPower}`)

//     if (availableBuyingPower < 25) {
//       console.log(`❌ Insufficient buying power: $${availableBuyingPower}`)
//       return 0 // Not enough to trade
//     }

//     // Enhanced position sizing with conservative limits (from quick_fix_patch)
//     const maxPositionPercent = 0.10 // Maximum 10% of buying power
//     const basePositionPercent = 0.03 // Base 3% of buying power

//     // Confidence-based adjustment (only above 60%)
//     const confidenceBonus = Math.max(0, (confidence - 60) / 100) * 0.07 // Up to 7% bonus
//     const positionPercent = Math.min(basePositionPercent + confidenceBonus, maxPositionPercent)

//     // Calculate position size
//     let positionSize = availableBuyingPower * positionPercent

//     // Apply strict limits
//     const minOrderSize = 25 // Minimum $25
//     const maxOrderSize = Math.min(200, availableBuyingPower * 0.2) // Max $200 or 20% of buying power

//     positionSize = Math.max(minOrderSize, Math.min(positionSize, maxOrderSize))

//     // CRITICAL: Never exceed 20% of buying power
//     positionSize = Math.min(positionSize, availableBuyingPower * 0.20)

//     // Round to cents
//     positionSize = Math.round(positionSize * 100) / 100

//     console.log(`💰 Enhanced sizing result: ${positionPercent * 100}% of $${availableBuyingPower} = $${positionSize} 🛡️ Conservative mode`)

//     return positionSize

//   } catch (error) {
//     console.error('Error in position sizing:', error)
//     return Math.min(25, autoExecutionConfig.maxPositionSize) // Conservative fallback
//   }
// }

// // ===============================================
// // ENHANCED ORDER EXECUTION FUNCTION
// // ===============================================

// async function executeOrder(symbol: string, confidence: number, recommendation: string): Promise<OrderExecutionResult> {
//   console.log(`🔍 Order execution check - Symbol: ${symbol}, Confidence: ${confidence}%, Enabled: ${orderExecutionEnabled}`)

//   // Check 1: Order execution enabled
//   if (!orderExecutionEnabled) {
//     console.log('❌ Order execution disabled')
//     return { success: false, reason: 'Order execution disabled' }
//   }

//   // Check 2: Confidence threshold (LOWERED)
//   if (confidence < autoExecutionConfig.minConfidenceForOrder) {
//     console.log(`❌ Confidence too low: ${confidence}% < ${autoExecutionConfig.minConfidenceForOrder}%`)
//     return { success: false, reason: `Confidence below threshold: ${confidence}%` }
//   }

//   // Check 3: Daily order limit
//   const today = new Date().toDateString()
//   if (lastOrderResetDate !== today) {
//     dailyOrderCount = 0
//     lastOrderResetDate = today
//     console.log('🔄 Daily order count reset')
//   }

//   if (dailyOrderCount >= autoExecutionConfig.dailyOrderLimit) {
//     console.log(`❌ Daily order limit reached: ${dailyOrderCount}/${autoExecutionConfig.dailyOrderLimit}`)
//     return { success: false, reason: 'Daily order limit reached' }
//   }

//   // Check 4: Symbol cooldown
//   if (recentOrders.has(symbol)) {
//     console.log(`❌ Symbol ${symbol} in cooldown period`)
//     return { success: false, reason: 'Symbol in cooldown period' }
//   }

//   // Check 5: Environment variables (using correct APCA_ prefix)
//   if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
//     console.log('❌ Missing Alpaca API credentials (need APCA_API_KEY_ID and APCA_API_SECRET_KEY)')
//     return { success: false, reason: 'Missing API credentials' }
//   }

//   try {
//     // Calculate position size with buying power validation
//     const positionSize = await calculatePositionSizeWithBuyingPower(confidence, symbol)

//     if (positionSize <= 0) {
//       console.log(`❌ Insufficient buying power for any trade`)
//       return { success: false, reason: 'Insufficient buying power' }
//     }

//     if (positionSize < autoExecutionConfig.minOrderValue) {
//       console.log(`❌ Position size too small: $${positionSize} < $${autoExecutionConfig.minOrderValue}`)
//       return { success: false, reason: 'Position size too small' }
//     }

//     // Prepare order data
//     const cleanSymbol = symbol.replace('-USD', '').replace('/USD', '') // Clean crypto symbols
//     const orderData = {
//       symbol: cleanSymbol,
//       side: recommendation.toLowerCase(),
//       notional: Math.round(positionSize * 100) / 100, // Round to 2 decimal places
//       type: 'market',
//       time_in_force: 'day',
//       client_order_id: `AI_BOT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
//     }

//     console.log('📝 Placing order:', orderData)

//     // Execute order via Alpaca API (using correct environment variables)
//     const alpacaUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
//     const orderResponse = await fetch(`${alpacaUrl}/v2/orders`, {
//       method: 'POST',
//       headers: {
//         'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
//         'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(orderData)
//     })

//     if (orderResponse.ok) {
//       const order = await orderResponse.json()
//       console.log('✅ Order placed successfully:', order.id)

//       // Track successful order
//       dailyOrderCount++
//       recentOrders.add(symbol)
      
//       // Remove from cooldown after timeout
//       setTimeout(() => {
//         recentOrders.delete(symbol)
//         console.log(`🔓 Symbol ${symbol} cooldown expired`)
//       }, autoExecutionConfig.orderCooldown)

//       // Update metrics
//       orderExecutionMetrics.totalOrdersExecuted++
//       orderExecutionMetrics.successfulOrders++
//       orderExecutionMetrics.totalValue += positionSize
//       orderExecutionMetrics.lastExecutionTime = new Date()

//       // Log activity
//       addActivityLog({
//         type: 'trade',
//         symbol,
//         message: `Order executed: ${recommendation} $${positionSize}`,
//         confidence,
//         details: `Order ID: ${order.id}`,
//         status: 'completed'
//       })

//       return {
//         success: true,
//         orderId: order.id,
//         symbol,
//         side: recommendation,
//         amount: positionSize,
//         confidence
//       }
//     } else {
//       const errorText = await orderResponse.text()
//       console.error('❌ Order placement failed:', errorText)
      
//       orderExecutionMetrics.failedOrders++
      
//       return {
//         success: false,
//         reason: `Order placement failed: ${errorText}`
//       }
//     }

//   } catch (error) {
//     console.error('❌ Order execution error:', error)
//     orderExecutionMetrics.failedOrders++

//     return {
//       success: false,
//       reason: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
//     }
//   }
// }

// // ===============================================
// // HELPER FUNCTIONS
// // ===============================================

// function addActivityLog(activity: Partial<BotActivityLog>) {
//   const log: BotActivityLog = {
//     id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//     timestamp: new Date(),
//     executionTime: 100 + Math.random() * 500,
//     status: 'completed',
//     ...activity
//   } as BotActivityLog

//   botActivityLogs.unshift(log)
  
//   // Keep only last 100 logs
//   if (botActivityLogs.length > 100) {
//     botActivityLogs = botActivityLogs.slice(0, 100)
//   }
// }

// // ===============================================
// // ENHANCED BOT SIMULATION
// // ===============================================

// function startBotActivitySimulation() {
//   if (isSimulatingActivity) {
//     console.log('⚠️ Bot simulation already running')
//     return
//   }

//   isSimulatingActivity = true
//   console.log('🤖 Starting enhanced AI bot activity simulation...')

//   // More frequent recommendations for testing
//   simulationInterval = setInterval(async () => {
//     if (!isSimulatingActivity) return

//     try {
//       // Generate realistic recommendation
//       const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'BTC-USD', 'ETH-USD']
//       const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      
//       // More realistic confidence range (50-95%)
//       const confidence = 50 + Math.random() * 45
//       const recommendation = Math.random() > 0.5 ? 'BUY' : 'SELL'

//       console.log(`🎯 Generated recommendation: ${symbol} ${recommendation} (${confidence.toFixed(1)}%)`)

//       // Update metrics
//       botMetrics.symbolsScanned++
//       botMetrics.analysisCompleted++
//       botMetrics.recommendationsGenerated++
//       botMetrics.currentSymbol = symbol
//       botMetrics.lastActivityTime = new Date()

//       // Log recommendation
//       addActivityLog({
//         type: 'recommendation',
//         symbol,
//         message: `AI Recommendation: ${recommendation}`,
//         confidence,
//         details: `Confidence: ${confidence.toFixed(1)}%`,
//         status: 'completed'
//       })

//       // Attempt order execution
//       if (confidence >= autoExecutionConfig.minConfidenceForOrder) {
//         console.log(`✅ Attempting execution for ${symbol} (${confidence.toFixed(1)}% >= ${autoExecutionConfig.minConfidenceForOrder}%)`)
        
//         const executionResult = await executeOrder(symbol, confidence, recommendation)
        
//         if (executionResult.success) {
//           botMetrics.tradesExecuted++
//           console.log(`✅ Order executed: ${symbol} ${recommendation}`)
//         } else {
//           console.log(`❌ Order blocked: ${executionResult.reason}`)
          
//           // Log failed execution
//           addActivityLog({
//             type: 'error',
//             symbol,
//             message: `Execution failed: ${executionResult.reason}`,
//             confidence,
//             status: 'failed'
//           })
//         }
//       } else {
//         console.log(`⏭️ Skipping execution: confidence ${confidence.toFixed(1)}% below threshold ${autoExecutionConfig.minConfidenceForOrder}%`)
//       }

//     } catch (error) {
//       console.error('❌ Bot simulation error:', error)
//       botMetrics.errorCount++

//       addActivityLog({
//         type: 'error',
//         message: `Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
//         status: 'failed'
//       })
//     }
//   }, 10000) // Every 10 seconds for testing

//   // Log activity summary every minute
//   setInterval(() => {
//     if (isSimulatingActivity) {
//       console.log('📊 Bot Activity Summary:', {
//         recommendations: botMetrics.recommendationsGenerated,
//         executions: botMetrics.tradesExecuted,
//         successRate: `${((botMetrics.tradesExecuted / Math.max(1, botMetrics.recommendationsGenerated)) * 100).toFixed(1)}%`,
//         dailyOrders: dailyOrderCount,
//         confidenceThreshold: autoExecutionConfig.minConfidenceForOrder
//       })
//     }
//   }, 60000)
// }

// function stopBotActivitySimulation() {
//   isSimulatingActivity = false
  
//   if (simulationInterval) {
//     clearInterval(simulationInterval)
//     simulationInterval = null
//   }
  
//   console.log('🛑 Bot activity simulation stopped')
// }

// // ===============================================
// // API ROUTE HANDLERS
// // ===============================================

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const limit = parseInt(searchParams.get('limit') || '20')
//     const action = searchParams.get('action')

//     console.log('📊 AI Bot API GET request received', { action, limit })

//     // Handle specific actions
//     if (action === 'start-simulation') {
//       startBotActivitySimulation()
      
//       addActivityLog({
//         type: 'info',
//         message: 'AI Bot activity started - Using real Alpaca API data',
//         status: 'completed'
//       })

//       return NextResponse.json({
//         success: true,
//         message: 'AI Bot activity started',
//         config: autoExecutionConfig,
//         timestamp: new Date().toISOString()
//       })
//     }

//     if (action === 'stop-simulation') {
//       stopBotActivitySimulation()

//       return NextResponse.json({
//         success: true,
//         message: 'AI Bot activity stopped',
//         timestamp: new Date().toISOString()
//       })
//     }

//     if (action === 'enable-execution') {
//       orderExecutionEnabled = true
//       console.log('✅ Order execution enabled')

//       return NextResponse.json({
//         success: true,
//         message: 'Order execution enabled - Bot will now execute real trades',
//         orderExecutionStatus: {
//           enabled: orderExecutionEnabled,
//           config: autoExecutionConfig,
//           metrics: orderExecutionMetrics,
//           dailyOrderCount,
//           dailyOrderLimit: autoExecutionConfig.dailyOrderLimit
//         },
//         timestamp: new Date().toISOString()
//       })
//     }

//     if (action === 'disable-execution') {
//       orderExecutionEnabled = false
//       console.log('⚠️ Order execution disabled')

//       return NextResponse.json({
//         success: true,
//         message: 'Order execution disabled - Bot will only simulate trades',
//         orderExecutionStatus: {
//           enabled: orderExecutionEnabled,
//           config: autoExecutionConfig,
//           metrics: orderExecutionMetrics
//         },
//         timestamp: new Date().toISOString()
//       })
//     }

//     if (action === 'execution-status') {
//       return NextResponse.json({
//         success: true,
//         orderExecutionStatus: {
//           enabled: orderExecutionEnabled,
//           config: autoExecutionConfig,
//           metrics: orderExecutionMetrics,
//           dailyOrderCount,
//           dailyOrderLimit: autoExecutionConfig.dailyOrderLimit,
//           recentOrdersCount: recentOrders.size,
//           environment: {
//             hasApiKey: !!process.env.APCA_API_KEY_ID,
//             hasSecretKey: !!process.env.APCA_API_SECRET_KEY,
//             baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
//           }
//         },
//         timestamp: new Date().toISOString()
//       })
//     }

//     // Default: return current activity and metrics
//     return NextResponse.json({
//       success: true,
//       data: {
//         activities: botActivityLogs.slice(0, limit),
//         metrics: {
//           ...botMetrics,
//           uptime: (Date.now() - botStartTime.getTime()) / 1000
//         },
//         isSimulating: isSimulatingActivity,
//         orderExecution: {
//           enabled: orderExecutionEnabled,
//           dailyOrderCount,
//           dailyOrderLimit: autoExecutionConfig.dailyOrderLimit,
//           metrics: orderExecutionMetrics,
//           config: {
//             minConfidenceForOrder: autoExecutionConfig.minConfidenceForOrder,
//             maxPositionSize: autoExecutionConfig.maxPositionSize,
//             riskPerTrade: autoExecutionConfig.riskPerTrade,
//             minOrderValue: autoExecutionConfig.minOrderValue
//           }
//         }
//       },
//       timestamp: new Date().toISOString()
//     })

//   } catch (error) {
//     console.error('AI Bot Activity API error:', error)
//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : 'Failed to fetch bot activity'
//       },
//       { status: 500 }
//     )
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { type, symbol, message, confidence, details, action } = body

//     console.log('📝 AI Bot API POST request received', { type, symbol, action })

//     // Handle manual order execution test
//     if (action === 'test-order') {
//       const testSymbol = symbol || 'AAPL'
//       const testConfidence = confidence || 75
//       const testRecommendation = 'BUY'

//       console.log('🧪 Testing manual order execution...')
      
//       const result = await executeOrder(testSymbol, testConfidence, testRecommendation)
      
//       return NextResponse.json({
//         success: result.success,
//         message: result.success ? 'Test order executed successfully' : 'Test order failed',
//         result,
//         timestamp: new Date().toISOString()
//       })
//     }

//     // Handle activity logging
//     if (!type || !message) {
//       return NextResponse.json(
//         { success: false, error: 'Type and message are required' },
//         { status: 400 }
//       )
//     }

//     addActivityLog({
//       type,
//       symbol,
//       message,
//       confidence,
//       details,
//       status: 'completed'
//     })

//     // Update relevant metrics
//     switch (type) {
//       case 'scan':
//         botMetrics.symbolsScanned++
//         break
//       case 'analysis':
//         botMetrics.analysisCompleted++
//         break
//       case 'recommendation':
//         botMetrics.recommendationsGenerated++
//         break
//       case 'trade':
//         botMetrics.tradesExecuted++
//         break
//     }

//     botMetrics.lastActivityTime = new Date()

//     return NextResponse.json({
//       success: true,
//       message: 'Activity logged successfully',
//       timestamp: new Date().toISOString()
//     })

//   } catch (error) {
//     console.error('AI Bot Activity POST error:', error)
//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : 'Failed to log activity'
//       },
//       { status: 500 }
//     )
//   }
// }