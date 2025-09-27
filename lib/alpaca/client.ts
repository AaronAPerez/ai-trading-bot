import Alpaca from '@alpacahq/alpaca-trade-api'
import { alpacaRateLimiter } from './rate-limiter'

export interface AlpacaConfig {
  key: string
  secret: string
  paper: boolean
  baseUrl?: string
}

export class AlpacaClient {
  private client: Alpaca
  private config: AlpacaConfig

  constructor(config: AlpacaConfig) {
    this.config = config
    // Updated to modern Alpaca SDK initialization pattern
    this.client = new Alpaca({
      key: config.key,
      secret: config.secret,
      paper: config.paper,
      ...(config.baseUrl && { baseUrl: config.baseUrl })
    })
  }

  // Account methods with rate limiting
  async getAccount() {
    return alpacaRateLimiter.enqueue(
      '/v2/account',
      async () => {
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
      },
      'high', // High priority for account data
      'account_data',
      10000 // Cache for 10 seconds
    )
  }

  // Position methods with rate limiting
  async getPositions() {
    return alpacaRateLimiter.enqueue(
      '/v2/positions',
      async () => {
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
      },
      'normal',
      'positions_data',
      5000 // Cache for 5 seconds
    )
  }

  // Historical data methods
  async getBarsV2(symbol: string, options: {
    timeframe: string
    limit?: number
    start?: Date
    end?: Date
    adjustment?: string
  }) {
    try {
      const bars = await this.client.getBarsV2(symbol, {
        timeframe: options.timeframe,
        limit: options.limit || 100,
        start: options.start,
        end: options.end,
        adjustment: options.adjustment || 'raw'
      })
      return bars
    } catch (error) {
      console.error('Alpaca bars fetch error:', error)
      throw new Error(`Failed to fetch bars for ${symbol}`)
    }
  }

  // Order methods with rate limiting
  async createOrder(orderData: {
    symbol: string
    qty?: number
    notional?: number
    side: 'buy' | 'sell'
    type?: 'market' | 'limit' | 'stop'
    time_in_force?: 'day' | 'gtc'
    limit_price?: number
    stop_price?: number
    client_order_id?: string
  }) {
    return alpacaRateLimiter.enqueue(
      '/v2/orders',
      async () => {
        try {
          const order = await this.client.createOrder({
            symbol: orderData.symbol,
            qty: orderData.qty,
            notional: orderData.notional,
            side: orderData.side,
            type: orderData.type || 'market',
            time_in_force: orderData.time_in_force || 'day',
            limit_price: orderData.limit_price,
            stop_price: orderData.stop_price,
            client_order_id: orderData.client_order_id
          })
          return {
            id: order.id,
            symbol: order.symbol,
            quantity: parseFloat(order.qty),
            side: order.side,
            status: order.status,
            filledAt: order.filled_at ? new Date(order.filled_at) : null,
            filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null
          }
        } catch (error: any) {
          console.error('Alpaca order creation error:', error)
          console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers
            }
          })
          throw new Error(`Failed to create order with Alpaca: ${error.response?.status} ${error.response?.statusText}`)
        }
      },
      'high', // High priority for order execution
      undefined, // No caching for order creation
      0
    )
  }

  // Market data methods with rate limiting
  async getLatestQuotes(symbols: string[]) {
    const cacheKey = `quotes_${symbols.sort().join(',')}`

    return alpacaRateLimiter.enqueue(
      '/v2/stocks/quotes/latest',
      async () => {
        try {
          const quotes = await this.client.getLatestQuotes(symbols)
          const result: Record<string, any> = {}

          Object.entries(quotes).forEach(([symbol, quote]: [string, any]) => {
            // Handle different possible quote formats from Alpaca API
            const bidPrice = quote.bp || quote.BidPrice || 0
            const askPrice = quote.ap || quote.AskPrice || 0
            const bidSize = quote.bs || quote.BidSize || 0
            const askSize = quote.as || quote.AskSize || 0
            const timestamp = quote.t || quote.Timestamp || Date.now()

            result[symbol] = {
              symbol,
              bidPrice,
              askPrice,
              bidSize,
              askSize,
              timestamp: new Date(timestamp),
              spread: askPrice - bidPrice,
              midPrice: (askPrice + bidPrice) / 2
            }
          })

          return result
        } catch (error) {
          console.error('Market data fetch error:', error)
          throw new Error('Failed to fetch market data')
        }
      },
      'normal',
      cacheKey,
      2000 // Cache quotes for 2 seconds (real-time data should be fresh)
    )
  }

  // Additional utility methods for modern API compatibility
  getConnectionStatus() {
    return {
      connected: true,
      status: 'active',
      lastCheck: new Date()
    }
  }

  getConfig() {
    return {
      key: this.config.key,
      secret: this.config.secret,
      paper: this.config.paper
    }
  }

  isDemoModeActive() {
    // For this implementation, we're always using real Alpaca API
    // This method is included for compatibility with the market data service
    return false
  }

  // Enhanced order method with better return typing
  async createOrderEnhanced(orderData: {
    symbol: string
    qty?: number
    notional?: number
    side: 'buy' | 'sell'
    type?: 'market' | 'limit' | 'stop'
    time_in_force?: 'day' | 'gtc'
    limit_price?: number
    stop_price?: number
    client_order_id?: string
  }) {
    const order = await this.createOrder(orderData)
    return {
      ...order,
      price: order.filledPrice || 0,
      filled_avg_price: order.filledPrice
    }
  }
}