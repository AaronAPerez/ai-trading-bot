// Free market data client using Yahoo Finance API
// No API key required, no rate limits, completely free!

export interface MarketData {
  symbol: string
  timestamp: Date
  timeframe: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  source: string
}

export class YahooFinanceClient {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart'

  constructor() {
    console.log('📈 Yahoo Finance client initialized - FREE unlimited market data!')
  }

  async getDailyBars(symbol: string, range: string = '1mo'): Promise<MarketData[]> {
    try {
      // Yahoo Finance API endpoint
      const url = `${this.baseUrl}/${symbol}?range=${range}&interval=1d&includePrePost=false`

      console.log(`📊 Fetching ${symbol} from Yahoo Finance...`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Trading-Bot/1.0)',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Check for errors
      if (data.chart?.error) {
        throw new Error(`Yahoo Finance error: ${data.chart.error.description}`)
      }

      const result = data.chart?.result?.[0]
      if (!result) {
        console.warn(`No data found for ${symbol}`)
        return []
      }

      const timestamps = result.timestamp
      const quotes = result.indicators?.quote?.[0]

      if (!timestamps || !quotes) {
        console.warn(`Invalid data structure for ${symbol}`)
        return []
      }

      // Convert to MarketData format
      const bars: MarketData[] = []

      for (let i = 0; i < timestamps.length; i++) {
        // Skip invalid data points
        if (quotes.close[i] === null || quotes.close[i] === undefined) {
          continue
        }

        bars.push({
          symbol,
          timestamp: new Date(timestamps[i] * 1000), // Unix timestamp to Date
          timeframe: '1Day',
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
          source: 'yahoo_finance'
        })
      }

      console.log(`✅ Fetched ${bars.length} bars for ${symbol} from Yahoo Finance`)
      return bars

    } catch (error) {
      console.error(`❌ Error fetching ${symbol} from Yahoo Finance:`, error.message)
      return []
    }
  }

  // Get data for multiple symbols - no rate limits!
  async getBulkDailyBars(symbols: string[], range: string = '1mo'): Promise<Map<string, MarketData[]>> {
    const results = new Map<string, MarketData[]>()

    console.log(`📈 Fetching data for ${symbols.length} symbols from Yahoo Finance (no rate limits!)...`)

    // Process multiple symbols in parallel (Yahoo Finance has no rate limits)
    const promises = symbols.map(async (symbol, index) => {
      try {
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, index * 100))

        const bars = await this.getDailyBars(symbol, range)
        return { symbol, bars }

      } catch (error) {
        console.error(`❌ Failed to fetch ${symbol}:`, error.message)
        return { symbol, bars: [] }
      }
    })

    const responses = await Promise.all(promises)

    // Populate results map
    responses.forEach(({ symbol, bars }) => {
      results.set(symbol, bars)
    })

    console.log(`🎉 Yahoo Finance bulk fetch complete: ${results.size} symbols processed`)
    return results
  }

  // Get real-time quote (current price)
  async getCurrentQuote(symbol: string): Promise<number | null> {
    try {
      const bars = await this.getDailyBars(symbol, '1d')
      if (bars.length > 0) {
        return bars[bars.length - 1].close
      }
      return null
    } catch (error) {
      console.error(`❌ Error getting quote for ${symbol}:`, error.message)
      return null
    }
  }

  // Check if symbol exists
  async isValidSymbol(symbol: string): Promise<boolean> {
    try {
      const bars = await this.getDailyBars(symbol, '5d')
      return bars.length > 0
    } catch (error) {
      return false
    }
  }

  // No API key needed, no rate limits!
  canMakeRequest(): boolean {
    return true // Always true for Yahoo Finance
  }

  getRequestCount(): number {
    return 0 // No tracking needed for Yahoo Finance
  }
}