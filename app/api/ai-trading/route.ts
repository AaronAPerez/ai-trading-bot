import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'
import { RealTimeAITradingEngine } from '@/lib/ai/RealTimeAITradingEngine'

// Global instance of the AI trading engine
let aiTradingEngine: RealTimeAITradingEngine | null = null

const DEFAULT_CONFIG = {
  maxPositionsCount: 15,
  riskPerTrade: 0.02, // 2% risk per trade
  minConfidenceThreshold: 0.65, // 65% minimum confidence
  rebalanceFrequency: 4, // Rebalance every 4 hours
  watchlistSize: 50, // Auto-generate 50 symbols
  watchlistCriteria: {
    includeETFs: true,
    includeCrypto: true,
    riskLevel: 'medium' as 'low' | 'medium' | 'high',
    marketCap: ['mega', 'large'] as ('mega' | 'large' | 'mid' | 'small')[],
    categories: ['growth_tech', 'fintech', 'clean_energy']
  },
  paperTrading: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper',
  autoExecution: {
    autoExecuteEnabled: true,
    confidenceThresholds: {
      minimum: 0.65,      // 65% minimum to consider execution
      conservative: 0.75, // 75% for conservative positions
      aggressive: 0.85,   // 85% for aggressive positions
      maximum: 0.95       // 95% for maximum position size
    },
    positionSizing: {
      baseSize: 0.02,            // 2% base position size
      maxSize: 0.08,             // 8% maximum position size
      confidenceMultiplier: 2.0   // Confidence multiplier effect
    },
    riskControls: {
      maxDailyTrades: 20,        // Max 20 trades per day
      maxOpenPositions: 15,      // Max 15 open positions
      maxDailyLoss: 0.05,        // 5% max daily loss
      cooldownPeriod: 15         // 15 minutes between trades for same symbol
    },
    executionRules: {
      marketHoursOnly: true,     // Only trade during market hours
      avoidEarnings: false,      // Don't avoid earnings (requires earnings data)
      volumeThreshold: 100000,   // Minimum 100K volume
      spreadThreshold: 0.02      // Maximum 2% spread
    }
  }
}

function getAlpacaClient() {
  const config = {
    key: process.env.APCA_API_KEY_ID!,
    secret: process.env.APCA_API_SECRET_KEY!,
    paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
  }

  if (!config.key || !config.secret) {
    throw new Error('Alpaca API credentials not configured')
  }

  return new AlpacaClient(config)
}

// POST /api/ai-trading - Start AI trading
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'start':
        if (aiTradingEngine?.isEngineRunning()) {
          return NextResponse.json(
            { error: 'AI Trading Engine is already running' },
            { status: 400 }
          )
        }

        // Create new AI trading engine instance
        const alpacaClient = getAlpacaClient()
        const config = { ...DEFAULT_CONFIG, ...body.config }

        aiTradingEngine = new RealTimeAITradingEngine(alpacaClient, config)

        await aiTradingEngine.startAITrading()

        return NextResponse.json({
          success: true,
          message: 'AI Trading Engine started successfully',
          session: aiTradingEngine.getCurrentSession(),
          config
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

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, status, update_watchlist, update_config, or execution_control' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('AI Trading API error:', error)
    return NextResponse.json(
      {
        error: 'AI Trading operation failed',
        details: error.message
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