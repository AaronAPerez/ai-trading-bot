import { AlpacaRateLimiter } from './rate-limiter'

const rateLimiter = new AlpacaRateLimiter()

export async function makeAlpacaRequest(endpoint: string, options?: RequestInit) {
  return rateLimiter.enqueue(
    endpoint,
    async () => {
      const response = await fetch(`https://paper-api.alpaca.markets${endpoint}`, {
        ...options,
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!,
          ...options?.headers,
        },
      })
      return response.json()
    },
    'normal'
  )
}
import Alpaca from '@alpacahq/alpaca-trade-api'
import { alpacaRateLimiter } from './rate-limiter'

export class AlpacaServerClient {
  private client: Alpaca | null = null

  constructor() {
    if (typeof window === 'undefined') {
      try {
        const apiKey = process.env.APCA_API_KEY_ID
        const secretKey = process.env.APCA_API_SECRET_KEY
        const paperMode = process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'

        console.log('🔧 AlpacaServerClient initializing with:', {
          apiKeyExists: !!apiKey,
          apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
          secretExists: !!secretKey,
          secretPreview: secretKey ? `${secretKey.substring(0, 8)}...` : 'missing',
          paperMode
        })

        // Validate API keys exist BEFORE initializing Alpaca SDK
        if (!apiKey || !secretKey) {
          console.warn('⚠️ Alpaca API credentials not found - client will be unavailable')
          console.warn('   Set APCA_API_KEY_ID and APCA_API_SECRET_KEY environment variables')
          this.client = null
          return
        }

        // Updated to modern Alpaca SDK initialization pattern
        this.client = new Alpaca({
          key: apiKey,
          secret: secretKey,
          paper: paperMode
        })

        console.log('✅ AlpacaServerClient initialized successfully - Ready for API calls')
      } catch (error) {
        console.warn('Failed to initialize Alpaca client:', error)
        // Continue with null client - will use mock data
      }
    }
  }

  async getAccount() {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    return alpacaRateLimiter.enqueue(
      '/v2/account',
      async () => {
        try {
          return await this.client!.getAccount()
        } catch (error: any) {
          console.error('Failed to get account from Alpaca:', error)
          console.error('Account API error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            headers: error.config?.headers
          })
          throw new Error(`Alpaca API error: ${error.message}`)
        }
      },
      'high',
      'server_account_data',
      8000 // Cache for 8 seconds
    )
  }

  async getLatestQuote(params: { symbols: string }) {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    try {
      // Get real data from Alpaca using modern API
      const quotes = await this.client.getLatestQuotes([params.symbols])
      if (quotes && quotes.size > 0) {
        const result = {}
        quotes.forEach((quote, symbol) => {
          result[symbol] = {
            ask: quote.AskPrice || quote.ap || 0,
            bid: quote.BidPrice || quote.bp || 0,
            askSize: quote.AskSize || quote.as || 0,
            bidSize: quote.BidSize || quote.bs || 0,
            timestamp: new Date(quote.Timestamp || quote.t || Date.now())
          }
        })
        return { quotes: result }
      }
      throw new Error(`No quote data available for ${params.symbols}`)
    } catch (error) {
      console.error(`Failed to get quote for ${params.symbols} from Alpaca:`, error)
      throw new Error(`Alpaca quote API error: ${error.message}`)
    }
  }

  // Add modern getLatestQuotes method for consistency
  async getLatestQuotes(symbols: string[]) {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    try {
      const quotes = await this.client.getLatestQuotes(symbols)
      const result: Record<string, any> = {}

      if (quotes && quotes.size > 0) {
        quotes.forEach((quote, symbol) => {
          result[symbol] = {
            symbol,
            bidPrice: quote.BidPrice || quote.bp || 0,
            askPrice: quote.AskPrice || quote.ap || 0,
            bidSize: quote.BidSize || quote.bs || 0,
            askSize: quote.AskSize || quote.as || 0,
            timestamp: new Date(quote.Timestamp || quote.t || Date.now()),
            spread: (quote.AskPrice || quote.ap || 0) - (quote.BidPrice || quote.bp || 0),
            midPrice: ((quote.AskPrice || quote.ap || 0) + (quote.BidPrice || quote.bp || 0)) / 2
          }
        })
      }

      return result
    } catch (error) {
      console.error('Failed to get quotes from Alpaca:', error)
      throw new Error(`Alpaca quotes API error: ${error.message}`)
    }
  }

  async getPositions() {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    return alpacaRateLimiter.enqueue(
      '/v2/positions',
      async () => {
        try {
          const positions = await this.client!.getPositions()
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
        } catch (error: any) {
          console.error('Failed to get positions from Alpaca:', error)
          console.error('Positions API error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            headers: error.config?.headers
          })
          throw new Error(`Alpaca positions API error: ${error.message}`)
        }
      },
      'normal',
      'server_positions_data',
      5000 // Cache for 5 seconds
    )
  }

  async getBarsV2(symbol: string, options: any) {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    return alpacaRateLimiter.enqueue(
      `/v2/stocks/${symbol}/bars`,
      async () => {
        try {
          return await this.client!.getBarsV2(symbol, options)
        } catch (error: any) {
          console.error(`Failed to get bars for ${symbol} from Alpaca:`, error)
          console.error('Bars API error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            headers: error.config?.headers
          })
          throw new Error(`Alpaca bars API error: ${error.message}`)
        }
      },
      'normal',
      `server_bars_${symbol}`,
      60000 // Cache for 60 seconds
    )
  }

  async createOrder(orderData: {
    symbol: string
    notional?: number
    qty?: number
    side: string
    type: string
    time_in_force: string
    client_order_id?: string
  }) {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    return alpacaRateLimiter.enqueue(
      '/v2/orders',
      async () => {
        try {
          console.log('📤 Creating order via Alpaca SDK:', orderData)
          const order = await this.client!.createOrder(orderData)
          console.log('✅ Order created successfully:', order.id)
          return order
        } catch (error: any) {
          console.error('❌ Failed to create order:', error)
          console.error('Order API error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          })

          // Provide helpful error messages for common issues
          const errorMessage = error.message || error.response?.data?.message || 'Unknown error'

          if (errorMessage.includes('crypto orders not allowed')) {
            throw new Error('Crypto trading is not enabled for this Alpaca account. Please enable crypto trading in your Alpaca dashboard or use stock symbols instead.')
          }

          throw new Error(`Alpaca order API error: ${errorMessage}`)
        }
      },
      'high',
      undefined, // No cache for order creation
      0
    )
  }
}

// Export singleton instance
let alpacaInstance: AlpacaServerClient | null = null

export function getAlpacaClient(): AlpacaServerClient {
  if (!alpacaInstance) {
    alpacaInstance = new AlpacaServerClient()
  }
  return alpacaInstance
}