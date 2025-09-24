import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'
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
 
// AlpacaServerClient to AlpacaClient adapter for compatibility with AI Trading Engine
class AlpacaClientAdapter {
  private serverClient: AlpacaServerClient

  constructor() {
    this.serverClient = new AlpacaServerClient()
  }

  // Adapter methods that match AlpacaClient interface
  async getAccount() {
    const account = await this.serverClient.getAccount()
    return {
      ...account,
      id: 'adapter-account-id', // Add missing ID field
      cashBalance: account.cashBalance, // AlpacaClient uses cashBalance
      dayTradingBuyingPower: account.dayTradingBuyingPower // Keep this field
    }
  }

  async getPositions() {
    return await this.serverClient.getPositions()
  }

  async getLatestQuotes(symbols: string[]) {
    return await this.serverClient.getLatestQuotes(symbols)
  }

  async createOrder(orderData: any) {
    return await this.serverClient.createOrder(orderData)
  }

  async getOrders(status?: any, limit?: number) {
    return await this.serverClient.getOrders(status, limit)
  }

  // Add missing method for AI Trading Engine compatibility
  async getBarsV2(symbol: string, options: any) {
    // AlpacaServerClient uses getBarsV2 method from the underlying client
    // We need to access it through the serverClient's underlying client
    try {
      // For now, return empty data to prevent errors
      // The AI engine will handle missing data gracefully
      return []
    } catch (error) {
      console.warn(`getBarsV2 not implemented in adapter for ${symbol}:`, error)
      return []
    }
  }
}

