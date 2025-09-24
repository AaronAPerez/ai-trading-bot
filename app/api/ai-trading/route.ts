import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'
import { RealTimeAITradingEngine } from '@/lib/ai/RealTimeAITradingEngine'

// Global instance of the AI trading engine
let aiTradingEngine: RealTimeAITradingEngine | null = null

const DEFAULT_CONFIG = {
  maxPositionsCount: 15,
  riskPerTrade: 0.02, // 2% risk per trade
  minConfidenceThreshold: 0.65, // 65% minimum confidence (lowered for more trades)
  rebalanceFrequency: 4, // Rebalance every 4 hours
  watchlistSize: 200, // Increased to 200 symbols for more trading opportunities
  watchlistCriteria: {
    includeETFs: true, // Include ETFs for diversification
    includeCrypto: true, // Include crypto for 24/7 trading opportunities
    riskLevel: 'medium' as 'low' | 'medium' | 'high',
    marketCap: ['mega', 'large', 'mid'] as ('mega' | 'large' | 'mid' | 'small')[],
    categories: ['growth_tech', 'fintech', 'clean_energy', 'healthcare', 'financial', 'consumer', 'industrial', 'energy', 'crypto'],
    sectors: ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Communication Services', 'Industrials', 'Energy', 'Materials', 'Utilities', 'Real Estate'],
    exchanges: ['NASDAQ', 'NYSE', 'BATS', 'CRYPTO'],
    minVolume: 50000, // Lower for crypto markets
    minPrice: 0.01, // Lower for crypto
    maxPrice: 100000, // Higher for crypto like BTC
    includeDividendStocks: true,
    includeGrowthStocks: true,
    includeValueStocks: true,
    includeMomentumStocks: true,
    cryptoPreferences: {
      includeMajorCoins: true, // BTC, ETH, etc.
      includeAltcoins: true,   // Other crypto
      minMarketCap: 1000000000, // $1B minimum market cap for crypto
      maxVolatility: 0.1       // 10% max daily volatility filter
    }
  },
  paperTrading: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper',
  autoExecution: {
    autoExecuteEnabled: true,
    confidenceThresholds: {
      minimum: 0.60,      // 60% minimum to consider execution (lowered)
      conservative: 0.70, // 70% for conservative positions
      aggressive: 0.80,   // 80% for aggressive positions
      maximum: 0.90       // 90% for maximum position size
    },
    positionSizing: {
      baseSize: 0.02,            // 2% base position size
      maxSize: 0.08,             // 8% maximum position size
      confidenceMultiplier: 2.0   // Confidence multiplier effect
    },
    riskControls: {
      maxDailyTrades: 100,       // Max 100 trades per day (increased)
      maxOpenPositions: 20,      // Max 20 open positions (increased)
      maxDailyLoss: 0.03,        // 3% max daily loss (lowered for safety)
      cooldownPeriod: 5          // 5 minutes between trades for same symbol (reduced)
    },
    executionRules: {
      marketHoursOnly: false,    // Allow 24/7 trading for crypto
      avoidEarnings: false,      // Don't avoid earnings (requires earnings data)
      volumeThreshold: 50000,    // Minimum 50K volume (lower for crypto)
      spreadThreshold: 0.03,     // Maximum 3% spread (higher for crypto)
      cryptoTradingEnabled: true, // Enable crypto trading
      afterHoursTrading: true,   // Enable after hours trading
      weekendTrading: true,      // Enable weekend trading for crypto
      cryptoSpreadThreshold: 0.05 // Higher spread tolerance for crypto (5%)
    }
  }
}
 
function getAlpacaClient() {
  console.log('🔗 Creating Alpaca client...')

  const config = {
    key: process.env.APCA_API_KEY_ID!,
    secret: process.env.APCA_API_SECRET_KEY!,
    paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
  }

  console.log('📋 Alpaca config:', {
    keyPresent: !!config.key,
    secretPresent: !!config.secret,
    keyStart: config.key ? config.key.substring(0, 4) + '...' : 'MISSING',
    paperMode: config.paper
  })

  if (!config.key || !config.secret) {
    console.error('❌ Missing Alpaca API credentials')
    throw new Error('Alpaca API credentials not configured - check APCA_API_KEY_ID and APCA_API_SECRET_KEY in .env.local')
  }

  try {
    const client = new AlpacaClient(config)
    console.log('✅ Alpaca client created successfully')
    return client
  } catch (error) {
    console.error('❌ Failed to create Alpaca client:', error)
    throw new Error(`Failed to create Alpaca client: ${error.message}`)
  }
}

