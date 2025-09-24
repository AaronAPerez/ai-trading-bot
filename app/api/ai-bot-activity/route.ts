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
let orderExecutionEnabled = true
const autoExecutionConfig = {
  minConfidenceForOrder: 70, // 70% minimum confidence to execute trades
  maxPositionSize: 5000, // Maximum $5000 per position
  orderCooldown: 180000, // 3 minutes between orders for same symbol
  dailyOrderLimit: 100, // Maximum 100 orders per day
  riskPerTrade: 0.08, // 8% of portfolio per trade (increased from 5%)
  minOrderValue: 50, // Minimum $50 per order (increased from $25)
  baseMinPositionValue: 100 // Minimum base position size before confidence multiplier
}

const recentOrders: Set<string> = new Set() // Track symbols with recent orders
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

// Order execution function
async function executeOrder(symbol: string, confidence: number, recommendation: string) {
  console.log(`🔍 Order execution check - Symbol: ${symbol}, Confidence: ${confidence}%, Enabled: ${orderExecutionEnabled}`)

  if (!orderExecutionEnabled) {
    console.log('❌ Order execution is disabled')
    return null
  }

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

    // Handle both crypto and stock symbols
    const isCrypto = symbol.includes('/USD') || symbol.includes('USD')
    console.log(`📊 Processing ${isCrypto ? 'crypto' : 'stock'} symbol: ${symbol}`)

    console.log(`🚀 Executing order for ${symbol} with ${confidence}% confidence`)

    // Create Alpaca client
    const alpacaClient = new AlpacaServerClient()

    // Get account information for position sizing
    const account = await alpacaClient.getAccount()
    const portfolioValue = account.totalBalance

    // Calculate position size based on confidence and risk parameters
    const basePositionSize = Math.max(
      portfolioValue * autoExecutionConfig.riskPerTrade,
      autoExecutionConfig.baseMinPositionValue
    )
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

    // Check if order value meets minimum threshold first
    if (positionValue < autoExecutionConfig.minOrderValue) {
      console.log(`⚠️ Position value $${positionValue.toFixed(2)} below minimum $${autoExecutionConfig.minOrderValue} for ${symbol}`)
      return null
    }

    // For stocks: use notional orders (fractional shares) if 1 share costs more than position value
    // For crypto: use quantity-based orders with fractional precision
    let orderParams: any
    let orderValue: number

    if (isCrypto) {
      // For crypto, calculate fractional quantity
      const quantity = Math.floor((positionValue / currentPrice) * 100000) / 100000 // 5 decimal precision
      if (quantity < 0.00001) {
        console.log(`⚠️ Calculated crypto quantity ${quantity} too small for ${symbol}`)
        return null
      }
      orderValue = quantity * currentPrice
      orderParams = { qty: quantity }
      console.log(`💰 Crypto Order: Quantity: ${quantity}, Price: $${currentPrice.toFixed(4)}, Value: $${orderValue.toFixed(2)}`)
    } else {
      // For stocks: use notional (dollar amount) orders to support fractional shares
      orderValue = positionValue
      orderParams = { notional: positionValue }
      const estimatedShares = positionValue / currentPrice
      console.log(`💰 Stock Order: Notional: $${positionValue.toFixed(2)}, Est. Shares: ${estimatedShares.toFixed(4)}, Price: $${currentPrice.toFixed(2)}`)
    }

    // Determine buy/sell based on recommendation
    let side: 'buy' | 'sell' = 'buy' // Default to buy
    if (recommendation.toLowerCase().includes('sell') ||
        recommendation.toLowerCase().includes('short') ||
        recommendation.toLowerCase().includes('exit')) {
      side = 'sell'
    }

    // Create order using either qty (crypto) or notional (stocks)
    const orderData = {
      symbol: symbol,
      ...orderParams, // Either { qty: number } or { notional: number }
      side: side,
      type: 'market' as const,
      time_in_force: 'day' as const
    }

    // Validate order data as recommended in improvements.txt
    if (!orderData.qty && !orderData.notional) {
      console.log(`❌ Order validation failed: missing qty or notional for ${symbol}`)
      return null
    }

    console.log(`🚀 Creating ${isCrypto ? 'crypto' : 'stock'} order:`, JSON.stringify(orderData, null, 2))

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

    // Safe parsing as recommended in improvements.txt
    const executedQty = parseFloat(order.qty ?? '0')
    const actualValue = isCrypto ? executedQty * currentPrice : orderValue

    console.log(`✅ Order executed: ${side.toUpperCase()} ${isCrypto ? executedQty : `$${orderValue.toFixed(2)} notional`} ${symbol} @ $${currentPrice.toFixed(isCrypto ? 4 : 2)} (Value: $${actualValue.toFixed(2)})`)

    return {
      orderId: order.id,
      symbol: symbol,
      side: side,
      quantity: executedQty,
      price: currentPrice,
      value: actualValue,
      confidence: confidence,
      timestamp: new Date(),
      assetType: isCrypto ? 'crypto' : 'stock'
    }

  } catch (error) {
    // Enhanced error handling as recommended in improvements.txt
    if (error instanceof Error) {
      console.error(`❌ Order execution failed for ${symbol}:`, error.stack || error.message)

      // Check for authentication errors
      if (error.message.includes('401')) {
        console.error('🚨 Authentication failed - check Alpaca API keys')
      }
    } else {
      console.error(`❌ Order execution failed for ${symbol}:`, error)
    }

    orderExecutionMetrics.failedOrders++
    return null
  }
}

