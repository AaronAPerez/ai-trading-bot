import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'

export async function GET(request: NextRequest) {
  try {
    const alpacaClient = new AlpacaClient({
      key: process.env.ALPACA_API_KEY!,
      secret: process.env.ALPACA_SECRET_KEY!,
      paper: process.env.ALPACA_PAPER === 'true'
    })

    const positions = await alpacaClient.getPositions()
    
    // Transform positions to live trades format
    const liveTrades = positions.map(position => ({
      id: `pos_${position.symbol}_${Date.now()}`,
      symbol: position.symbol,
      action: position.side === 'long' ? 'BUY' : 'SELL',
      entryPrice: position.avgBuyPrice,
      currentPrice: position.currentPrice,
      quantity: position.quantity,
      entryTime: new Date(), // You'd store this in your database
      stopLoss: position.avgBuyPrice * (position.side === 'long' ? 0.95 : 1.05),
      takeProfit: position.avgBuyPrice * (position.side === 'long' ? 1.10 : 0.90),
      unrealizedPnL: position.unrealizedPnL,
      confidence: 85, // This would come from your AI system
      strategy: 'AI Momentum', // This would come from your AI system
      status: 'OPEN',
      maxProfit: Math.max(position.unrealizedPnL, 0),
      maxDrawdown: Math.min(position.unrealizedPnL, 0),
      holdingPeriod: Math.floor(Math.random() * 240) // Minutes
    }))

    return NextResponse.json(liveTrades)
  } catch (error) {
    console.error('Live trades API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live trades' },
      { status: 500 }
    )
  }
}