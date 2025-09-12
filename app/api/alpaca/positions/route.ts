import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'

export async function GET(request: NextRequest) {
  try {
    const alpacaClient = new AlpacaServerClient()
    const positions = await alpacaClient.getPositions()
    
    return NextResponse.json(positions)
  } catch (error) {
    console.error('Positions API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}