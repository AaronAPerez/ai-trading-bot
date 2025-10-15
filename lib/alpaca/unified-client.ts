
import { withRateLimit } from '../api/rate-limiter-middleware'
import { APIErrors } from '../api/error-handler'
import { getAlpacaBaseUrl } from '../config/trading-mode'

/**
 * Unified Alpaca API client with rate limiting and error handling
 * Replaces inconsistent API calls across the codebase
 */
export class UnifiedAlpacaClient {
  private headers: HeadersInit

  constructor() {
    // Validate environment variables
    const apiKey = process.env.APCA_API_KEY_ID
    const secretKey = process.env.APCA_API_SECRET_KEY

    if (!apiKey || !secretKey) {
      throw new Error('Missing Alpaca API credentials. Check APCA_API_KEY_ID and APCA_API_SECRET_KEY')
    }

    this.headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
      'Content-Type': 'application/json',
    }

    console.log(`✅ Alpaca client initialized`)
  }

  private getBaseUrl(): string {
    return getAlpacaBaseUrl()
  }

  /**
   * Make a rate-limited request to Alpaca API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    priority: 'low' | 'normal' | 'high' = 'normal',
    params?: any
  ): Promise<T> {
    return withRateLimit(
      endpoint,
      async () => {
        const baseUrl = this.getBaseUrl()
        const url = `${baseUrl}${endpoint}`

        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.headers,
            ...options.headers,
          },
        })

        // Handle Alpaca API errors
        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any

          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { message: errorText }
          }

          // Map Alpaca errors to standardized errors
          if (response.status === 401) {
            throw APIErrors.Unauthorized('Invalid Alpaca API credentials')
          }
          if (response.status === 403) {
            throw APIErrors.Forbidden('Alpaca API access denied')
          }
          if (response.status === 422) {
            throw APIErrors.ValidationError(
              errorData.message || 'Validation failed',
              errorData
            )
          }
          if (response.status === 429) {
            throw APIErrors.RateLimitExceeded()
          }

          throw APIErrors.AlpacaAPIError(
            errorData.message || errorText,
            response.status
          )
        }

        // Handle empty responses (e.g., 204 No Content from DELETE requests)
        const contentLength = response.headers.get('content-length')
        const contentType = response.headers.get('content-type')

        // If response has no content or is explicitly 204, return empty object
        if (
          response.status === 204 ||
          contentLength === '0' ||
          (!contentType?.includes('application/json') && !response.body)
        ) {
          return {} as T
        }

        // Try to parse JSON, but handle empty responses gracefully
        const text = await response.text()
        if (!text || text.trim() === '') {
          return {} as T
        }

        return JSON.parse(text) as T
      },
      priority,
      params
    )
  }

  // ============ ACCOUNT METHODS ============
  
  /**
   * Get account information
   */
  async getAccount() {
    return this.request('/v2/account', {}, 'high', { type: 'account' })
  }

  /**
   * Get account activities
   */
  async getActivities(params?: {
    activity_types?: string
    date?: string
    until?: string
    after?: string
    direction?: 'asc' | 'desc'
    page_size?: number
  }) {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(
      `/v2/account/activities${queryString ? `?${queryString}` : ''}`,
      {},
      'normal'
    )
  }

  /**
   * Get portfolio history
   */
  async getPortfolioHistory(params?: {
    period?: string
    timeframe?: string
    date_end?: string
    extended_hours?: boolean
  }) {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(
      `/v2/account/portfolio/history${queryString ? `?${queryString}` : ''}`,
      {},
      'normal'
    )
  }

  // ============ ORDER METHODS ============
  
  /**
   * Get all orders
   */
  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all'
    limit?: number
    after?: string
    until?: string
    direction?: 'asc' | 'desc'
    nested?: boolean
  }) {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(
      `/v2/orders${queryString ? `?${queryString}` : ''}`,
      {},
      'normal'
    )
  }

  /**
   * Place a new order
   */
  async createOrder(order: {
    symbol: string
    qty?: number
    notional?: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
    limit_price?: number
    stop_price?: number
    extended_hours?: boolean
    client_order_id?: string
    asset_class?: 'us_equity' | 'crypto'
  }) {
    return this.request(
      '/v2/orders',
      {
        method: 'POST',
        body: JSON.stringify(order),
      },
      'high'
    )
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    return this.request(`/v2/orders/${orderId}`, {}, 'normal')
  }

  /**
   * Cancel order by ID
   */
  async cancelOrder(orderId: string) {
    return this.request(
      `/v2/orders/${orderId}`,
      { method: 'DELETE' },
      'high'
    )
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders() {
    return this.request('/v2/orders', { method: 'DELETE' }, 'high')
  }

  // ============ POSITION METHODS ============
  
  /**
   * Get all positions
   */
  async getPositions() {
    return this.request('/v2/positions', {}, 'normal', { type: 'positions' })
  }

  /**
   * Get position by symbol
   */
  async getPosition(symbol: string) {
    return this.request(`/v2/positions/${symbol}`, {}, 'normal')
  }

  /**
   * Close position
   */
  async closePosition(symbol: string, params?: {
    qty?: number
    percentage?: number
  }) {
    // URL encode symbol to handle special characters like / in crypto symbols
    const encodedSymbol = encodeURIComponent(symbol)
    const queryString = params ? new URLSearchParams(params as any).toString() : ''

    console.log(`📤 Alpaca API: Closing position for ${symbol} (encoded: ${encodedSymbol})`)

    try {
      const result = await this.request(
        `/v2/positions/${encodedSymbol}${queryString ? `?${queryString}` : ''}`,
        { method: 'DELETE' },
        'high'
      )
      console.log(`✅ Alpaca API: Successfully closed ${symbol}`, result)
      return result
    } catch (error: any) {
      console.error(`❌ Alpaca API: Failed to close ${symbol}`, {
        statusCode: error.statusCode,
        message: error.message,
        rawError: error
      })
      throw error
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions(params?: { cancel_orders?: boolean }) {
    const queryString = params ? new URLSearchParams(params as any).toString() : ''
    return this.request(
      `/v2/positions${queryString ? `?${queryString}` : ''}`,
      { method: 'DELETE' },
      'high'
    )
  }

  // ============ MARKET DATA METHODS ============
  
  /**
   * Get latest quote for symbol
   */
  async getLatestQuote(symbol: string) {
    return this.request(
      `/v2/stocks/${symbol}/quotes/latest`,
      {},
      'normal',
      { type: 'quote', symbol }
    )
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(symbols: string[]) {
    const quotes: Record<string, any> = {}

    for (const symbol of symbols) {
      try {
        const quote = await this.getLatestQuote(symbol)
        if (quote) {
          quotes[symbol] = {
            symbol,
            bidPrice: quote.bid || 0,
            askPrice: quote.ask || 0,
            bidSize: quote.bid_size || 0,
            askSize: quote.ask_size || 0,
            timestamp: new Date(quote.timestamp || Date.now()),
            spread: (quote.ask || 0) - (quote.bid || 0),
            midPrice: ((quote.bid || 0) + (quote.ask || 0)) / 2
          }
        }
      } catch (error) {
        console.warn(`Failed to get quote for ${symbol}:`, error)
        quotes[symbol] = {
          symbol,
          bidPrice: 0,
          askPrice: 0,
          bidSize: 0,
          askSize: 0,
          timestamp: new Date(),
          spread: 0,
          midPrice: 0,
          error: 'Quote unavailable'
        }
      }
    }

    return quotes
  }

  /**
   * Get latest trade for symbol
   */
  async getLatestTrade(symbol: string) {
    return this.request(
      `/v2/stocks/${symbol}/trades/latest`,
      {},
      'normal'
    )
  }

  /**
   * Get market clock
   */
  async getClock() {
    return this.request('/v2/clock', {}, 'normal')
  }

  /**
   * Get calendar
   */
  async getCalendar(params?: {
    start?: string
    end?: string
  }) {
    const queryString = params ? new URLSearchParams(params).toString() : ''
    return this.request(
      `/v2/calendar${queryString ? `?${queryString}` : ''}`,
      {},
      'normal'
    )
  }

  // ============ CRYPTO METHODS ============
  
  /**
   * Get latest crypto quote
   */
  async getCryptoQuote(symbol: string) {
    return this.request(
      `/v1beta3/crypto/us/latest/quotes?symbols=${symbol}`,
      {},
      'normal'
    )
  }

  /**
   * Get latest crypto trade
   */
  async getCryptoTrade(symbol: string) {
    return this.request(
      `/v1beta3/crypto/us/latest/trades?symbols=${symbol}`,
      {},
      'normal'
    )
  }

  /**
   * Get historical bars (OHLCV data) for technical analysis
   */
  async getBars(symbol: string, options: {
    timeframe?: string
    start?: string
    end?: string
    limit?: number
  } = {}) {
    const {
      timeframe = '1Hour',
      limit = 100,
      start,
      end
    } = options

    // Build query parameters
    const params = new URLSearchParams({
      timeframe,
      limit: limit.toString()
    })

    if (start) params.append('start', start)
    if (end) params.append('end', end)

    // Determine if crypto or stock based on symbol format
    const isCrypto = symbol.includes('/')

    try {
      if (isCrypto) {
        // Crypto endpoint - Note: Alpaca crypto endpoint may use different base URL
        const response = await this.request<any>(
          `/v1beta3/crypto/us/bars?symbols=${symbol}&${params.toString()}`,
          {},
          'normal'
        )
        const bars = response?.bars?.[symbol] || []
        if (bars.length === 0) {
          console.warn(`⚠️ No bars data returned for crypto ${symbol}`)
        }
        return bars
      } else {
        // Stock endpoint
        const response = await this.request<any>(
          `/v2/stocks/${symbol}/bars?${params.toString()}`,
          {},
          'normal'
        )
        return response?.bars || []
      }
    } catch (error) {
      console.error(`Failed to get bars for ${symbol}:`, error)
      // Return empty array to avoid breaking the trading cycle
      return []
    }
  }
}

// Singleton instance
export const alpacaClient = new UnifiedAlpacaClient()