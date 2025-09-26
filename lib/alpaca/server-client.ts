import Alpaca from '@alpacahq/alpaca-trade-api'

export class AlpacaServerClient {
  private client: Alpaca | null = null

  constructor() {
    if (typeof window === 'undefined') {
      try {
        this.client = new Alpaca({
          credentials: {
            key: process.env.ALPACA_API_KEY_ID || process.env.APCA_API_KEY_ID,
            secret: process.env.ALPACA_SECRET_KEY || process.env.APCA_API_SECRET_KEY,
            paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
          }
        })
      } catch (error) {
        console.warn('Failed to initialize Alpaca client:', error)
        // Continue with null client - will use mock data
      }
    }
  }

  async getAccount() {
    if (!this.client) {
      console.warn('Alpaca client not available, returning mock account')
      return {
        portfolio_value: '100000',
        cash: '50000',
        buying_power: '50000'
      }
    }

    try {
      return await this.client.getAccount()
    } catch (error) {
      console.warn('Failed to get account from Alpaca, returning mock data:', error)
      return {
        portfolio_value: '100000',
        cash: '50000',
        buying_power: '50000'
      }
    }
  }

  async getLatestQuote(params: { symbols: string }) {
    if (!this.client) {
      console.warn('Alpaca client not available, returning mock quote data')
      const mockPrice = Math.random() * 200 + 100
      return {
        quotes: {
          [params.symbols]: {
            ask: mockPrice,
            bid: mockPrice * 0.999,
            askSize: 100,
            bidSize: 100,
            timestamp: new Date()
          }
        }
      }
    }

    try {
      // Try to get real data from Alpaca
      const quotes = await this.client.getLatestQuotes([params.symbols])
      if (quotes && quotes.size > 0) {
        const result = {}
        quotes.forEach((quote, symbol) => {
          result[symbol] = {
            ask: quote.AskPrice || 0,
            bid: quote.BidPrice || 0,
            askSize: quote.AskSize || 0,
            bidSize: quote.BidSize || 0,
            timestamp: new Date(quote.Timestamp || Date.now())
          }
        })
        return { quotes: result }
      }
    } catch (error) {
      console.warn(`Failed to get quote for ${params.symbols} from Alpaca:`, error)
    }

    // Fallback to mock data
    const mockPrice = Math.random() * 200 + 100
    return {
      quotes: {
        [params.symbols]: {
          ask: mockPrice,
          bid: mockPrice * 0.999,
          askSize: 100,
          bidSize: 100,
          timestamp: new Date()
        }
      }
    }
  }

  async getPositions() {
    if (!this.client) {
      console.warn('Alpaca client not available, returning empty positions')
      return []
    }

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
      console.warn('Failed to get positions from Alpaca:', error)
      return []
    }
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