// POST /api/ai-trading - Start AI trading
export async function POST(request: NextRequest) {
  console.log('🚀 AI Trading API POST request received')

  try {
    // Parse request body
    console.log('📖 Parsing request body...')
    const body = await request.json()
    const action = body.action

    console.log('🎯 Action requested:', action)
    console.log('📋 Request body:', JSON.stringify(body, null, 2))

    switch (action) {
      case 'start':
        console.log('🔄 Starting AI Trading Engine...')

        if (aiTradingEngine?.isEngineRunning()) {
          console.log('⚠️ AI Trading Engine is already running')
          return NextResponse.json(
            { error: 'AI Trading Engine is already running' },
            { status: 400 }
          )
        }

        // Create new AI trading engine instance
        console.log('🏗️ Creating Alpaca client...')
        const alpacaClient = getAlpacaClient()

        console.log('⚙️ Merging configuration...')
        const config = { ...DEFAULT_CONFIG, ...body.config }
        console.log('📊 Final config:', {
          autoExecuteEnabled: config.autoExecution?.autoExecuteEnabled,
          paperTrading: config.paperTrading,
          watchlistSize: config.watchlistSize,
          minConfidenceThreshold: config.minConfidenceThreshold
        })

        console.log('🧠 Creating RealTimeAITradingEngine...')
        try {
          // Add timeout for AI engine creation
          const createEnginePromise = Promise.resolve(new RealTimeAITradingEngine(alpacaClient, config))
          aiTradingEngine = await Promise.race([
            createEnginePromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI Trading Engine creation timeout')), 10000)
            )
          ]) as RealTimeAITradingEngine
          console.log('✅ AI Trading Engine instance created')
        } catch (engineError) {
          console.error('❌ Failed to create AI Trading Engine:', engineError)
          throw new Error(`Failed to create AI Trading Engine: ${engineError.message}`)
        }

        console.log('🎬 Starting AI Trading Engine...')
        try {
          // Add timeout for AI engine startup (increased timeout for market data loading)
          await Promise.race([
            aiTradingEngine.startAITrading(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI Trading Engine startup timeout')), 120000)
            )
          ])
          console.log('🎉 AI Trading Engine started successfully!')
        } catch (startError) {
          console.error('❌ Failed to start AI Trading Engine:', startError)
          throw new Error(`Failed to start AI Trading Engine: ${startError.message}`)
        }

        const session = aiTradingEngine.getCurrentSession()
        console.log('📈 Current session:', session)

        return NextResponse.json({
          success: true,
          message: 'AI Trading Engine started successfully',
          session: session,
          config: {
            autoExecuteEnabled: config.autoExecution?.autoExecuteEnabled,
            paperTrading: config.paperTrading,
            watchlistSize: config.watchlistSize,
            minConfidenceThreshold: config.minConfidenceThreshold
          }
        })

      case 'stop':
        if (!aiTradingEngine?.isEngineRunning()) {
          return NextResponse.json(
            { error: 'AI Trading Engine is not running' },
            { status: 400 }
          )
        }

        await aiTradingEngine.stopAITrading()
        const finalSession = aiTradingEngine.getCurrentSession()

        return NextResponse.json({
          success: true,
          message: 'AI Trading Engine stopped successfully',
          sessionSummary: finalSession
        })

      case 'status':
        if (!aiTradingEngine) {
          return NextResponse.json({
            running: false,
            session: null,
            marketData: []
          })
        }

        return NextResponse.json({
          running: aiTradingEngine.isEngineRunning(),
          session: aiTradingEngine.getCurrentSession(),
          marketData: aiTradingEngine.getMarketDataStatus(),
          watchlist: aiTradingEngine.getWatchlistInfo(),
          autoExecution: {
            metrics: aiTradingEngine.getAutoExecutionMetrics(),
            todayStats: aiTradingEngine.getTodayExecutionStats(),
            recentExecutions: aiTradingEngine.getRecentExecutions(5)
          },
          learning: {
            insights: aiTradingEngine.getLearningInsights(),
            accuracyTrend: aiTradingEngine.getAccuracyTrend(30),
            tradeHistoryCount: aiTradingEngine.getTradeHistory().length
          }
        })

      case 'update_watchlist':
        if (!aiTradingEngine) {
          return NextResponse.json(
            { error: 'AI Trading Engine not initialized' },
            { status: 400 }
          )
        }

        try {
          await aiTradingEngine.updateWatchlist(body.watchlistConfig || {})
          return NextResponse.json({
            success: true,
            message: 'Watchlist updated successfully',
            watchlist: aiTradingEngine.getWatchlistInfo()
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to update watchlist', details: error.message },
            { status: 500 }
          )
        }

      case 'update_config':
        if (!aiTradingEngine) {
          return NextResponse.json(
            { error: 'AI Trading Engine not initialized' },
            { status: 400 }
          )
        }

        // Note: Full config updates require stopping and restarting the engine
        return NextResponse.json({
          success: true,
          message: 'Full configuration update requires restart',
          currentConfig: DEFAULT_CONFIG
        })

      case 'execution_control':
        if (!aiTradingEngine) {
          return NextResponse.json(
            { error: 'AI Trading Engine not initialized' },
            { status: 400 }
          )
        }

        const { executionAction, executionConfig } = body

        switch (executionAction) {
          case 'enable':
            aiTradingEngine.enableAutoExecution()
            return NextResponse.json({
              success: true,
              message: 'Auto-execution enabled',
              todayStats: aiTradingEngine.getTodayExecutionStats()
            })

          case 'disable':
            aiTradingEngine.disableAutoExecution()
            return NextResponse.json({
              success: true,
              message: 'Auto-execution disabled',
              todayStats: aiTradingEngine.getTodayExecutionStats()
            })

          case 'update_config':
            if (executionConfig) {
              aiTradingEngine.updateExecutionConfig(executionConfig)
              return NextResponse.json({
                success: true,
                message: 'Execution configuration updated',
                todayStats: aiTradingEngine.getTodayExecutionStats()
              })
            } else {
              return NextResponse.json(
                { error: 'Execution config required' },
                { status: 400 }
              )
            }

          default:
            return NextResponse.json(
              { error: 'Invalid execution action. Use: enable, disable, update_config' },
              { status: 400 }
            )
        }

      case 'test':
        console.log('🧪 Testing AI Trading API...')

        // Test basic functionality without creating AI engine
        try {
          console.log('🔍 Testing Alpaca client creation...')
          const testClient = getAlpacaClient()
          console.log('✅ Alpaca client created successfully')

          console.log('🔍 Testing Alpaca connection...')
          const account = await testClient.getAccount()
          console.log('✅ Alpaca connection test passed')

          return NextResponse.json({
            success: true,
            message: 'AI Trading API is working',
            environment: {
              hasApiKey: !!process.env.APCA_API_KEY_ID,
              hasApiSecret: !!process.env.APCA_API_SECRET_KEY,
              tradingMode: process.env.NEXT_PUBLIC_TRADING_MODE,
              keyStart: process.env.APCA_API_KEY_ID?.substring(0, 4) + '...',
            },
            alpacaTest: {
              connected: true,
              accountType: account.accountType,
              balance: account.totalBalance
            },
            timestamp: new Date().toISOString()
          })
        } catch (testError) {
          console.error('❌ Test failed:', testError)
          return NextResponse.json({
            success: false,
            error: 'Test failed',
            details: testError.message,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        }

      default:
        console.log('❓ Invalid action received:', action)
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, status, update_watchlist, update_config, execution_control, or test' },
          { status: 400 }
        )
    }

  } catch (error) {
    // Narrow error type to access properties safely
    let err = error as Error
    // Fallback for non-Error objects
    if (typeof error === 'object' && error !== null && 'message' in error) {
      err = error as { message: string; stack?: string; name?: string }
    } else if (typeof error === 'string') {
      err = { message: error, name: 'Error' } as Error
    } else {
      err = { message: 'Unknown error', name: 'Error' } as Error
    }

    console.error('❌ AI Trading API Error:', error)
    console.error('❌ Error stack:', (err as any).stack)
    console.error('❌ Error name:', (err as any).name)
    console.error('❌ Error message:', (err as any).message)

    // Enhanced error reporting
    let errorMessage = 'AI Trading operation failed'
    let errorDetails = (err as any).message || 'Unknown error'

    // Check for specific error types
    if ((err as any).message?.includes('Alpaca')) {
      errorMessage = 'Alpaca API connection failed'
      errorDetails = 'Check your API keys and network connection'
    } else if ((err as any).message?.includes('credentials')) {
      errorMessage = 'Authentication failed'
      errorDetails = 'Invalid or missing Alpaca API credentials'
    } else if ((err as any).message?.includes('RealTimeAITradingEngine')) {
      errorMessage = 'AI Trading Engine initialization failed'
      errorDetails = 'Failed to create or start the AI trading system'
    } else if ((err as any).message?.includes('import') || (err as any).message?.includes('module')) {
      errorMessage = 'Module loading error'
      errorDetails = 'Failed to load required AI trading modules'
    }

    console.error('🚨 Sending error response:', {
      errorMessage,
      errorDetails,
      originalError: (err as any).message
    })

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        originalError: (err as any).message,
        timestamp: new Date().toISOString(),
        environment: {
          hasApiKey: !!process.env.APCA_API_KEY_ID,
          hasApiSecret: !!process.env.APCA_API_SECRET_KEY,
          tradingMode: process.env.NEXT_PUBLIC_TRADING_MODE
        }
      },
      { status: 500 }
    )
  }
}

