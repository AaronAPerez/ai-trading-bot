// Free Market Data Provider using multiple APIs as fallback
export interface MarketQuote {
  symbol: string
  bidPrice: number
  askPrice: number
  midPrice: number
  timestamp: Date
  spread: number
  volume: number
  dailyChangePercent?: number
  open?: number
  high?: number
  low?: number
  close?: number
}

export class FreeMarketDataProvider {
  private iexToken: string | null = null
  private alphaVantageKey: string | null = null

  constructor() {
    // These would be free API keys (optional)
    this.iexToken = process.env.IEX_TOKEN || null
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_KEY || null
  }

  async getQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const quotes: Record<string, MarketQuote> = {}

    // Try different free APIs in order
    for (const symbol of symbols) {
      try {
        let quote: MarketQuote | null = null

        // Method 1: Try Yahoo Finance (free, no API key required)
        quote = await this.getYahooQuote(symbol)

        if (!quote && this.iexToken) {
          // Method 2: Try IEX Cloud (free tier)
          quote = await this.getIEXQuote(symbol)
        }

        if (!quote) {
          // Method 3: Try Finnhub (free tier, no key needed for basic data)
          quote = await this.getFinnhubQuote(symbol)
        }

        if (quote) {
          quotes[symbol] = quote
        } else {
          console.log(`⚠️ No data available for ${symbol} from free APIs`)
        }
      } catch (error) {
        console.log(`Error fetching data for ${symbol}:`, error.message)
      }
    }

    return quotes
  }

  private async getYahooQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      // Convert crypto symbols for Yahoo Finance
      const yahooSymbol = this.convertToYahooSymbol(symbol)

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`)
      }

      const data = await response.json()
      const result = data.chart?.result?.[0]

      if (!result || !result.meta) {
        return null
      }

      const meta = result.meta
      const quote = result.meta

      return {
        symbol,
        bidPrice: quote.bid || quote.regularMarketPrice || 0,
        askPrice: quote.ask || quote.regularMarketPrice || 0,
        midPrice: quote.regularMarketPrice || 0,
        timestamp: new Date(),
        spread: (quote.ask || 0) - (quote.bid || 0),
        volume: quote.regularMarketVolume || 0,
        dailyChangePercent: quote.regularMarketChangePercent || 0,
        open: quote.regularMarketOpen || 0,
        high: quote.regularMarketDayHigh || 0,
        low: quote.regularMarketDayLow || 0,
        close: quote.regularMarketPrice || 0
      }
    } catch (error) {
      console.log(`Yahoo Finance error for ${symbol}:`, error.message)
      return null
    }
  }

  private async getIEXQuote(symbol: string): Promise<MarketQuote | null> {
    if (!this.iexToken) return null

    try {
      const response = await fetch(
        `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${this.iexToken}`
      )

      if (!response.ok) {
        throw new Error(`IEX API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        symbol,
        bidPrice: data.iexBidPrice || data.latestPrice || 0,
        askPrice: data.iexAskPrice || data.latestPrice || 0,
        midPrice: data.latestPrice || 0,
        timestamp: new Date(data.latestUpdate || Date.now()),
        spread: (data.iexAskPrice || 0) - (data.iexBidPrice || 0),
        volume: data.latestVolume || 0,
        dailyChangePercent: data.changePercent * 100 || 0,
        open: data.open || 0,
        high: data.high || 0,
        low: data.low || 0,
        close: data.latestPrice || 0
      }
    } catch (error) {
      console.log(`IEX error for ${symbol}:`, error.message)
      return null
    }
  }

  private async getFinnhubQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=demo`
      )

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.c) {
        return null // No data available
      }

      return {
        symbol,
        bidPrice: data.c * 0.999, // Simulate bid
        askPrice: data.c * 1.001, // Simulate ask
        midPrice: data.c,
        timestamp: new Date(),
        spread: data.c * 0.002, // Simulate spread
        volume: 0, // Not available in free tier
        dailyChangePercent: data.dp || 0,
        open: data.o || 0,
        high: data.h || 0,
        low: data.l || 0,
        close: data.c || 0
      }
    } catch (error) {
      console.log(`Finnhub error for ${symbol}:`, error.message)
      return null
    }
  }

  private convertToYahooSymbol(symbol: string): string {
    // Convert crypto symbols to Yahoo Finance format
    const cryptoMap: Record<string, string> = {
      'BTCUSD': 'BTC-USD',
      'ETHUSD': 'ETH-USD',
      'ADAUSD': 'ADA-USD',
      'SOLUSD': 'SOL-USD',
      'AVAXUSD': 'AVAX-USD',
      'MATICUSD': 'MATIC-USD'
    }

    return cryptoMap[symbol] || symbol
  }

  // Get crypto data from alternative sources
  async getCryptoQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
    const quotes: Record<string, MarketQuote> = {}

    try {
      // Use CoinGecko API (free, no API key required)
      const cryptoIds = symbols.map(s => this.getCoinGeckoId(s)).filter(Boolean)

      if (cryptoIds.length > 0) {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
        )

        if (response.ok) {
          const data = await response.json()

          for (const symbol of symbols) {
            const coinId = this.getCoinGeckoId(symbol)
            if (coinId && data[coinId]) {
              const coinData = data[coinId]
              quotes[symbol] = {
                symbol,
                bidPrice: coinData.usd * 0.999,
                askPrice: coinData.usd * 1.001,
                midPrice: coinData.usd,
                timestamp: new Date(),
                spread: coinData.usd * 0.002,
                volume: coinData.usd_24h_vol || 0,
                dailyChangePercent: coinData.usd_24h_change || 0,
                close: coinData.usd
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('CoinGecko API error:', error.message)
    }

    return quotes
  }

  private getCoinGeckoId(symbol: string): string | null {
    const coinMap: Record<string, string> = {
      'BTCUSD': 'bitcoin',
      'ETHUSD': 'ethereum',
      'ADAUSD': 'cardano',
      'SOLUSD': 'solana',
      'AVAXUSD': 'avalanche-2',
      'MATICUSD': 'matic-network'
    }

    return coinMap[symbol] || null
  }
}