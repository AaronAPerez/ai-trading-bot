import { NextRequest, NextResponse } from 'next/server'
import { ensembleMLSystem } from '@/lib/ml/EnsembleMLSystem'
import { getCurrentUserId } from '@/lib/auth/demo-user'

/**
 * GET /api/ml/metrics
 * Returns comprehensive ML system metrics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId()

    // Get ML metrics from ensemble system
    const metrics = await ensembleMLSystem.getMetrics(userId)

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ ML Metrics API Error:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch ML metrics',
      metrics: null
    }, { status: 500 })
  }
}

/**
 * POST /api/ml/metrics
 * Update ML system with trade outcome for learning
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tradeId,
      symbol,
      entryPrice,
      exitPrice,
      profitLoss,
      prediction
    } = body

    if (!tradeId || !symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: tradeId, symbol'
      }, { status: 400 })
    }

    // Learn from trade outcome
    await ensembleMLSystem.learnFromTrade(
      tradeId,
      symbol,
      entryPrice,
      exitPrice,
      profitLoss,
      prediction
    )

    return NextResponse.json({
      success: true,
      message: 'ML system updated with trade outcome',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ ML Learning API Error:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update ML system'
    }, { status: 500 })
  }
}
