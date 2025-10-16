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
import { getTradingMode } from '@/lib/config/trading-mode'

// Lazy-load alpacaClient to avoid build-time initialization
function getAlpacaClient() {
  const { alpacaClient } = require('@/lib/alpaca/unified-client')
  return alpacaClient
}

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
  inverseMode: boolean // Track if inverse mode is enabled
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
  errorCount: 0,
  inverseMode: false
}

let botStartTime = new Date()
let isSimulatingActivity = false
let simulationInterval: NodeJS.Timeout | null = null

// ===============================================
// FIXED ORDER EXECUTION CONFIGURATION
// ===============================================

let orderExecutionEnabled = true

// ===============================================
// DYNAMIC POSITION LIMITS BASED ON ACCOUNT SIZE
// ===============================================
function getMaxPositionsForAccount(equity: number): number {
  if (equity < 500) return 8        // $100-500: 8 positions (increased from 3)
  if (equity < 1000) return 12      // $500-1K: 12 positions (increased from 5)
  if (equity < 2000) return 15      // $1K-2K: 15 positions (increased from 10)
  if (equity < 5000) return 20      // $2K-5K: 20 positions (increased from 15)
  if (equity < 10000) return 30     // $5K-10K: 30 positions (increased from 25)
  if (equity < 25000) return 40     // $10K-25K: 40 positions (increased from 35)
  return 60                         // $25K+: 60 positions max (increased from 50)
}

// ===============================================
// DYNAMIC DAILY ORDER LIMITS BASED ON ACCOUNT SIZE
// ===============================================
function getDailyOrderLimitForAccount(equity: number): number {
  if (equity < 500) return 50       // $100-500: 50 orders/day (conservative for small accounts)
  if (equity < 1000) return 75      // $500-1K: 75 orders/day
  if (equity < 2000) return 100     // $1K-2K: 100 orders/day
  if (equity < 5000) return 150     // $2K-5K: 150 orders/day
  if (equity < 10000) return 200    // $5K-10K: 200 orders/day
  if (equity < 25000) return 300    // $10K-25K: 300 orders/day
  return 500                        // $25K+: 500 orders/day max
}

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
  preventDuplicatePositions: false, // CHANGED: Allow portfolio rotation - sell losers, add to winners
  enablePortfolioRotation: true, // NEW: Enable intelligent position management
  takeProfitThreshold: 0.10, // NEW: Take profit at 10% gain
  stopLossThreshold: -0.05, // NEW: Stop loss at 5% loss
  maxOpenPositions: 10, // DEFAULT: 10 positions (dynamically adjusted by getMaxPositionsForAccount)
  rebalanceOnLowCash: true, // NEW: Sell positions when cash < 10% of equity
  useDynamicPositionLimits: true // NEW: Auto-adjust position limit based on account size
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
    // Detect crypto: symbols with / or ending with USD/USDT/USDC (BTC/USD, BTCUSD, AVAXUSD, etc.)
    const isCrypto = symbol.includes('/') || /(USD|USDT|USDC)$/i.test(symbol)

    // Get current buying power from Alpaca account using unified client
    const account = await getAlpacaClient().getAccount()

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

    if (availableFunds < 5) {
      console.log(`❌ Insufficient funds: $${availableFunds.toFixed(2)} (minimum $5 required)`)
      return 0 // Not enough to trade
    }

    // 🎯 DYNAMIC POSITION SIZING BASED ON AVAILABLE FUNDS
    let maxPositionPercent: number
    let basePositionPercent: number
    let minOrderSize: number

    if (availableFunds < 20) {
      // 🔴 CRITICAL LOW: < $20 - Ultra conservative (1 small trade max)
      maxPositionPercent = 0.50  // Max 50% (allows 2 positions minimum)
      basePositionPercent = 0.40 // Base 40%
      minOrderSize = 5           // $5 minimum
      console.log(`🔴 CRITICAL LOW buying power: $${availableFunds.toFixed(2)} - Ultra conservative sizing`)
    } else if (availableFunds < 50) {
      // 🟠 VERY LOW: $20-$50 - Very conservative (2-3 trades)
      maxPositionPercent = 0.35  // Max 35%
      basePositionPercent = 0.25 // Base 25%
      minOrderSize = 8           // $8 minimum
      console.log(`🟠 VERY LOW buying power: $${availableFunds.toFixed(2)} - Very conservative sizing`)
    } else if (availableFunds < 100) {
      // 🟡 LOW: $50-$100 - Conservative (3-5 trades)
      maxPositionPercent = 0.25  // Max 25%
      basePositionPercent = 0.15 // Base 15%
      minOrderSize = 10          // $10 minimum
      console.log(`🟡 LOW buying power: $${availableFunds.toFixed(2)} - Conservative sizing`)
    } else if (availableFunds < 200) {
      // 🟢 MODERATE: $100-$200 - Balanced (5-8 trades)
      maxPositionPercent = 0.15  // Max 15%
      basePositionPercent = 0.08 // Base 8%
      minOrderSize = 15          // $15 minimum
      console.log(`🟢 MODERATE buying power: $${availableFunds.toFixed(2)} - Balanced sizing`)
    } else {
      // 🔵 HEALTHY: > $200 - Normal diversification (8+ trades)
      maxPositionPercent = 0.12  // Max 12%
      basePositionPercent = 0.05 // Base 5%
      minOrderSize = 20          // $20 minimum
      console.log(`🔵 HEALTHY buying power: $${availableFunds.toFixed(2)} - Normal sizing`)
    }

    // Confidence-based adjustment (only above 60%)
    const confidenceBonus = Math.max(0, (confidence - 60) / 100) * (maxPositionPercent - basePositionPercent)
    const positionPercent = Math.min(basePositionPercent + confidenceBonus, maxPositionPercent)

    // Calculate position size
    let positionSize = availableFunds * positionPercent

    // Apply min/max constraints
    const maxOrderSize = Math.min(200, availableFunds * maxPositionPercent)
    positionSize = Math.max(minOrderSize, Math.min(positionSize, maxOrderSize))

    // SAFETY: Never exceed max percent (prevents over-leveraging)
    positionSize = Math.min(positionSize, availableFunds * maxPositionPercent)

    // Round to cents
    positionSize = Math.round(positionSize * 100) / 100

    console.log(`💰 Position sizing: ${(positionPercent * 100).toFixed(2)}% × $${availableFunds.toFixed(2)} = $${positionSize.toFixed(2)} (min: $${minOrderSize}, max: $${maxOrderSize.toFixed(2)})`)

    return positionSize

  } catch (error) {
    console.error('Error in position sizing:', error)
    return Math.min(25, autoExecutionConfig.maxPositionSize) // Conservative fallback
  }
}