// GET /api/ai-trading - Get AI trading status and metrics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const metric = url.searchParams.get('metric')

    if (!aiTradingEngine) {
      return NextResponse.json({
        running: false,
        session: null,
        message: 'AI Trading Engine not initialized'
      })
    }

    const baseStatus = {
      running: aiTradingEngine.isEngineRunning(),
      session: aiTradingEngine.getCurrentSession(),
      marketDataStatus: aiTradingEngine.getMarketDataStatus()
    }

    switch (metric) {
      case 'performance':
        const session = aiTradingEngine.getCurrentSession()
        if (!session) {
          return NextResponse.json({ ...baseStatus, performance: null })
        }

        const duration = session.endTime
          ? session.endTime.getTime() - session.startTime.getTime()
          : Date.now() - session.startTime.getTime()

        const performance = {
          sessionDuration: Math.round(duration / 60000), // minutes
          tradesExecuted: session.tradesExecuted,
          totalPnL: session.totalPnL,
          maxDrawdown: session.maxDrawdown,
          aiAccuracy: session.aiPredictions > 0
            ? (session.successfulPredictions / session.aiPredictions) * 100
            : 0,
          averageTradeTime: session.tradesExecuted > 0
            ? duration / session.tradesExecuted / 60000
            : 0
        }

        return NextResponse.json({ ...baseStatus, performance })

      case 'portfolio':
        try {
          const alpacaClient = getAlpacaClient()
          const account = await alpacaClient.getAccount()
          const positions = await alpacaClient.getPositions()

          const portfolio = {
            totalValue: account.totalBalance,
            cashBalance: account.cashBalance,
            positionsCount: positions.length,
            totalUnrealizedPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
            dayTradingBuyingPower: account.dayTradingBuyingPower,
            positions: positions.map(pos => ({
              symbol: pos.symbol,
              quantity: pos.quantity,
              marketValue: pos.marketValue,
              unrealizedPnL: pos.unrealizedPnL,
              unrealizedPnLPercent: pos.unrealizedPnLPercent
            }))
          }

          return NextResponse.json({ ...baseStatus, portfolio })
        } catch (error) {
          return NextResponse.json({
            ...baseStatus,
            portfolio: null,
            error: 'Failed to fetch portfolio data'
          })
        }

      case 'config':
        return NextResponse.json({
          ...baseStatus,
          config: DEFAULT_CONFIG
        })

      default:
        return NextResponse.json(baseStatus)
    }

  } catch (error) {
    console.error('AI Trading status error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get AI trading status',
        details: error.message
      },
      { status: 500 }
    )
  }
}
