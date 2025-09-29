import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/alpaca/positions
 * Fetch account positions with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const positions = await alpacaClient.getPositions()

  return NextResponse.json({
    success: true,
    data: positions,
    timestamp: new Date().toISOString(),
  })
})