// ===============================================
// PORTFOLIO MANAGEMENT FUNCTIONS
// ===============================================

/**
 * Check if we should sell existing positions to free up cash
 */
async function checkPortfolioRebalancing(): Promise<{ shouldRebalance: boolean; positionsToSell: string[] }> {
  try {
    const alpacaClient = getAlpacaClient()
    const account = await alpacaClient.getAccount()
    const positions = await alpacaClient.getPositions()

    const cash = parseFloat(account.cash || '0')
    const equity = parseFloat(account.equity || '0')
    const cashPercent = equity > 0 ? cash / equity : 0

    console.log(`💰 Portfolio Check: Cash=$${cash.toFixed(2)} (${(cashPercent * 100).toFixed(1)}% of $${equity.toFixed(2)} equity)`)

    const positionsToSell: string[] = []

    // Strategy 1: If cash < 10% of equity, sell losing positions
    if (autoExecutionConfig.rebalanceOnLowCash && cashPercent < 0.10) {
      console.log(`⚠️ Low cash alert: ${(cashPercent * 100).toFixed(1)}% < 10% threshold`)

      // Find losing positions to sell
      for (const pos of positions) {
        const unrealizedPL = parseFloat(pos.unrealized_pl || pos.unrealized_plpc || '0')
        const unrealizedPLPercent = parseFloat(pos.unrealized_plpc || '0')

        // Sell if loss exceeds stop-loss threshold
        if (unrealizedPLPercent < autoExecutionConfig.stopLossThreshold) {
          console.log(`🔴 Stop-loss triggered: ${pos.symbol} down ${(unrealizedPLPercent * 100).toFixed(2)}%`)
          positionsToSell.push(pos.symbol)
        }
      }
    }

    // Strategy 2: Take profit on winners
    for (const pos of positions) {
      const unrealizedPLPercent = parseFloat(pos.unrealized_plpc || '0')

      if (unrealizedPLPercent > autoExecutionConfig.takeProfitThreshold) {
        console.log(`🟢 Take-profit opportunity: ${pos.symbol} up ${(unrealizedPLPercent * 100).toFixed(2)}%`)
        positionsToSell.push(pos.symbol)
      }
    }

    // Strategy 3: Limit max open positions (dynamically adjusted by account size)
    const maxPositions = autoExecutionConfig.useDynamicPositionLimits
      ? getMaxPositionsForAccount(equity)
      : autoExecutionConfig.maxOpenPositions

    if (positions.length >= maxPositions) {
      console.log(`⚠️ Max positions reached: ${positions.length}/${maxPositions} (equity: $${equity.toFixed(2)})`)

      // Sell worst performing position to make room
      const worstPosition = positions.reduce((worst, current) => {
        const worstPL = parseFloat(worst.unrealized_plpc || '0')
        const currentPL = parseFloat(current.unrealized_plpc || '0')
        return currentPL < worstPL ? current : worst
      })

      if (!positionsToSell.includes(worstPosition.symbol)) {
        console.log(`📉 Selling worst performer: ${worstPosition.symbol} (P/L: ${(parseFloat(worstPosition.unrealized_plpc || '0') * 100).toFixed(2)}%)`)
        positionsToSell.push(worstPosition.symbol)
      }
    } else {
      console.log(`✅ Position capacity: ${positions.length}/${maxPositions} (room for ${maxPositions - positions.length} more)`)
    }

    return {
      shouldRebalance: positionsToSell.length > 0,
      positionsToSell: Array.from(new Set(positionsToSell)) // Remove duplicates
    }

  } catch (error) {
    console.error('❌ Portfolio rebalancing check failed:', error)
    return { shouldRebalance: false, positionsToSell: [] }
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

  // Check 3: Dynamic daily order limit based on account equity
  const today = new Date().toDateString()
  if (lastOrderResetDate !== today) {
    dailyOrderCount = 0
    lastOrderResetDate = today
    console.log('🔄 Daily order count reset')
  }

  // Get account equity for dynamic order limit
  const accountInfo = await getAlpacaClient().getAccount()
  const equity = parseFloat(accountInfo.equity || '0')
  const dynamicDailyOrderLimit = getDailyOrderLimitForAccount(equity)

  if (dailyOrderCount >= dynamicDailyOrderLimit) {
    console.log(`❌ Daily order limit reached: ${dailyOrderCount}/${dynamicDailyOrderLimit} (Equity: $${equity.toFixed(2)})`)
    return { success: false, reason: `Daily order limit reached (${dynamicDailyOrderLimit} orders/day for $${equity.toFixed(0)} account)` }
  }

  console.log(`📊 Daily orders: ${dailyOrderCount}/${dynamicDailyOrderLimit} (${((dailyOrderCount/dynamicDailyOrderLimit)*100).toFixed(1)}% used)`)

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
    // Detect crypto: symbols with / or ending with USD/USDT/USDC (with or without separator)
    // Examples: BTC/USD, BTCUSD, BTC-USD, AVAXUSD, AVAX/USD, ETH-USD, LINKUSD
    const isCrypto = symbol.includes('/') || /(USD|USDT|USDC)$/i.test(symbol)

    console.log(`🔍 Crypto check for ${symbol}: ${isCrypto ? 'CRYPTO' : 'STOCK'}`)

    // Block invalid crypto pairs (e.g., BTC/ETH, LINK/BTC - Alpaca doesn't support these)
    if (isCrypto) {
      // Accept symbols with separator (BTC/USD, BTC-USD) OR without separator (BTCUSD, LINKUSD)
      const validCryptoPairs = /([-/])?(USD|USDT|USDC)$/i
      if (!validCryptoPairs.test(symbol)) {
        console.log(`❌ Invalid crypto pair: ${symbol} - Alpaca only supports pairs with USD/USDT/USDC`)
        return {
          success: false,
          reason: `Invalid crypto pair: ${symbol}. Only USD, USDT, or USDC pairs are supported.`
        }
      }
      console.log(`✅ ${symbol} detected as CRYPTO - trades 24/7`)
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
      const positions = await getAlpacaClient().getPositions()
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
        // For BUY: Portfolio rotation logic
        if (existingPosition) {
          if (autoExecutionConfig.preventDuplicatePositions) {
            // Old behavior: block duplicate positions
            const currentValue = parseFloat(existingPosition.market_value || '0')
            console.log(`❌ Already own ${symbol} (current value: $${currentValue.toFixed(2)})`)
            console.log(`   Strategy: Diversify into other assets instead of averaging up`)
            return {
              success: false,
              reason: `Already own ${symbol}. Diversifying into other assets to reduce risk.`
            }
          } else {
            // New behavior: allow position rotation - check if we should add or replace
            const unrealizedPLPercent = parseFloat(existingPosition.unrealized_plpc || '0')
            console.log(`⚖️ Position rotation check: ${symbol} P/L=${(unrealizedPLPercent * 100).toFixed(2)}%`)

            // If existing position is losing significantly, don't add more
            if (unrealizedPLPercent < autoExecutionConfig.stopLossThreshold * 0.5) {
              console.log(`❌ Existing position losing badly - won't average down`)
              return {
                success: false,
                reason: `Existing position in ${symbol} losing ${(unrealizedPLPercent * 100).toFixed(2)}% - avoiding averaging down`
              }
            }

            console.log(`✅ Portfolio rotation: Adding to ${symbol} position (managed risk)`)
          }
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
      const positions = await getAlpacaClient().getPositions()
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
      const order = await getAlpacaClient().createOrder(orderData)
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

      // Alpaca returns generic 403 for insufficient funds
      if (orderError.statusCode === 403 || errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('access denied')) {
        errorMessage = 'Insufficient funds - not enough cash available to complete trade'
        console.log('💡 TIP: Sell some positions to free up cash, or wait for auto-rebalancing')
      } else if (errorMessage.includes('insufficient balance')) {
        errorMessage = 'Insufficient USD balance in crypto wallet. Transfer funds from stock account to crypto wallet in Alpaca dashboard.'
        console.log('💡 TIP: In Alpaca Paper Trading, you need to transfer USD from your stock account to crypto wallet.')
        console.log('💡 Go to: Alpaca Dashboard > Crypto Trading > Transfer Funds')
      }

      console.log(`❌ Order blocked: ${errorMessage}`)

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
      // STEP 1: Check portfolio rebalancing first (sell losers, take profits)
      if (autoExecutionConfig.enablePortfolioRotation) {
        const rebalanceCheck = await checkPortfolioRebalancing()

        if (rebalanceCheck.shouldRebalance) {
          console.log(`🔄 Portfolio rebalancing needed: ${rebalanceCheck.positionsToSell.length} positions to sell`)

          for (const symbolToSell of rebalanceCheck.positionsToSell) {
            try {
              const sellResult = await executeOrder(symbolToSell, 95, 'SELL') // High confidence for rebalancing
              if (sellResult.success) {
                console.log(`✅ Rebalancing: Sold ${symbolToSell}`)
              }
            } catch (error) {
              console.error(`❌ Failed to sell ${symbolToSell} during rebalancing:`, error)
            }
          }

          // Skip new buy signal if we just rebalanced
          return
        }
      }

      // STEP 2: Check if market is open
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
      // 🚀 EXPANDED TRADING UNIVERSE - More Opportunities
      const stockSymbols = [
        // Mega Cap Tech
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
        // Large Cap Growth
        'NFLX', 'AMD', 'INTC', 'CRM', 'ADBE', 'ORCL', 'NOW', 'SHOP', 'PLTR',
        // AI & Semiconductors
        'AI', 'SMCI', 'MU', 'QCOM', 'AVGO', 'MRVL', 'LRCX',
        // Financials & Payments
        'JPM', 'V', 'MA', 'PYPL', 'SQ', 'COIN',
        // EV & Clean Energy
        'RIVN', 'LCID', 'NIO', 'ENPH', 'FSLR',
        // Emerging Growth
        'SOFI', 'HOOD', 'UPST', 'DKNG', 'UBER', 'LYFT', 'ABNB',
        // Popular ETFs
        'SPY', 'QQQ', 'XLK', 'XLF', 'ARKK'
      ]

      const cryptoSymbols = [
        // Major Cryptos (Highest Volume)
        'BTC/USD', 'ETH/USD', 'BNB/USD', 'XRP/USD', 'SOL/USD', 'ADA/USD', 'DOGE/USD',
        // Layer 1 Blockchains (High Activity)
        'AVAX/USD', 'DOT/USD', 'MATIC/USD', 'ATOM/USD', 'NEAR/USD', 'ALGO/USD', 'FTM/USD',
        // DeFi Leaders
        'UNI/USD', 'LINK/USD', 'AAVE/USD', 'CRV/USD', 'MKR/USD', 'COMP/USD', 'SNX/USD',
        // New Layer 1s (High Volatility)
        'SUI/USD', 'APT/USD', 'SEI/USD', 'INJ/USD', 'TIA/USD', 'WLD/USD',
        // Gaming & NFT (High Volume)
        'SAND/USD', 'MANA/USD', 'AXS/USD', 'GALA/USD', 'ENJ/USD', 'APE/USD',
        // Meme Coins (High Volatility for Trading)
        'SHIB/USD', 'PEPE/USD', 'FLOKI/USD',
        // Traditional Alts (Stable Volume)
        'LTC/USD', 'BCH/USD', 'ETC/USD', 'XLM/USD', 'TRX/USD', 'VET/USD',
        // Layer 2 & Scaling
        'OP/USD', 'ARB/USD', 'LRC/USD'
      ]

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
        const positions = await getAlpacaClient().getPositions()
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

      // 🔄 INVERSE MODE: Flip BUY/SELL signals
      if (botMetrics.inverseMode && recommendation !== 'HOLD') {
        const originalRec = recommendation
        recommendation = recommendation === 'BUY' ? 'SELL' : 'BUY'
        console.log(`🔄 INVERSE MODE: Flipped ${originalRec} → ${recommendation} for ${symbol}`)
      }

      console.log(`🎯 Generated recommendation: ${symbol} ${recommendation} (${confidence.toFixed(1)}%)${botMetrics.inverseMode ? ' [INVERSE]' : ''}`)
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

      // Get dynamic order limit
      const accountInfo = await getAlpacaClient().getAccount()
      const equity = parseFloat(accountInfo.equity || '0')
      const dynamicDailyOrderLimit = getDailyOrderLimitForAccount(equity)

      return NextResponse.json({
        success: true,
        message: 'Order execution enabled - Bot will now execute real trades',
        orderExecutionStatus: {
          enabled: orderExecutionEnabled,
          config: autoExecutionConfig,
          metrics: orderExecutionMetrics,
          dailyOrderCount,
          dailyOrderLimit: dynamicDailyOrderLimit,
          accountEquity: equity
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
      // Get dynamic order limit
      const accountInfo = await getAlpacaClient().getAccount()
      const equity = parseFloat(accountInfo.equity || '0')
      const dynamicDailyOrderLimit = getDailyOrderLimitForAccount(equity)

      return NextResponse.json({
        success: true,
        orderExecutionStatus: {
          enabled: orderExecutionEnabled,
          config: autoExecutionConfig,
          metrics: orderExecutionMetrics,
          dailyOrderCount,
          dailyOrderLimit: dynamicDailyOrderLimit,
          accountEquity: equity,
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
    // Get dynamic order limit
    const accountInfo = await getAlpacaClient().getAccount()
    const equity = parseFloat(accountInfo.equity || '0')
    const dynamicDailyOrderLimit = getDailyOrderLimitForAccount(equity)

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
          dailyOrderLimit: dynamicDailyOrderLimit,
          accountEquity: equity,
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

    // Handle toggle inverse mode
    if (action === 'toggle-inverse') {
      botMetrics.inverseMode = !botMetrics.inverseMode
      console.log(`🔄 Inverse Mode ${botMetrics.inverseMode ? 'ENABLED' : 'DISABLED'} for AI Bot`)

      return NextResponse.json({
        success: true,
        message: `Inverse mode ${botMetrics.inverseMode ? 'enabled' : 'disabled'}`,
        inverseMode: botMetrics.inverseMode,
        timestamp: new Date().toISOString()
      })
    }

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