import Alpaca from '@alpacahq/alpaca-trade-api'

export class AlpacaServerClient {
  private client: Alpaca

constructor() {
  console.log('Alpaca Config Check:')
  console.log('API Key:', process.env.APCA_API_KEY_ID ? `${process.env.APCA_API_KEY_ID.substring(0, 10)}...` : 'MISSING')
  console.log('Secret Key:', process.env.APCA_API_SECRET_KEY ? 'Present' : 'MISSING')
  console.log('Paper Mode:', process.env.NEXT_PUBLIC_TRADING_MODE)

  if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
    throw new Error('Alpaca API keys are missing from environment variables')
  }

  this.client = new Alpaca({
    key: process.env.APCA_API_KEY_ID,
    secret: process.env.APCA_API_SECRET_KEY,
    paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper',
    usePolygon: false
  })
}

  // Account operations
async getAccount() {
  try {
    const account = await this.client.getAccount()
    return {
      accountType: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper' ? 'PAPER' : 'LIVE',
      totalBalance: parseFloat(account.portfolio_value),
      cashBalance: parseFloat(account.cash),
      availableBuyingPower: parseFloat(account.buying_power),
      dayTradingBuyingPower: parseFloat(account.daytrading_buying_power),
      dayTradeCount: parseInt(account.daytrade_count),
      patternDayTrader: account.pattern_day_trader,
      tradingEnabled: !account.trading_blocked,
      isConnected: true,
      investedAmount: parseFloat(account.portfolio_value) - parseFloat(account.cash)
    }
  } catch (error) {
    console.error('Alpaca account error:', error)
    
    // Check if it's an authentication error
    if (error.message?.includes('401') || error.message?.includes('code: 401')) {
      throw new Error('Authentication failed: Check your Alpaca API keys in .env.local')
    }
    
    throw new Error(`Failed to fetch account from Alpaca: ${error.message}`)
  }
}

  // Position operations
  async getPositions() {
    try {
      const positions = await this.client.getPositions()
      return positions.map(pos => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        avgBuyPrice: parseFloat(pos.avg_cost),
        currentPrice: parseFloat(pos.market_value) / Math.abs(parseFloat(pos.qty)),
        marketValue: parseFloat(pos.market_value),
        unrealizedPnL: parseFloat(pos.unrealized_pl),
        unrealizedPnLPercent: parseFloat(pos.unrealized_plpc) * 100,
        side: parseFloat(pos.qty) > 0 ? 'long' : 'short' as 'long' | 'short'
      }))
    } catch (error) {
      console.error('Alpaca positions error:', error)
      
      // Check if it's an authentication error
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('code: 401'))) {
        throw new Error('Authentication failed: Check your Alpaca API keys in .env.local')
      }
      
      throw new Error(`Failed to fetch positions from Alpaca: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Market data operations
  async getLatestQuotes(symbols: string[]) {
    try {
      console.log('Fetching quotes for symbols:', symbols)

      // Try different methods to get market data
      let quotes: any = {}

      try {
        // Method 1: Try latest quotes (real-time)
        quotes = await this.client.getLatestQuotes(symbols)
        console.log('Latest quotes response:', quotes)
      } catch (quotesError) {
        console.log('Latest quotes failed, trying bars method:', quotesError.message)

        // Method 2: Try recent bars as fallback
        try {
          const endDate = new Date()
          const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

          for (const symbol of symbols) {
            try {
              const bars = await this.client.getBarsV2(symbol, {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                timeframe: '1Day',
                limit: 1
              })

              console.log(`Bars for ${symbol}:`, bars)

              if (bars && bars.length > 0) {
                const latestBar = bars[bars.length - 1]
                quotes[symbol] = {
                  ap: latestBar.c, // Use close as ask
                  bp: latestBar.c * 0.999, // Simulate bid slightly lower
                  t: latestBar.t,
                  s: latestBar.v
                }
              }
            } catch (barError) {
              console.log(`Failed to get bars for ${symbol}:`, barError.message)
            }
          }
        } catch (barsError) {
          console.log('Bars method also failed:', barsError.message)
        }
      }

      const result: Record<string, any> = {}

      // Handle both Map (from getLatestQuotes) and Object (from bars fallback)
      if (quotes instanceof Map) {
        quotes.forEach((quote: any, symbol: string) => {
          const bidPrice = quote.BidPrice || 0
          const askPrice = quote.AskPrice || 0
          const timestamp = quote.Timestamp || Date.now()

          result[symbol] = {
            symbol,
            bidPrice,
            askPrice,
            midPrice: ((askPrice + bidPrice) / 2) || askPrice || bidPrice,
            timestamp: new Date(timestamp),
            spread: askPrice - bidPrice,
            volume: 0, // Volume not available in latest quotes
            dailyChangePercent: 0
          }
        })
      } else {
        // Handle Object format (bars fallback)
        Object.entries(quotes).forEach(([symbol, quote]) => {
          const q = quote as any
          const bidPrice = q.bp || 0
          const askPrice = q.ap || 0
          const timestamp = q.t || Date.now()
          const volume = q.s || 0

          result[symbol] = {
            symbol,
            bidPrice,
            askPrice,
            midPrice: ((askPrice + bidPrice) / 2) || askPrice || bidPrice,
            timestamp: new Date(timestamp),
            spread: askPrice - bidPrice,
            volume,
            dailyChangePercent: 0
          }
        })
      }

      console.log('Final processed quotes:', result)
      return result
    } catch (error) {
      console.error('Alpaca quotes error:', error)

      // Check if it's an authentication error
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('code: 401'))) {
        throw new Error('Authentication failed: Check your Alpaca API keys in .env.local')
      }

      throw new Error(`Failed to fetch quotes from Alpaca: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Order operations
  async createOrder(orderData: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    time_in_force: 'day' | 'gtc'
    limit_price?: number
  }) {
    try {
      const order = await this.client.createOrder(orderData)
      return {
        id: order.id,
        symbol: order.symbol,
        quantity: parseFloat(order.qty),
        side: order.side,
        status: order.status,
        filledAt: order.filled_at ? new Date(order.filled_at) : null,
        filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        createdAt: new Date(order.created_at)
      }
    } catch (error) {
      console.error('Alpaca order error:', error)
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get recent orders
  async getOrders(status?: 'open' | 'closed' | 'all', limit: number = 50) {
    try {
      const orders = await this.client.getOrders({ status, limit })
      return orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        quantity: parseFloat(order.qty),
        side: order.side,
        status: order.status,
        orderType: order.order_type,
        filledAt: order.filled_at ? new Date(order.filled_at) : null,
        filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        createdAt: new Date(order.created_at),
        timeInForce: order.time_in_force
      }))
    } catch (error) {
      console.error('Alpaca orders error:', error)
      throw new Error('Failed to fetch orders from Alpaca')
    }
  }
}