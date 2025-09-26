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
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    try {
      return await this.client.getAccount()
    } catch (error) {
      console.error('Failed to get account from Alpaca:', error)
      throw new Error(`Alpaca API error: ${error.message}`)
    }
  }

  async getLatestQuote(params: { symbols: string }) {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
    }

    try {
      // Get real data from Alpaca
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
      throw new Error(`No quote data available for ${params.symbols}`)
    } catch (error) {
      console.error(`Failed to get quote for ${params.symbols} from Alpaca:`, error)
      throw new Error(`Alpaca quote API error: ${error.message}`)
    }
  }

  async getPositions() {
    if (!this.client) {
      throw new Error('Alpaca client not initialized. Check API credentials.')
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
      console.error('Failed to get positions from Alpaca:', error)
      throw new Error(`Alpaca positions API error: ${error.message}`)
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