// import { NextRequest, NextResponse } from 'next/server'
// import { AlpacaServerClient } from '@/lib/alpaca/server-client'

// export async function GET(request: NextRequest) {
//   try {
//     const alpacaClient = new AlpacaServerClient()
//     const account = await alpacaClient.getAccount()
    
//     return NextResponse.json(account)
//   } catch (error) {
//     console.error('Account API error:', error)
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : 'Failed to fetch account data' },
//       { status: 500 }
//     )
//   }
// }
import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alpacaClient = new AlpacaClient({
      key: process.env.ALPACA_API_KEY!,
      secret: process.env.ALPACA_SECRET_KEY!,
      paper: process.env.ALPACA_PAPER === 'true'
    })

    const account = await alpacaClient.getAccount()
    const positions = await alpacaClient.getPositions()

    // Calculate additional metrics
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
    const totalInvested = positions.reduce((sum, pos) => sum + (pos.avgBuyPrice * pos.quantity), 0)

    const enhancedAccount = {
      ...account,
      investedAmount: totalInvested,
      dayPnL: totalPnL, // You might want to calculate this differently
      totalPnL: totalPnL,
      totalReturn: totalInvested > 0 ? (totalPnL / totalInvested) : 0,
      dayReturn: 0, // Calculate based on day's changes
      riskScore: Math.abs(totalPnL) / Math.max(account.totalBalance, 1) * 100
    }

    return NextResponse.json(enhancedAccount)
  } catch (error) {
    console.error('Account API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account data' },
      { status: 500 }
    )
  }
}