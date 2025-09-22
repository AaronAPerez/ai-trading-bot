import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'
import { RealTimeAITradingEngine } from '@/lib/ai/RealTimeAITradingEngine'

// Global instance of the AI trading engine
let aiTradingEngine: RealTimeAITradingEngine | null = null

const DEFAULT_CONFIG = {
  maxPositionsCount: 10,
  riskPerTrade: 0.02, // 2% risk per trade
  minConfidenceThreshold: 0.65, // 65% minimum confidence
  rebalanceFrequency: 4, // Rebalance every 4 hours
  watchlist: [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
    'JNJ', 'V', 'PG', 'UNH', 'HD', 'DIS', 'MA', 'PYPL', 'ADBE', 'NFLX'
  ],
  paperTrading: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
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
          marketData: aiTradingEngine.getMarketDataStatus()
        })

      case 'update_config':
        if (!aiTradingEngine) {
          return NextResponse.json(
            { error: 'AI Trading Engine not initialized' },
            { status: 400 }
          )
        }

        // Note: Config updates would require stopping and restarting the engine
        return NextResponse.json({
          success: true,
          message: 'Configuration update requires restart',
          currentConfig: DEFAULT_CONFIG
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, status, or update_config' },
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