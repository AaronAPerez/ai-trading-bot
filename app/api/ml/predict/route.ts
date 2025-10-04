import { NextRequest, NextResponse } from 'next/server'
import { ensembleMLSystem } from '@/lib/ml/EnsembleMLSystem'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { MarketData } from '@/types/trading'

/**
 * POST /api/ml/predict
 * Generate ML prediction for a symbol using ensemble models
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, timeframe = '1Hour', limit = 100 } = body

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol is required'
      }, { status: 400 })
    }

    console.log(`🤖 ML Prediction request for ${symbol}`)

    // 1. Fetch market data from Alpaca
    const barsResponse = await alpacaClient.getBarsV2(symbol, {
      timeframe,
      limit,
      end: new Date().toISOString()
    })

    if (!barsResponse.bars || barsResponse.bars.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No market data available for ${symbol}`
      }, { status: 404 })
    }

    // Convert to MarketData format
    const marketData: MarketData[] = barsResponse.bars.map((bar: any) => ({
      timestamp: new Date(bar.t).toISOString(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      symbol
    }))

    // 2. Get current account state
    const account = await alpacaClient.getAccount()
    const positions = await alpacaClient.getPositions()

    const currentPosition = positions.find((p: any) => p.symbol === symbol)

    const currentState = {
      price: marketData[marketData.length - 1].close,
      volume: marketData[marketData.length - 1].volume,
      volatility: calculateVolatility(marketData),
      portfolio: {
        cash: parseFloat(account.cash || '0'),
        position: currentPosition ? parseFloat(currentPosition.qty || '0') : 0,
        unrealizedPnL: currentPosition ? parseFloat(currentPosition.unrealized_pl || '0') : 0
      }
    }

    // 3. Generate ensemble ML prediction
    const prediction = await ensembleMLSystem.generatePrediction(
      symbol,
      marketData,
      currentState
    )

    return NextResponse.json({
      success: true,
      prediction,
      symbol,
      currentPrice: currentState.price,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ ML Prediction API Error:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate ML prediction',
      prediction: null
    }, { status: 500 })
  }
}

// Helper function
function calculateVolatility(marketData: MarketData[]): number {
  if (marketData.length < 2) return 0

  const returns = []
  for (let i = 1; i < marketData.length; i++) {
    returns.push((marketData[i].close - marketData[i - 1].close) / marketData[i - 1].close)
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length

  return Math.sqrt(variance)
}
