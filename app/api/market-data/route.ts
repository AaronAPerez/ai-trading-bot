import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      )
    }

    const alpacaClient = new AlpacaServerClient()
    const quotes = await alpacaClient.getLatestQuotes(symbols)
    
    // Determine market status
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    
    let marketStatus: 'OPEN' | 'CLOSED' | 'PRE' | 'POST' = 'CLOSED'
    if (currentDay >= 1 && currentDay <= 5) {
      if (currentHour >= 9 && currentHour < 16) {
        marketStatus = 'OPEN'
      } else if (currentHour >= 4 && currentHour < 9) {
        marketStatus = 'PRE'
      } else {
        marketStatus = 'POST'
      }
    }
    
    return NextResponse.json({
      quotes,
      marketStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Market data API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}