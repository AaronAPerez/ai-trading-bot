export class TradingLogger {
  static logTrade(trade: {
    symbol: string
    action: 'BUY' | 'SELL'
    quantity: number
    price: number
    strategy: string
    confidence: number
    timestamp: Date
  }) {
    const logEntry = {
      type: 'TRADE_EXECUTION',
      ...trade,
      environment: process.env.NODE_ENV,
      accountType: process.env.ALPACA_PAPER === 'true' ? 'PAPER' : 'LIVE'
    }
    
    console.log('🔄 Trade Executed:', JSON.stringify(logEntry, null, 2))
    
    // In production, send to monitoring service
    // await this.sendToMonitoring(logEntry)
  }
  
  static logBotAction(action: string, details: any) {
    const logEntry = {
      type: 'BOT_ACTION',
      action,
      details,
      timestamp: new Date(),
      environment: process.env.NODE_ENV
    }
    
    console.log('🤖 Bot Action:', JSON.stringify(logEntry, null, 2))
  }
  
  static logError(error: Error, context: string) {
    const logEntry = {
      type: 'ERROR',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      environment: process.env.NODE_ENV
    }
    
    console.error('❌ Error:', JSON.stringify(logEntry, null, 2))
  }
}