import { NextRequest, NextResponse } from 'next/server'
import { alpacaClient } from '@/lib/alpaca/unified-client'

export async function GET(request: NextRequest) {
  try {
    const assets = await alpacaClient.getCryptoAssets()

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching crypto assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto assets', assets: [] },
      { status: 500 }
    )
  }
}