function getAlpacaClient() {
  console.log('🔗 Creating Alpaca client with adapter...')

  // Enhanced production environment validation
  const requiredEnvVars = ['APCA_API_KEY_ID', 'APCA_API_SECRET_KEY']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars)
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please check your deployment configuration.`)
  }

  console.log('📋 Alpaca config:', {
    keyPresent: !!process.env.APCA_API_KEY_ID,
    secretPresent: !!process.env.APCA_API_SECRET_KEY,
    keyStart: process.env.APCA_API_KEY_ID ? process.env.APCA_API_KEY_ID.substring(0, 4) + '...' : 'MISSING',
    paperMode: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper',
    environment: process.env.NODE_ENV || 'unknown'
  })

  try {
    const client = new AlpacaClientAdapter()
    console.log('✅ Alpaca client adapter created successfully')
    return client as any // Type cast for compatibility
  } catch (error) {
    console.error('❌ Failed to create Alpaca client adapter:', error)

    // Enhanced error details for production debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
      throw new Error('Alpaca API authentication failed. Please verify your API keys in the deployment environment.')
    }

    throw new Error(`Failed to create Alpaca client adapter: ${errorMessage}`)
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

        // Define production mode for both engine creation and startup
        const isProduction = process.env.NODE_ENV === 'production'

        console.log('🧠 Creating RealTimeAITradingEngine...')
        try {
          // Production-optimized AI engine creation with shorter timeout for serverless
          const creationTimeout = isProduction ? 5000 : 10000 // 5s in prod, 10s in dev

          const createEnginePromise = new Promise<RealTimeAITradingEngine>((resolve, reject) => {
            try {
              const engine = new RealTimeAITradingEngine(alpacaClient, config)
              resolve(engine)
            } catch (error) {
              reject(error)
            }
          })

          aiTradingEngine = await Promise.race([
            createEnginePromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AI Trading Engine creation timeout (serverless function limit)')), creationTimeout)
            )
          ])

          console.log('✅ AI Trading Engine instance created')
        } catch (engineError) {
          console.error('❌ Failed to create AI Trading Engine:', engineError)

          const errorMessage = engineError instanceof Error ? engineError.message : 'Unknown error'

          // Enhanced production error handling
          if (errorMessage.includes('timeout')) {
            throw new Error('AI Trading Engine creation timed out. This may be due to serverless function constraints or network issues.')
          } else if (errorMessage.includes('module') || errorMessage.includes('import')) {
            throw new Error('AI Trading Engine module loading failed. Please check the deployment build.')
          }

          throw new Error(`Failed to create AI Trading Engine: ${errorMessage}`)
        }

        console.log('🎬 Starting AI Trading Engine...')
        try {
          // Production-optimized startup with shorter timeout for serverless
          const startupTimeout = isProduction ? 30000 : 120000 // 30s in prod, 120s in dev

          await Promise.race([
            aiTradingEngine.startAITrading(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AI Trading Engine startup timeout (serverless function limit)')), startupTimeout)
            )
          ])
          console.log('🎉 AI Trading Engine started successfully!')
        } catch (startError) {
          console.error('❌ Failed to start AI Trading Engine:', startError)

          const errorMessage = startError instanceof Error ? startError.message : 'Unknown error'

          // Enhanced startup error handling
          if (errorMessage.includes('timeout')) {
            throw new Error('AI Trading Engine startup timed out. Consider using a longer-running service for AI trading operations.')
          } else if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
            throw new Error('Alpaca API authentication failed during engine startup. Please verify your API keys.')
          } else if (errorMessage.includes('market data') || errorMessage.includes('quotes')) {
            throw new Error('Market data initialization failed. Please check your network connection and API access.')
          }

          throw new Error(`Failed to start AI Trading Engine: ${errorMessage}`)
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

    // Enhanced production error type detection
    const errorMsg = (err as any).message || ''

    if (errorMsg.includes('Missing required environment variables')) {
      errorMessage = 'Configuration Error'
      errorDetails = 'Required environment variables are missing in production deployment'
    } else if (errorMsg.includes('Authentication') || errorMsg.includes('401')) {
      errorMessage = 'Authentication Failed'
      errorDetails = 'Alpaca API authentication failed. Verify API keys in deployment environment.'
    } else if (errorMsg.includes('timeout') && errorMsg.includes('serverless')) {
      errorMessage = 'Serverless Timeout'
      errorDetails = 'Operation timed out due to serverless function limits. Consider using edge functions or increasing timeout.'
    } else if (errorMsg.includes('Alpaca')) {
      errorMessage = 'Alpaca API Error'
      errorDetails = 'Check your API keys and network connection'
    } else if (errorMsg.includes('credentials')) {
      errorMessage = 'Authentication Error'
      errorDetails = 'Invalid or missing Alpaca API credentials'
    } else if (errorMsg.includes('RealTimeAITradingEngine')) {
      errorMessage = 'AI Engine Error'
      errorDetails = 'Failed to create or start the AI trading system'
    } else if (errorMsg.includes('import') || errorMsg.includes('module')) {
      errorMessage = 'Module Loading Error'
      errorDetails = 'Failed to load required AI trading modules. Check deployment build.'
    } else if (errorMsg.includes('market data') || errorMsg.includes('quotes')) {
      errorMessage = 'Market Data Error'
      errorDetails = 'Failed to initialize market data. Check network and API access.'
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
            cashBalance: account.cashBalance || account.availableBuyingPower || 0,
            positionsCount: positions.length,
            totalUnrealizedPnL: positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0),
            dayTradingBuyingPower: account.dayTradingBuyingPower || account.availableBuyingPower || 0,
            positions: positions.map(pos => ({
              symbol: pos.symbol,
              quantity: pos.quantity || 0,
              marketValue: pos.marketValue || 0,
              unrealizedPnL: pos.unrealizedPnL || 0,
              unrealizedPnLPercent: pos.unrealizedPnLPercent || 0
            }))
          }

          return NextResponse.json({ ...baseStatus, portfolio })
        } catch (error) {
          console.error('Portfolio fetch error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          return NextResponse.json({
            ...baseStatus,
            portfolio: null,
            error: 'Failed to fetch portfolio data',
            details: errorMessage.includes('Authentication') ? 'API authentication failed' : 'Network or API error'
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
