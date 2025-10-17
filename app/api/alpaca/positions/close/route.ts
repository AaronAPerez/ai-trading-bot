import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * Close a single position or all positions
 * POST /api/alpaca/positions/close - Close single position
 * DELETE /api/alpaca/positions/close - Liquidate all positions
 */

export async function POST(request: NextRequest) {
  let symbol = 'unknown'

  try {
    const body = await request.json()
    symbol = body.symbol

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
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    })

    // Provide more helpful error messages
    let userMessage = error.message || 'Failed to close position'
    let technicalDetails = error.message

    if (error.statusCode === 403) {
      // Check for specific 403 error types
      if (error.message?.includes('pattern day trading') || error.message?.includes('PDT')) {
        userMessage = `Cannot close ${symbol} - Pattern Day Trading (PDT) protection`
        technicalDetails = `Alpaca blocks same-day trades (day trading) when account equity < $25,000.\n\n` +
          `Your account: $${error.accountEquity || '< 25,000'}\n` +
          `Solution: Wait until tomorrow to close this position, or disable PDT protection in Alpaca settings.`
      } else if (error.message?.includes('fractional')) {
        userMessage = `Cannot close ${symbol} - position contains fractional shares`
        technicalDetails = `Alpaca API doesn't support closing fractional shares. Close manually in dashboard.`
      } else if (error.message?.includes('not found')) {
        userMessage = `Position ${symbol} not found or already closed`
      } else {
        userMessage = `Alpaca denied closing ${symbol}: ${error.message}`
        technicalDetails = `API Error Code: ${error.code || 'unknown'}\nTry closing manually in Alpaca dashboard.`
      }
    } else if (error.statusCode === 404) {
      userMessage = `Position for ${symbol} not found. It may have already been closed.`
    } else if (error.statusCode === 422) {
      userMessage = `Invalid request to close ${symbol}: ${error.message}`
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        details: technicalDetails,
        alpacaError: error.message,
        statusCode: error.statusCode
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
