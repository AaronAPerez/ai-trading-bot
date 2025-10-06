import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'

/**
 * GET /api/alpaca/assets
 * Fetch available trading assets from Alpaca
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const assetClass = searchParams.get('asset_class') || 'us_equity'
  const status = searchParams.get('status') || 'active'

  const apiKey = process.env.NEXT_PUBLIC_APCA_API_KEY_ID
  const apiSecret = process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APCA_API_BASE_URL || 'https://paper-api.alpaca.markets'

  if (!apiKey || !apiSecret) {
    throw new Error('Alpaca API credentials not configured')
  }

  const url = new URL(`${baseUrl}/v2/assets`)
  url.searchParams.append('asset_class', assetClass)
  url.searchParams.append('status', status)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Alpaca API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data,
    count: data.length,
    timestamp: new Date().toISOString(),
  })
})
