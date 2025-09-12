import Alpaca from '@alpacahq/alpaca-trade-api'

export interface AlpacaConfig {
  key: string
  secret: string
  paper: boolean
  baseUrl?: string
}

export class AlpacaClient {
  private client: Alpaca
  private config: AlpacaConfig
  isDemoModeActive: any
  getConfig: any
  getConnectionStatus: any
  getBarsV2: any

  constructor(config: AlpacaConfig) {
    this.config = config
    this.client = new Alpaca({
      key: config.key,
      secret: config.secret,
      paper: config.paper,
      baseUrl: config.baseUrl
    })
  }

  // Account methods
  async getAccount() {
    try {
      const account = await this.client.getAccount()
      return {
        id: account.id,
        accountType: this.config.paper ? 'PAPER' : 'LIVE',
        totalBalance: parseFloat(account.portfolio_value),
        cashBalance: parseFloat(account.cash),
        availableBuyingPower: parseFloat(account.buying_power),
        dayTradingBuyingPower: parseFloat(account.daytrading_buying_power),
        dayTradeCount: parseInt(account.daytrade_count),
        patternDayTrader: account.pattern_day_trader,
        tradingEnabled: account.trading_blocked === false,
        isConnected: true
      }
    } catch (error) {
      console.error('Alpaca account fetch error:', error)
      throw new Error('Failed to fetch account data from Alpaca')
    }
  }

  // Position methods
  async getPositions() {
    try {
      const positions = await this.client.getPositions()
      return positions.map(position => ({
        symbol: position.symbol,
        quantity: parseFloat(position.qty),
        avgBuyPrice: parseFloat(position.avg_cost),
        currentPrice: parseFloat(position.market_value) / parseFloat(position.qty),
        marketValue: parseFloat(position.market_value),
        unrealizedPnL: parseFloat(position.unrealized_pl),
        unrealizedPnLPercent: parseFloat(position.unrealized_plpc) * 100,
        side: position.side as 'long' | 'short'
      }))
    } catch (error) {
      console.error('Alpaca positions fetch error:', error)
      throw new Error('Failed to fetch positions from Alpaca')
    }
  }

  // Order methods
  async createOrder(orderData: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    time_in_force: 'day' | 'gtc'
    limit_price?: number
    stop_price?: number
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
        filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null
      }
    } catch (error) {
      console.error('Alpaca order creation error:', error)
      throw new Error('Failed to create order with Alpaca')
    }
  }

  // Market data methods
  async getLatestQuotes(symbols: string[]) {
    try {
      const quotes = await this.client.getLatestQuotes(symbols)
      const result: Record<string, any> = {}
      
      Object.entries(quotes).forEach(([symbol, quote]) => {
        result[symbol] = {
          symbol,
          bidPrice: quote.bp,
          askPrice: quote.ap,
          bidSize: quote.bs,
          askSize: quote.as,
          timestamp: new Date(quote.t),
          spread: quote.ap - quote.bp,
          midPrice: (quote.ap + quote.bp) / 2
        }
      })
      
      return result
    } catch (error) {
      console.error('Market data fetch error:', error)
      throw new Error('Failed to fetch market data')
    }
  }
}