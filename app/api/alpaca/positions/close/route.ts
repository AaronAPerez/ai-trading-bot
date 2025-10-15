import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * Close a single position or all positions
 * POST /api/alpaca/positions/close - Close single position
 * DELETE /api/alpaca/positions/close - Liquidate all positions
 */

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      )
    }

    console.log(`Closing position for ${symbol}...`)

    // Close position via Alpaca API
    await alpacaClient.closePosition(symbol)

    return NextResponse.json({
      success: true,
      message: `Successfully closed position for ${symbol}`,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error closing position:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to close position'
      },
      { status: error.statusCode || 500 }
    )
  }
}

export async function DELETE() {
  try {
    console.log('Liquidating all positions...')

    // Close all positions via Alpaca API
    const result = await alpacaClient.closeAllPositions()

    return NextResponse.json({
      success: true,
      message: 'Successfully liquidated all positions',
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error liquidating positions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to liquidate positions'
      },
      { status: error.statusCode || 500 }
    )
  }
}
