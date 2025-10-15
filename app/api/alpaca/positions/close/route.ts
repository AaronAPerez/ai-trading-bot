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

    console.log(`🔄 Closing position for ${symbol}...`)

    // Close position via Alpaca API
    const result = await alpacaClient.closePosition(symbol)

    console.log(`✅ Position closed successfully for ${symbol}:`, result)

    return NextResponse.json({
      success: true,
      message: `Successfully closed position for ${symbol}`,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error(`❌ Error closing position for ${symbol}:`, {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })

    // Provide more helpful error messages
    let userMessage = error.message || 'Failed to close position'

    if (error.statusCode === 403) {
      userMessage = 'Unable to close position. This may be a paper trading account limitation or the position may not exist.'
    } else if (error.statusCode === 404) {
      userMessage = `Position for ${symbol} not found. It may have already been closed.`
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        details: error.message
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
