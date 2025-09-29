import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/alpaca/clock
 * Fetch market clock information with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const clockData = await alpacaClient.getClock()

  return NextResponse.json({
    success: true,
    data: clockData,
    timestamp: new Date().toISOString(),
  })
})