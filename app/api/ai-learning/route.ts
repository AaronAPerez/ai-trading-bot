import { NextRequest, NextResponse } from 'next/server'
import { tradeFeedbackSystem } from '@/lib/ai/TradeFeedbackSystem'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type') || 'metrics'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'metrics':
        const metrics = await tradeFeedbackSystem.getLearningMetrics(userId, symbol || undefined)
        return NextResponse.json({ metrics })

      case 'strategy-performance':
        const strategyPerformance = await tradeFeedbackSystem.getStrategyPerformance(userId)
        return NextResponse.json({ strategyPerformance })

      case 'confidence-thresholds':
        if (!symbol) {
          return NextResponse.json(
            { error: 'symbol parameter is required for confidence thresholds' },
            { status: 400 }
          )
        }
        const thresholds = await tradeFeedbackSystem.getImprovedConfidenceThresholds(userId, symbol)
        return NextResponse.json({ thresholds })

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('AI Learning API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tradeResult, userId } = body

    if (!tradeResult || !userId) {
      return NextResponse.json(
        { error: 'tradeResult and userId are required' },
        { status: 400 }
      )
    }

    await tradeFeedbackSystem.recordTradeOutcome(tradeResult, userId)

    return NextResponse.json({
      success: true,
      message: 'Trade outcome recorded successfully'
    })

  } catch (error) {
    console.error('Trade outcome recording error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}