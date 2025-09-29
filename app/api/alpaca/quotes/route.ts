import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/alpaca/quotes
 * Fetch latest quotes for specified symbols with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')?.split(',') || ['AAPL']

  const quotes = await alpacaClient.getQuotes(symbols)

  return NextResponse.json({
    success: true,
    data: quotes,
    timestamp: new Date().toISOString(),
  })
})


