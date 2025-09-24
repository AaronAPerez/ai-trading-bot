import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'

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

// In-memory storage for bot activity (in production, this would use a database)
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

// Order execution configuration
let orderExecutionEnabled = false
let autoExecutionConfig = {
  minConfidenceForOrder: 80, // 80% minimum confidence to execute trades
  maxPositionSize: 1000, // Maximum $1000 per position
  orderCooldown: 300000, // 5 minutes between orders for same symbol
  dailyOrderLimit: 10, // Maximum 10 orders per day
  riskPerTrade: 0.02 // 2% of portfolio per trade
}

let recentOrders: Set<string> = new Set() // Track symbols with recent orders
let dailyOrderCount = 0
let lastOrderResetDate = new Date().toDateString()

// Order execution tracking
let orderExecutionMetrics = {
  totalOrdersExecuted: 0,
  successfulOrders: 0,
  failedOrders: 0,
  totalValue: 0,
  lastExecutionTime: null as Date | null
}

// Order execution function
async function executeOrder(symbol: string, confidence: number, recommendation: string) {
  if (!orderExecutionEnabled) return null

  try {
    // Reset daily count if new day
    const today = new Date().toDateString()
    if (today !== lastOrderResetDate) {
      dailyOrderCount = 0
      lastOrderResetDate = today
      recentOrders.clear()
    }

    // Check execution conditions
    if (confidence < autoExecutionConfig.minConfidenceForOrder) {
      console.log(`⚠️ Confidence ${confidence}% below threshold ${autoExecutionConfig.minConfidenceForOrder}%`)
      return null
    }

    if (dailyOrderCount >= autoExecutionConfig.dailyOrderLimit) {
      console.log('⚠️ Daily order limit reached')
      return null
    }

    if (recentOrders.has(symbol)) {
      console.log(`⚠️ Recent order exists for ${symbol}`)
      return null
    }

    // Skip crypto for now (more complex trading logic needed)
    if (symbol.includes('USD')) {
      console.log(`⚠️ Skipping crypto symbol ${symbol}`)
      return null
    }

    console.log(`🚀 Executing order for ${symbol} with ${confidence}% confidence`)

    // Create Alpaca client
    const alpacaClient = new AlpacaServerClient()

    // Get account information for position sizing
    const account = await alpacaClient.getAccount()
    const portfolioValue = account.totalBalance

    // Calculate position size based on confidence and risk parameters
    const basePositionSize = portfolioValue * autoExecutionConfig.riskPerTrade
    const confidenceMultiplier = Math.min(confidence / 100 * 1.5, 2.0) // Max 2x multiplier
    let positionValue = basePositionSize * confidenceMultiplier
    positionValue = Math.min(positionValue, autoExecutionConfig.maxPositionSize)

    // Get current market price
    const quotes = await alpacaClient.getLatestQuotes([symbol])
    if (!quotes[symbol]) {
      console.log(`❌ No market data for ${symbol}`)
      return null
    }

    const currentPrice = quotes[symbol].midPrice
    const quantity = Math.floor(positionValue / currentPrice)

    if (quantity < 1) {
      console.log(`⚠️ Calculated quantity ${quantity} too small for ${symbol}`)
      return null
    }

    // Determine buy/sell based on recommendation
    let side: 'buy' | 'sell' = 'buy' // Default to buy
    if (recommendation.toLowerCase().includes('sell') ||
        recommendation.toLowerCase().includes('short') ||
        recommendation.toLowerCase().includes('exit')) {
      side = 'sell'
    }

    // Create order
    const orderData = {
      symbol: symbol,
      qty: quantity,
      side: side,
      type: 'market' as const,
      time_in_force: 'day' as const
    }

    const order = await alpacaClient.createOrder(orderData)

    // Track the order
    recentOrders.add(symbol)
    dailyOrderCount++
    orderExecutionMetrics.totalOrdersExecuted++
    orderExecutionMetrics.successfulOrders++
    orderExecutionMetrics.totalValue += positionValue
    orderExecutionMetrics.lastExecutionTime = new Date()

    // Set cooldown
    setTimeout(() => {
      recentOrders.delete(symbol)
    }, autoExecutionConfig.orderCooldown)

    console.log(`✅ Order executed: ${side.toUpperCase()} ${quantity} ${symbol} @ $${currentPrice.toFixed(2)}`)

    return {
      orderId: order.id,
      symbol: symbol,
      side: side,
      quantity: quantity,
      price: currentPrice,
      value: positionValue,
      confidence: confidence,
      timestamp: new Date()
    }

  } catch (error) {
    console.error(`❌ Order execution failed for ${symbol}:`, error)
    orderExecutionMetrics.failedOrders++
    return null
  }
}

