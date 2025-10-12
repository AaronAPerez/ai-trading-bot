import { NextRequest, NextResponse } from 'next/server'
import { HedgeFundEngine } from '@/lib/hedge-fund-engine/HedgeFundEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/hedge-fund/run-cycle
 *
 * Run a complete hedge fund trading cycle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      symbol,
      strategy,
      userId = 'test-user',
      mode = 'paper',
      positionSize,
      notionalAmount,
      dryRun = false
    } = body

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    // Initialize hedge fund engine
    const engine = new HedgeFundEngine({
      userId,
      mode: mode as 'paper' | 'live',
      sessionId: `session-${Date.now()}`
    })

    // Run trading cycle
    const result = await engine.runCycle({
      symbol,
      strategy,
      userId,
      mode: mode as 'paper' | 'live',
      positionSize,
      notionalAmount,
      useNotional: !!notionalAmount,
      dryRun,
      stopLoss: true,
      takeProfit: true,
      orderType: 'market',
      timeInForce: 'gtc'
    })

    return NextResponse.json({
      success: result.status === 'executed',
      ...result
    })

  } catch (error: any) {
    console.error('❌ Hedge fund cycle failed:', error)
    return NextResponse.json(
      {
        error: error.message || 'Cycle execution failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
