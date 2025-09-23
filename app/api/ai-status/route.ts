import { NextRequest, NextResponse } from 'next/server'

// Simple market hours check
function isMarketOpen(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  const hour = now.getHours()
  const minutes = now.getMinutes()
  const timeInMinutes = hour * 60 + minutes

  // Monday (1) to Friday (5)
  const isWeekday = day >= 1 && day <= 5

  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30  // 9:30 AM = 570 minutes
  const marketClose = 16 * 60     // 4:00 PM = 960 minutes

  const isMarketHours = timeInMinutes >= marketOpen && timeInMinutes < marketClose

  return isWeekday && isMarketHours
}

// Get time until next market open
function getTimeUntilMarketOpen(): number {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const minutes = now.getMinutes()

  // If it's weekend, calculate time until Monday 9:30 AM
  if (day === 0 || day === 6) { // Sunday or Saturday
    const daysUntilMonday = day === 0 ? 1 : 2
    const mondayMarketOpen = new Date(now)
    mondayMarketOpen.setDate(now.getDate() + daysUntilMonday)
    mondayMarketOpen.setHours(9, 30, 0, 0)
    return mondayMarketOpen.getTime() - now.getTime()
  }

  // If it's before 9:30 AM on weekday
  const timeInMinutes = hour * 60 + minutes
  const marketOpen = 9 * 60 + 30

  if (timeInMinutes < marketOpen) {
    const todayMarketOpen = new Date(now)
    todayMarketOpen.setHours(9, 30, 0, 0)
    return todayMarketOpen.getTime() - now.getTime()
  }

  // If it's after market close, next open is tomorrow 9:30 AM (or Monday if Friday)
  const nextDay = day === 5 ? 3 : 1 // If Friday, add 3 days to get Monday
  const nextMarketOpen = new Date(now)
  nextMarketOpen.setDate(now.getDate() + nextDay)
  nextMarketOpen.setHours(9, 30, 0, 0)
  return nextMarketOpen.getTime() - now.getTime()
}

// Format milliseconds to readable time
function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h ${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

// GET /api/ai-status - Comprehensive AI status dashboard
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const marketOpen = isMarketOpen()
    const timeUntilOpen = marketOpen ? 0 : getTimeUntilMarketOpen()

    // Get AI trading status
    let aiStatus = {
      running: false,
      session: null,
      marketDataStatus: []
    }

    try {
      const aiResponse = await fetch('http://localhost:3005/api/ai-trading')
      if (aiResponse.ok) {
        aiStatus = await aiResponse.json()
      }
    } catch (error) {
      console.log('AI Trading API not available:', error.message)
    }

    // Calculate trading activity status
    let tradingStatus = 'INACTIVE'
    let tradingMessage = 'AI not running'

    if (aiStatus.running) {
      if (marketOpen) {
        tradingStatus = 'ACTIVE'
        tradingMessage = 'AI active and trading enabled'
      } else {
        tradingStatus = 'IDLE'
        tradingMessage = 'AI running but market closed'
      }
    }

    // Market information
    const marketInfo = {
      isOpen: marketOpen,
      status: marketOpen ? 'OPEN' : 'CLOSED',
      timeUntilOpen: marketOpen ? null : formatTime(timeUntilOpen),
      timeUntilOpenMs: marketOpen ? null : timeUntilOpen,
      tradingHours: '9:30 AM - 4:00 PM ET',
      tradingDays: 'Monday - Friday'
    }

    // AI Engine information
    const aiInfo = {
      running: aiStatus.running,
      status: aiStatus.running ? 'RUNNING' : 'STOPPED',
      tradingStatus,
      tradingMessage,
      session: aiStatus.session ? {
        sessionId: aiStatus.session.sessionId,
        startTime: aiStatus.session.startTime,
        runtime: aiStatus.session.startTime ? Date.now() - new Date(aiStatus.session.startTime).getTime() : 0,
        tradesExecuted: aiStatus.session.tradesExecuted || 0,
        totalPnL: aiStatus.session.totalPnL || 0,
        aiPredictions: aiStatus.session.aiPredictions || 0,
        successfulPredictions: aiStatus.session.successfulPredictions || 0,
        accuracy: aiStatus.session.aiPredictions > 0
          ? (aiStatus.session.successfulPredictions / aiStatus.session.aiPredictions * 100).toFixed(1)
          : '0.0'
      } : null
    }

    // Configuration
    const configInfo = {
      minConfidenceThreshold: '75%',
      maxDailyTrades: 50,
      marketHoursOnly: true,
      paperTrading: true,
      autoExecutionEnabled: true,
      watchlistSize: 45
    }

    // Watchlist status
    const watchlistInfo = {
      totalSymbols: aiStatus.marketDataStatus?.length || 0,
      activeSymbols: aiStatus.marketDataStatus?.filter((s: any) => s.dataPoints > 0).length || 0,
      sampleSymbols: aiStatus.marketDataStatus?.slice(0, 5).map((s: any) => s.symbol) || []
    }

    // Overall system status
    const systemStatus = {
      overall: aiStatus.running ? (marketOpen ? 'TRADING' : 'READY') : 'OFFLINE',
      canTrade: aiStatus.running && marketOpen,
      nextAction: !aiStatus.running
        ? 'Start AI Trading Engine'
        : (!marketOpen ? 'Wait for market open' : 'Monitor for opportunities'),
      timestamp: now.toISOString()
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      market: marketInfo,
      ai: aiInfo,
      config: configInfo,
      watchlist: watchlistInfo,
      system: systemStatus
    })

  } catch (error) {
    console.error('AI Status API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get AI status',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}