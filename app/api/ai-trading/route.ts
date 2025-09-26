// AI Trading API (Request Handling)

import { TradingEngineFactory, TradingEngineManager } from '@/lib/trading/factories/TradingEngineFactory'
import { validateTradingRequest } from '@/lib/utils/validators'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateTradingRequest(body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    
    const { action, config } = body
    
    switch (action) {
      case 'start':
        const engine = TradingEngineFactory.create(config)
        await engine.start()
        return NextResponse.json({ 
          success: true, 
          sessionId: engine.getSessionId() 
        })
        
      case 'stop':
        await TradingEngineManager.stop(config.sessionId)
        return NextResponse.json({ success: true })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}