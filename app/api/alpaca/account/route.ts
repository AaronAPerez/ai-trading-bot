import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * GET /api/alpaca/account
 * Fetch Alpaca account information with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const accountData = await alpacaClient.getAccount()

  return NextResponse.json({
    success: true,
    data: accountData,
    timestamp: new Date().toISOString(),
  })
})