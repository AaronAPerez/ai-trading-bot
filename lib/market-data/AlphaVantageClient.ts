// Free market data client using Alpha Vantage API
// Get your free API key at: https://www.alphavantage.co/support/#api-key

interface AlphaVantageBar {
  '1. open': string
  '2. high': string
  '3. low': string
  '4. close': string
  '5. volume': string
}

interface AlphaVantageResponse {
  'Time Series (Daily)': { [date: string]: AlphaVantageBar }
  'Meta Data': {
    '1. Information': string
    '2. Symbol': string
    '3. Last Refreshed': string
    '4. Output Size': string
    '5. Time Zone': string
  }
}

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

export class AlphaVantageClient {
  private apiKey: string
  private baseUrl = 'https://www.alphavantage.co/query'
  private requestCount = 0
  private lastRequestTime = 0

  constructor(apiKey?: string) {
    // Use provided key or default demo key (limited requests)
    this.apiKey = apiKey || 'demo'
  }

  private async rateLimitedRequest(url: string): Promise<Response> {
    // Alpha Vantage free tier: 5 requests per minute, 500 per day
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    // Wait at least 12 seconds between requests (5 requests per minute)
    if (timeSinceLastRequest < 12000) {
      const waitTime = 12000 - timeSinceLastRequest
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++

    console.log(`📊 Alpha Vantage request #${this.requestCount}: ${url}`)
    return fetch(url)
  }

  async getDailyBars(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<MarketData[]> {
    try {
      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${this.apiKey}`

      const response = await this.rateLimitedRequest(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AlphaVantageResponse = await response.json()

      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`)
      }

      if (data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${data['Note']}`)
      }

      const timeSeries = data['Time Series (Daily)']
      if (!timeSeries) {
        console.warn('No time series data found for', symbol)
        return []
      }

      // Convert to MarketData format
      const bars: MarketData[] = []

      // Sort dates in ascending order (oldest first)
      const sortedDates = Object.keys(timeSeries).sort()

      for (const date of sortedDates) {
        const bar = timeSeries[date]
        bars.push({
          symbol,
          timestamp: new Date(date),
          timeframe: '1Day',
          open: parseFloat(bar['1. open']),
          high: parseFloat(bar['2. high']),
          low: parseFloat(bar['3. low']),
          close: parseFloat(bar['4. close']),
          volume: parseFloat(bar['5. volume']),
          source: 'alphavantage'
        })
      }

      console.log(`✅ Fetched ${bars.length} bars for ${symbol} from Alpha Vantage`)
      return bars

    } catch (error) {
      console.error(`❌ Error fetching data for ${symbol}:`, error.message)
      return []
    }
  }

  // Get data for multiple symbols with proper rate limiting
  async getBulkDailyBars(symbols: string[], outputSize: 'compact' | 'full' = 'compact'): Promise<Map<string, MarketData[]>> {
    const results = new Map<string, MarketData[]>()

    console.log(`📈 Fetching data for ${symbols.length} symbols from Alpha Vantage...`)

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]
      console.log(`📊 Processing ${i + 1}/${symbols.length}: ${symbol}`)

      try {
        const bars = await this.getDailyBars(symbol, outputSize)
        results.set(symbol, bars)

        // Progress update every 10 symbols
        if ((i + 1) % 10 === 0 || i === symbols.length - 1) {
          console.log(`✅ Completed ${i + 1}/${symbols.length} symbols`)
        }

      } catch (error) {
        console.error(`❌ Failed to fetch ${symbol}:`, error.message)
        results.set(symbol, [])
      }
    }

    console.log(`🎉 Bulk fetch complete: ${results.size} symbols processed`)
    return results
  }

  // Check if we can make requests (for demo key limitations)
  canMakeRequest(): boolean {
    // Demo key has very limited requests
    if (this.apiKey === 'demo' && this.requestCount >= 5) {
      console.warn('⚠️ Demo API key limit reached. Get a free key at https://www.alphavantage.co/support/#api-key')
      return false
    }

    return true
  }

  getRequestCount(): number {
    return this.requestCount
  }
}