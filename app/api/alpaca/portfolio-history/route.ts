import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'

/**
 * GET /api/alpaca/portfolio-history
 * Fetch Alpaca portfolio history for charts
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '1D'
  const timeframe = searchParams.get('timeframe') || '5Min'

  const apiKey = process.env.NEXT_PUBLIC_APCA_API_KEY_ID
  const apiSecret = process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APCA_API_BASE_URL || 'https://paper-api.alpaca.markets'

  if (!apiKey || !apiSecret) {
    throw new Error('Alpaca API credentials not configured')
  }

  const response = await fetch(
    `${baseUrl}/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}`,
    {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Alpaca API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  })
})