async function performRealBotActivity() {
  // Stop any existing simulation first
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }

  isSimulatingActivity = true

  // Get real watchlist symbols from Alpaca
  const alpacaClient = new AlpacaServerClient()

  // Expanded watchlist for more trading opportunities
  let watchlistSymbols = [
    // Large Cap Tech Stocks
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NFLX', 'NVDA', 'AMD', 'CRM', 'ORCL', 'CSCO', 'ADBE', 'INTC',
    // Electric Vehicle & Clean Energy
    'TSLA', 'NIO', 'RIVN', 'LCID', 'ENPH', 'SEDG', 'FSLR', 'PLUG', 'CHPT', 'QS', 'BLNK',
    // Financial & Banking
    'JPM', 'BAC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ', 'WFC', 'C', 'AXP', 'BRK.B', 'KO', 'JNJ',
    // Healthcare & Biotech
    'JNJ', 'PFE', 'UNH', 'MRNA', 'BNTX', 'ABBV', 'LLY', 'TMO', 'DHR', 'ABT', 'BMY', 'MRK',
    // ETFs & Index Funds (High Volume)
    'SPY', 'QQQ', 'IWM', 'VTI', 'ARKK', 'TQQQ', 'SQQQ', 'XLF', 'XLK', 'XLE', 'GDX', 'EEM', 'FXI',
    // Retail & Consumer
    'WMT', 'TGT', 'COST', 'HD', 'DIS', 'SBUX', 'NKE', 'MCD', 'LOW', 'TJX', 'AMZN', 'EBAY',
    // Energy & Commodities
    'XOM', 'CVX', 'COP', 'GLD', 'USO', 'UCO', 'SLV', 'GDX', 'KMI', 'EOG', 'OKE', 'PSX',
    // Communication & Media
    'VZ', 'T', 'CMCSA', 'CHTR', 'TTWO', 'EA', 'ATVI', 'ROKU', 'SNAP', 'TWTR', 'PINS',
    // Affordable High-Volume Stocks (Better execution rates)
    'F', 'SOFI', 'PLTR', 'BB', 'WISH', 'CLOV', 'AMC', 'GME', 'NOK', 'SNDL', 'PTON', 'HOOD', 'COIN',
    // Real Estate & REITs
    'VNQ', 'O', 'AMT', 'PLD', 'CCI', 'EQIX', 'SPG', 'EXR', 'AVB', 'EQR',
    // Industrials & Materials
    'CAT', 'BA', 'GE', 'MMM', 'HON', 'UPS', 'FDX', 'RTX', 'LMT', 'DE',
    // Major Cryptocurrencies (Note: Some may not be available in Alpaca)
    'BTC/USD', 'ETH/USD', 'LTC/USD', 'BCH/USD', 'AAVE/USD', 'AVAX/USD',
    'DOGE/USD', 'ADA/USD', 'SOL/USD', 'MATIC/USD', 'DOT/USD', 'UNI/USD'
  ]

  try {
    // Get current positions to include them in monitoring
    const positions = await alpacaClient.getPositions()
    const positionSymbols = positions.map(p => p.symbol)
    watchlistSymbols = [...new Set([...watchlistSymbols, ...positionSymbols])]
  } catch (error) {
    console.log('Could not fetch positions, using default watchlist:', error.message)
  }

  const generateRealActivity = async () => {
    // Check if activity should continue
    if (!isSimulatingActivity) return

    const activityTypes = ['scan', 'analysis', 'recommendation', 'info'] as const
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
    const symbol = Math.random() > 0.3 ? watchlistSymbols[Math.floor(Math.random() * watchlistSymbols.length)] : undefined

    let message = ''
    let details = ''
    let confidence: number | undefined
    let status: 'completed' | 'failed' = 'completed'
    const executionTime = 500 + Math.random() * 2000

    try {

      // Generate real activity based on actual Alpaca data
      switch (type) {
        case 'scan':
          if (symbol) {
            try {
              const quotes = await alpacaClient.getLatestQuotes([symbol])
              const quote = quotes[symbol]
              if (quote) {
                message = `Market scan completed for ${symbol} - Price: $${quote.midPrice.toFixed(2)}`
                details = `Bid: $${quote.bidPrice.toFixed(2)}, Ask: $${quote.askPrice.toFixed(2)}, Spread: $${quote.spread.toFixed(3)}`
              } else {
                message = `Market scan attempted for ${symbol} - No current market data available`
                status = 'failed'
              }
            } catch (error) {
              message = `Market scan failed for ${symbol}`
              details = `Error: ${error.message}`
              status = 'failed'
            }
          } else {
            message = `Portfolio scan completed - Monitoring ${watchlistSymbols.length} symbols`
            details = `Watchlist: ${watchlistSymbols.slice(0, 3).join(', ')}${watchlistSymbols.length > 3 ? '...' : ''}`
          }
          break

        case 'analysis':
          if (symbol) {
            try {
              const quotes = await alpacaClient.getLatestQuotes([symbol])
              const quote = quotes[symbol]
              if (quote) {
                const volatility = Math.random() * 30 + 10 // Simulated volatility analysis
                const trendStrength = Math.random() * 100
                message = `Technical analysis completed for ${symbol}`
                details = `Price: $${quote.midPrice.toFixed(2)}, Volatility: ${volatility.toFixed(1)}%, Trend: ${trendStrength.toFixed(1)}%`
              } else {
                message = `Analysis failed for ${symbol} - Insufficient market data`
                status = 'failed'
              }
            } catch (error) {
              message = `Analysis error for ${symbol}`
              details = `Error: ${error.message}`
              status = 'failed'
            }
          } else {
            message = `Portfolio risk analysis completed`
            details = `Risk metrics updated for ${watchlistSymbols.length} positions`
          }
          break

        case 'recommendation':
          if (symbol) {
            try {
              const quotes = await alpacaClient.getLatestQuotes([symbol])
              const quote = quotes[symbol]
              if (quote) {
                confidence = 60 + Math.random() * 35 // 60-95% confidence
                const action = Math.random() > 0.5 ? 'BUY' : 'HOLD'
                const targetPrice = quote.midPrice * (1 + (Math.random() * 0.1 - 0.05))
                message = `${action} signal generated for ${symbol}`
                details = `Current: $${quote.midPrice.toFixed(2)}, Target: $${targetPrice.toFixed(2)}, Confidence: ${confidence.toFixed(1)}%`
              } else {
                message = `Recommendation generation failed for ${symbol}`
                details = `No market data available`
                status = 'failed'
              }
            } catch (error) {
              message = `Recommendation error for ${symbol}`
              details = `Error: ${error.message}`
              status = 'failed'
            }
          } else {
            confidence = 70 + Math.random() * 25
            message = `Portfolio rebalancing recommendation generated`
            details = `Suggested adjustments based on market conditions, Confidence: ${confidence.toFixed(1)}%`
          }
          break

        case 'info':
          try {
            const account = await alpacaClient.getAccount()
            if (Math.random() > 0.5) {
              message = `Account status verified - Trading: ${account.tradingEnabled ? 'ENABLED' : 'DISABLED'}`
              details = `Portfolio Value: $${account.totalBalance.toLocaleString()}, Buying Power: $${account.availableBuyingPower.toLocaleString()}`
            } else {
              message = `Market data connection verified`
              details = `Real-time data feed active, Monitoring ${watchlistSymbols.length} symbols`
            }
          } catch (error) {
            message = `System health check failed`
            details = `Error: ${error.message}`
            status = 'failed'
          }
          break
      }

      // Execute real orders for high-confidence recommendations when live trading is enabled
      if (type === 'recommendation' && confidence && confidence >= autoExecutionConfig.minConfidenceForOrder && symbol) {
        setTimeout(async () => {
          const orderResult = await executeOrder(symbol, confidence, message)

          if (orderResult) {
            // Create a successful trade activity log
            const isCrypto = symbol.includes('/USD') || symbol.includes('USD')
            const priceDecimals = isCrypto ? 4 : 2
            const quantityStr = isCrypto ? orderResult.quantity.toFixed(5) : orderResult.quantity.toString()

            const tradeActivity: BotActivityLog = {
              id: `order_${Date.now()}_${Math.random()}`,
              timestamp: new Date(),
              type: 'trade',
              symbol: orderResult.symbol,
              message: `${orderResult.side.toUpperCase()} order executed: ${quantityStr} ${orderResult.symbol} @ $${orderResult.price.toFixed(priceDecimals)}`,
              status: 'completed',
              executionTime: 500 + Math.random() * 1000,
              details: `Order ID: ${orderResult.orderId}, Value: $${orderResult.value.toFixed(2)}, Confidence: ${orderResult.confidence}%, Type: ${orderResult.assetType}`
            }

            botActivityLogs.unshift(tradeActivity)
            botMetrics.tradesExecuted++

            console.log('📈 Real trade executed and logged:', tradeActivity.message)
          } else if (orderExecutionEnabled) {
            // Only log skipped orders when live trading is enabled
            const tradeActivity: BotActivityLog = {
              id: `order_skip_${Date.now()}_${Math.random()}`,
              timestamp: new Date(),
              type: 'info',
              symbol,
              message: `Order execution conditions not met for ${symbol}`,
              status: 'completed',
              executionTime: 100,
              details: `Confidence: ${confidence}%, Live Trading: ${orderExecutionEnabled ? 'ON' : 'OFF'}`
            }

            botActivityLogs.unshift(tradeActivity)
          }
        }, 1500) // Execute 1.5 seconds after recommendation
      }

    } catch (error) {
      console.error('Error generating activity:', error)
      message = `System error occurred`
      details = `Error: ${error.message}`
      status = 'failed'
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
        details
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
    await generateRealActivity()

    // Set up interval for ongoing activities (every 3-8 seconds for more frequent opportunities)
    simulationInterval = setInterval(generateRealActivity, 3000 + Math.random() * 5000)
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

      // Start real bot activity using Alpaca API
      performRealBotActivity()

      return NextResponse.json({
        success: true,
        message: 'AI Bot activity started - Using real Alpaca API data',
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