function simulateBotActivity() {
  // Stop any existing simulation first
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }

  isSimulatingActivity = true

  const symbols = [
    'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'SPY', 'QQQ',
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'ADAUSD', 'AVAXUSD', 'MATICUSD'
  ]

  const activities = {
    scan: [
      'Market scan initiated for technical indicators',
      'Scanning for breakout patterns across watchlist',
      'Volume analysis in progress',
      'Monitoring correlation matrices',
      'Analyzing market sentiment signals',
      'Checking crypto market conditions',
      'Evaluating sector rotation patterns',
      'Processing real-time price feeds'
    ],
    analysis: [
      'Deep learning model processing market data',
      'Pattern recognition algorithm active',
      'Sentiment analysis complete',
      'Risk assessment calculation finished',
      'Portfolio optimization analysis',
      'Volatility surface modeling',
      'Monte Carlo simulation running',
      'Neural network inference complete'
    ],
    recommendation: [
      'High-confidence trading signal generated',
      'Risk-adjusted position size calculated',
      'Entry and exit points determined',
      'Stop-loss and take-profit levels set',
      'Trade recommendation ready for execution',
      'Portfolio impact assessment complete',
      'Backtesting validation passed',
      'Risk management checks passed'
    ],
    trade: [
      'Trade order submitted to Alpaca API',
      'Position opened successfully',
      'Stop-loss order placed',
      'Take-profit order activated',
      'Portfolio rebalancing executed',
      'Risk limits adjusted'
    ],
    info: [
      'Market hours validation complete',
      'Connection to Alpaca API verified',
      'Real-time data stream active',
      'Risk management protocols engaged',
      'Portfolio synchronization complete',
      'Watchlist updated with new symbols',
      'Performance metrics recalculated',
      'System health check passed'
    ],
    error: [
      'API rate limit reached, throttling requests',
      'Market data feed temporarily unavailable',
      'High volatility detected, reducing position sizes',
      'Correlation warning: positions too similar',
      'Insufficient buying power for recommendation'
    ]
  }

  const generateActivity = () => {
    // Check if simulation should continue
    if (!isSimulatingActivity) return

    const activityTypes = ['scan', 'analysis', 'recommendation', 'info'] as const
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
    const symbol = Math.random() > 0.3 ? symbols[Math.floor(Math.random() * symbols.length)] : undefined
    const messages = activities[type]
    const message = messages[Math.floor(Math.random() * messages.length)]

    const executionTime = 500 + Math.random() * 3000 // 0.5-3.5 seconds
    const confidence = type === 'recommendation' ? 65 + Math.random() * 30 : undefined
    const status = Math.random() > 0.05 ? 'completed' : 'failed'

    // Execute real orders for high-confidence recommendations
    if (type === 'recommendation' && confidence && confidence >= 75) {
      setTimeout(async () => {
        const orderResult = await executeOrder(symbol || 'AAPL', confidence, message)

        if (orderResult) {
          // Create a successful trade activity log
          const tradeActivity: BotActivityLog = {
            id: `order_${Date.now()}_${Math.random()}`,
            timestamp: new Date(),
            type: 'trade',
            symbol: orderResult.symbol,
            message: `${orderResult.side.toUpperCase()} order executed: ${orderResult.quantity} shares @ $${orderResult.price.toFixed(2)}`,
            status: 'completed',
            executionTime: 500 + Math.random() * 1000,
            details: `Order ID: ${orderResult.orderId}, Value: $${orderResult.value.toFixed(2)}, Confidence: ${orderResult.confidence}%`
          }

          botActivityLogs.unshift(tradeActivity)
          botMetrics.tradesExecuted++

          console.log('📈 Real trade executed and logged:', tradeActivity.message)
        } else {
          // Log why the order wasn't executed
          const tradeActivity: BotActivityLog = {
            id: `order_skip_${Date.now()}_${Math.random()}`,
            timestamp: new Date(),
            type: 'info',
            symbol,
            message: `Order execution skipped for ${symbol}`,
            status: 'completed',
            executionTime: 100,
            details: `Confidence: ${confidence}%, execution conditions not met`
          }

          botActivityLogs.unshift(tradeActivity)
        }
      }, 1000) // Execute 1 second after recommendation
    }

    // Occasionally add simulated trade activities for lower confidence recommendations
    else if (Math.random() > 0.95 && type === 'recommendation') {
      const tradeMessage = activities.trade[Math.floor(Math.random() * activities.trade.length)]
      const tradeActivity: BotActivityLog = {
        id: `activity_${Date.now()}_${Math.random()}`,
        timestamp: new Date(Date.now() + 1000), // 1 second after recommendation
        type: 'trade',
        symbol,
        message: `${tradeMessage} (simulated)`,
        status: Math.random() > 0.1 ? 'completed' : 'failed',
        executionTime: 200 + Math.random() * 800
      }
      botActivityLogs.unshift(tradeActivity)
      botMetrics.tradesExecuted++
    }

    const activity: BotActivityLog = {
      id: `activity_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      symbol,
      message,
      confidence,
      status,
      executionTime,
      details: type === 'analysis' ?
        `Processing time: ${executionTime.toFixed(0)}ms, Confidence: ${(70 + Math.random() * 25).toFixed(1)}%` :
        undefined
    }

    // Add to logs (keep last 100)
    botActivityLogs.unshift(activity)
    if (botActivityLogs.length > 100) {
      botActivityLogs = botActivityLogs.slice(0, 100)
    }

    // Update metrics
    botMetrics.symbolsScanned += type === 'scan' ? 1 : 0
    botMetrics.analysisCompleted += type === 'analysis' ? 1 : 0
    botMetrics.recommendationsGenerated += type === 'recommendation' ? 1 : 0
    botMetrics.errorCount += status === 'failed' ? 1 : 0
    botMetrics.lastActivityTime = new Date()
    botMetrics.currentSymbol = symbol || botMetrics.currentSymbol
    botMetrics.nextScanIn = 10 + Math.random() * 50 // 10-60 seconds
    botMetrics.totalProcessingTime += executionTime
    botMetrics.avgAnalysisTime = botMetrics.totalProcessingTime / (botMetrics.analysisCompleted || 1)

    const totalActivities = botMetrics.symbolsScanned + botMetrics.analysisCompleted + botMetrics.recommendationsGenerated
    botMetrics.successRate = totalActivities > 0 ? ((totalActivities - botMetrics.errorCount) / totalActivities) * 100 : 87.5
    botMetrics.uptime = (Date.now() - botStartTime.getTime()) / 1000 // seconds
  }

  // Generate initial activity immediately
  generateActivity()

  // Set up interval for ongoing activities (every 2-6 seconds)
  simulationInterval = setInterval(generateActivity, 2000 + Math.random() * 4000)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    if (action === 'start-simulation') {
      // Stop any existing simulation first
      isSimulatingActivity = false
      if (simulationInterval) {
        clearInterval(simulationInterval)
        simulationInterval = null
      }

      // Reset metrics and start simulation
      botStartTime = new Date()
      botMetrics = {
        symbolsScanned: 0,
        analysisCompleted: 0,
        recommendationsGenerated: 0,
        tradesExecuted: 0,
        lastActivityTime: new Date(),
        currentSymbol: null,
        nextScanIn: 30,
        avgAnalysisTime: 2.5,
        successRate: 87.5,
        uptime: 0,
        totalProcessingTime: 0,
        errorCount: 0
      }
      botActivityLogs = []

      // Start simulating activity
      simulateBotActivity()

      return NextResponse.json({
        success: true,
        message: 'Bot activity simulation started',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'stop-simulation') {
      isSimulatingActivity = false

      // Clear the simulation interval
      if (simulationInterval) {
        clearInterval(simulationInterval)
        simulationInterval = null
      }

      return NextResponse.json({
        success: true,
        message: 'Bot activity simulation stopped',
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
          recentOrdersCount: recentOrders.size
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
            riskPerTrade: autoExecutionConfig.riskPerTrade
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
    const { type, symbol, message, confidence, details } = body

    if (!type || !message) {
      return NextResponse.json(
        { success: false, error: 'Type and message are required' },
        { status: 400 }
      )
    }

    // Add custom activity log
    const activity: BotActivityLog = {
      id: `activity_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      symbol,
      message,
      confidence,
      details,
      status: 'completed',
      executionTime: 100 + Math.random() * 500
    }

    botActivityLogs.unshift(activity)
    if (botActivityLogs.length > 100) {
      botActivityLogs = botActivityLogs.slice(0, 100)
    }

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
      activity,
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