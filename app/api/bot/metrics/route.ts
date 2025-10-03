import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { getCurrentUserId } from '@/lib/auth/demo-user'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || getCurrentUserId()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch real-time data from Alpaca API
    let alpacaAccount = null
    let alpacaPositions: any[] = []
    let alpacaOrders: any[] = []

    try {
      [alpacaAccount, alpacaPositions, alpacaOrders] = await Promise.all([
        alpacaClient.getAccount(),
        alpacaClient.getPositions(),
        alpacaClient.getOrders({ status: 'all', limit: 100 })
      ])
    } catch (alpacaError) {
      console.warn('⚠️ Alpaca API error, using Supabase data only:', alpacaError)
    }

    // Fetch bot status
    const { data: botStatus, error: botError } = await supabase
      .from('bot_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (botError && botError.code !== 'PGRST116') {
      throw botError
    }

    // Fetch AI learning data from Supabase
    const { data: learningData, error: learningError } = await supabase
      .from('ai_learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (learningError) {
      console.warn('⚠️ Error fetching learning data:', learningError)
    }

    // Fetch trade history from Supabase
    const { data: trades, error: tradesError } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (tradesError) {
      console.warn('⚠️ Error fetching trades:', tradesError)
    }

    // Calculate real-time metrics from Alpaca
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // REAL ALPACA ACCOUNT DATA
    const portfolioValue = alpacaAccount ? parseFloat(alpacaAccount.portfolio_value) : 0
    const equity = alpacaAccount ? parseFloat(alpacaAccount.equity) : 0
    const buyingPower = alpacaAccount ? parseFloat(alpacaAccount.buying_power) : 0
    const cash = alpacaAccount ? parseFloat(alpacaAccount.cash) : 0

    // REAL ALPACA POSITIONS DATA
    const totalInvestedAmount = alpacaPositions.reduce((sum, pos) => {
      return sum + Math.abs(parseFloat(pos.market_value || 0))
    }, 0)

    const totalUnrealizedPnL = alpacaPositions.reduce((sum, pos) => {
      return sum + parseFloat(pos.unrealized_pl || 0)
    }, 0)

    const totalIntraDayPnL = alpacaPositions.reduce((sum, pos) => {
      return sum + parseFloat(pos.unrealized_intraday_pl || 0)
    }, 0)

    // REAL ALPACA ORDERS DATA
    const filledOrders = alpacaOrders.filter(o => o.status === 'filled')
    const todayOrders = alpacaOrders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= todayStart
    })
    const todayFilledOrders = todayOrders.filter(o => o.status === 'filled')

    // AI LEARNING METRICS from Supabase
    const allLearningData = Array.isArray(learningData) ? learningData : []
    const profitableCount = allLearningData.filter(d => d.outcome === 'profit').length
    const accuracy = allLearningData.length > 0 ? (profitableCount / allLearningData.length) : 0

    // Calculate patterns identified
    const uniqueStrategies = new Set(allLearningData.map(d => d.strategy_used || 'unknown'))
    const patternsIdentified = uniqueStrategies.size * 3 + Math.floor(allLearningData.length / 10)

    // All trades data
    const allTrades = trades || []
    const todayTrades = allTrades.filter(t => new Date(t.timestamp) >= todayStart)
    const successfulTrades = allTrades.filter(t => t.status === 'FILLED')

    // Calculate P&L from trade history
    const historicalPnL = successfulTrades.reduce((sum, t) => {
      return sum + (parseFloat(t.pnl || '0'))
    }, 0)

    // Combine Alpaca real-time P&L with historical data
    const totalPnL = totalUnrealizedPnL + historicalPnL
    const dailyPnL = totalIntraDayPnL

    const successRate = filledOrders.length > 0
      ? ((filledOrders.length - allLearningData.filter(d => d.outcome === 'loss').length) / filledOrders.length) * 100
      : 0

    // Calculate uptime
    const startTime = botStatus?.started_at
      ? new Date(botStatus.started_at)
      : now
    const uptimeMs = now.getTime() - startTime.getTime()
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))

    // Calculate risk score based on portfolio diversification and exposure
    const positionCount = alpacaPositions.length
    const avgPositionSize = positionCount > 0 ? totalInvestedAmount / positionCount : 0
    const portfolioConcentration = portfolioValue > 0 ? (avgPositionSize / portfolioValue) * 100 : 0
    const riskScore = Math.min(100, Math.max(0, portfolioConcentration * 2))

    const metrics = {
      // Bot Status
      isRunning: botStatus?.is_running || false,
      status: botStatus?.status || 'stopped',
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      uptimeMs,

      // AI Learning Progress (from Supabase)
      accuracy: Math.round(accuracy * 100),
      patternsIdentified,
      dataPointsProcessed: allLearningData.length,
      isLearningActive: botStatus?.is_running || false,

      // Trading Performance (from Alpaca + Supabase)
      tradesExecuted: filledOrders.length,
      todayTrades: todayFilledOrders.length,
      successfulTrades: filledOrders.length,
      successRate: Math.round(successRate * 100) / 100,
      recommendationsGenerated: allLearningData.length,

      // Real-time Alpaca Portfolio Data
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      buyingPower: Math.round(buyingPower * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      investedAmount: Math.round(totalInvestedAmount * 100) / 100,

      // Real-time P&L from Alpaca
      totalPnL: Math.round(totalPnL * 100) / 100,
      dailyPnL: Math.round(dailyPnL * 100) / 100,
      unrealizedPnL: Math.round(totalUnrealizedPnL * 100) / 100,

      // Risk Management
      riskScore: Math.round(riskScore),
      positionCount: alpacaPositions.length,

      // Additional Stats
      avgTradeSize: filledOrders.length > 0
        ? Math.round((filledOrders.reduce((sum, o) => sum + parseFloat(o.qty || 0), 0) / filledOrders.length) * 100) / 100
        : 0,
      lastTradeTime: filledOrders[0]?.filled_at || allTrades[0]?.timestamp || null,
      lastActivity: botStatus?.last_activity || null,
      lastError: botStatus?.last_error || null,
      lastErrorTime: botStatus?.last_error_at || null,

      // Data Sources
      dataSources: {
        alpaca: !!alpacaAccount,
        supabase: true,
        positions: alpacaPositions.length,
        orders: alpacaOrders.length
      }
    }

    return NextResponse.json(metrics, { status: 200 })
  } catch (error) {
    console.error('Error fetching bot metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bot metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
