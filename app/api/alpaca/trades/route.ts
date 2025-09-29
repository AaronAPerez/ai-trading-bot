import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/alpaca/trades
 * Fetch trade activities with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const page_token = searchParams.get('page_token')
  const asof = searchParams.get('asof')
  const until = searchParams.get('until')
  const direction = searchParams.get('direction') || 'desc'

  const trades = await alpacaClient.getActivities('FILL', {
    limit,
    page_token,
    asof,
    until,
    direction,
  })

  return NextResponse.json({
    success: true,
    data: trades,
    timestamp: new Date().toISOString(),
  })
})