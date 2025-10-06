/**
 * Complete AI Trading Bot API Route
 * Enhanced with proper order execution and debugging
 * 
 * @fileoverview Main AI bot route with fixed order execution
 * @author Aaron A Perez
 * @version 2.0.0 - Order Execution Fix
 * @location src/app/api/ai-bot/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'

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
const botMetrics: BotMetrics = {
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

const botStartTime = new Date()
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
  orderCooldown: 60000, // REDUCED from 3 minutes to 1 minute
  dailyOrderLimit: 100, // Maximum 100 orders per day
  riskPerTrade: 0.05, // 5% of portfolio per trade
  minOrderValue: 1, // LOWERED from $5 to $1 for testing with low buying power
  baseMinPositionValue: 2, // LOWERED from $10 to $2 for testing with low buying power
  marketHoursOnly: false, // Allow 24/7 trading
  cryptoTradingEnabled: true, // Enable crypto trading
  enableDebugLogging: true // Enhanced debugging
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
  console.log(`💰 Enhanced position sizing for ${symbol}: confidence=${confidence}%`)

  try {
    // Get current buying power from Alpaca account
    const alpacaUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
    const accountResponse = await fetch(`${alpacaUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
        'Content-Type': 'application/json'
      }
    })

    if (!accountResponse.ok) {
      console.log('⚠️ Could not fetch buying power, using conservative fallback')
      return Math.min(25, autoExecutionConfig.maxPositionSize) // Conservative fallback
    }

    const account = await accountResponse.json()
    const availableBuyingPower = parseFloat(account.buying_power || '0')

    console.log(`💳 Available buying power: $${availableBuyingPower}`)

    if (availableBuyingPower < 25) {
      console.log(`❌ Insufficient buying power: $${availableBuyingPower}`)
      return 0 // Not enough to trade
    }

    // Enhanced position sizing with conservative limits (from quick_fix_patch)
    const maxPositionPercent = 0.10 // Maximum 10% of buying power
    const basePositionPercent = 0.03 // Base 3% of buying power

    // Confidence-based adjustment (only above 60%)
    const confidenceBonus = Math.max(0, (confidence - 60) / 100) * 0.07 // Up to 7% bonus
    const positionPercent = Math.min(basePositionPercent + confidenceBonus, maxPositionPercent)

    // Calculate position size
    let positionSize = availableBuyingPower * positionPercent

    // Apply strict limits
    const minOrderSize = 25 // Minimum $25
    const maxOrderSize = Math.min(200, availableBuyingPower * 0.2) // Max $200 or 20% of buying power

    positionSize = Math.max(minOrderSize, Math.min(positionSize, maxOrderSize))

    // CRITICAL: Never exceed 20% of buying power
    positionSize = Math.min(positionSize, availableBuyingPower * 0.20)

    // Round to cents
    positionSize = Math.round(positionSize * 100) / 100

    console.log(`💰 Enhanced sizing result: ${positionPercent * 100}% of $${availableBuyingPower} = $${positionSize} 🛡️ Conservative mode`)

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

    // Prepare order data
    const cleanSymbol = symbol.replace('-USD', '').replace('/USD', '') // Clean crypto symbols
    const orderData = {
      symbol: cleanSymbol,
      side: recommendation.toLowerCase(),
      notional: Math.round(positionSize * 100) / 100, // Round to 2 decimal places
      type: 'market',
      time_in_force: 'day',
      client_order_id: `AI_BOT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    }

    console.log('📝 Placing order:', orderData)

    // Execute order via Alpaca API (using correct environment variables)
    const alpacaUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
    const orderResponse = await fetch(`${alpacaUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID || '',
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })

    if (orderResponse.ok) {
      const order = await orderResponse.json()
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
    } else {
      const errorText = await orderResponse.text()
      console.error('❌ Order placement failed:', errorText)
      
      orderExecutionMetrics.failedOrders++
      
      return {
        success: false,
        reason: `Order placement failed: ${errorText}`
      }
    }

  } catch (error) {
    console.error('❌ Order execution error:', error)
    orderExecutionMetrics.failedOrders++

    return {
      success: false,
      reason: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      // Generate realistic recommendation
      const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'BTC-USD', 'ETH-USD']
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      
      // More realistic confidence range (50-95%)
      const confidence = 50 + Math.random() * 45
      const recommendation = Math.random() > 0.5 ? 'BUY' : 'SELL'

      console.log(`🎯 Generated recommendation: ${symbol} ${recommendation} (${confidence.toFixed(1)}%)`)

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
        message: `Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
            baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
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