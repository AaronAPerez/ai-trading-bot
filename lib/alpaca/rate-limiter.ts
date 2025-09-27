/**
 * Advanced Rate Limiter for Alpaca API
 *
 * Implements:
 * - Request queuing with priority levels
 * - Exponential backoff for retries
 * - Rate limit detection and automatic throttling
 * - Per-endpoint rate limiting
 * - Request deduplication
 */

interface QueuedRequest {
  id: string
  endpoint: string
  priority: 'low' | 'normal' | 'high'
  request: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  retryCount: number
  timestamp: number
}

interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit: number
  retryDelay: number
  maxRetries: number
}

interface EndpointLimits {
  [key: string]: {
    requests: number[]
    lastRequest: number
  }
}

export class AlpacaRateLimiter {
  private queue: QueuedRequest[] = []
  private processing = false
  private requestCounts: number[] = []
  private endpointLimits: EndpointLimits = {}
  private isThrottled = false
  private throttleUntil = 0
  private requestCache = new Map<string, { data: any; expiry: number }>()

  // Conservative rate limits for Alpaca API
  private readonly config: RateLimitConfig = {
    requestsPerMinute: 150, // Conservative limit (Alpaca allows 200/minute)
    burstLimit: 5, // Max 5 requests in quick succession
    retryDelay: 1000, // Start with 1 second delay
    maxRetries: 3
  }

  // Specific limits for different endpoints
  private readonly endpointConfigs: { [key: string]: Partial<RateLimitConfig> } = {
    '/v2/account': { requestsPerMinute: 60 }, // Account info - more conservative
    '/v2/positions': { requestsPerMinute: 60 }, // Positions - conservative
    '/v2/orders': { requestsPerMinute: 120 }, // Orders - moderate
    '/v2/account/activities': { requestsPerMinute: 60 }, // Activities - conservative
    '/v1/last/quotes': { requestsPerMinute: 180 }, // Market data - higher limit
    '/v2/stocks/quotes/latest': { requestsPerMinute: 180 } // Latest quotes - higher limit
  }

  constructor() {
    // Clean up old request timestamps every minute
    setInterval(() => this.cleanupOldRequests(), 60000)
  }

  /**
   * Add a request to the rate-limited queue
   */
  async enqueue<T>(
    endpoint: string,
    request: () => Promise<T>,
    priority: 'low' | 'normal' | 'high' = 'normal',
    cacheKey?: string,
    cacheDuration = 5000 // 5 seconds default cache
  ): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = this.getCachedResult(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit for ${cacheKey}`)
        return cached
      }
    }

    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const queuedRequest: QueuedRequest = {
        id: requestId,
        endpoint,
        priority,
        request: async () => {
          try {
            const result = await request()

            // Cache the result if cache key provided
            if (cacheKey) {
              this.setCachedResult(cacheKey, result, cacheDuration)
            }

            return result
          } catch (error) {
            throw error
          }
        },
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }

      this.queue.push(queuedRequest)
      this.sortQueue()

      console.log(`📋 Queued request ${requestId} for ${endpoint} (priority: ${priority}, queue size: ${this.queue.length})`)

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      // Check if we're currently throttled
      if (this.isThrottled && Date.now() < this.throttleUntil) {
        const waitTime = this.throttleUntil - Date.now()
        console.log(`⏸️ Rate limit throttle active, waiting ${waitTime}ms`)
        await this.sleep(waitTime)
        this.isThrottled = false
      }

      const request = this.queue.shift()!

      try {
        // Check if we can make this request without hitting rate limits
        await this.waitForRateLimit(request.endpoint)

        console.log(`🚀 Processing request ${request.id} for ${request.endpoint}`)
        const result = await request.request()

        // Track successful request
        this.trackRequest(request.endpoint)

        request.resolve(result)

        // Small delay between requests to be extra safe
        await this.sleep(100)

      } catch (error: any) {
        console.error(`❌ Request ${request.id} failed:`, error.message)

        // Handle rate limit errors
        if (this.isRateLimitError(error)) {
          console.log(`🚫 Rate limit detected for ${request.endpoint}`)
          await this.handleRateLimit(request, error)
        } else if (request.retryCount < this.config.maxRetries) {
          // Retry for other errors
          console.log(`🔄 Retrying request ${request.id} (attempt ${request.retryCount + 1}/${this.config.maxRetries})`)
          request.retryCount++
          this.queue.unshift(request) // Put back at front of queue
          await this.sleep(this.calculateRetryDelay(request.retryCount))
        } else {
          // Max retries reached
          console.error(`💥 Request ${request.id} failed after ${this.config.maxRetries} retries`)
          request.reject(error)
        }
      }
    }

    this.processing = false
  }

  /**
   * Wait if necessary to respect rate limits
   */
  private async waitForRateLimit(endpoint: string): Promise<void> {
    const now = Date.now()

    // Clean up old requests
    this.requestCounts = this.requestCounts.filter(timestamp => now - timestamp < 60000)

    // Check global rate limit
    if (this.requestCounts.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requestCounts)
      const waitTime = 60000 - (now - oldestRequest) + 100 // Add 100ms buffer

      if (waitTime > 0) {
        console.log(`⏳ Global rate limit reached, waiting ${waitTime}ms`)
        await this.sleep(waitTime)
      }
    }

    // Check endpoint-specific rate limit
    const endpointConfig = this.getEndpointConfig(endpoint)
    if (!this.endpointLimits[endpoint]) {
      this.endpointLimits[endpoint] = { requests: [], lastRequest: 0 }
    }

    const endpointData = this.endpointLimits[endpoint]
    endpointData.requests = endpointData.requests.filter(timestamp => now - timestamp < 60000)

    if (endpointData.requests.length >= endpointConfig.requestsPerMinute) {
      const oldestRequest = Math.min(...endpointData.requests)
      const waitTime = 60000 - (now - oldestRequest) + 100

      if (waitTime > 0) {
        console.log(`⏳ Endpoint rate limit reached for ${endpoint}, waiting ${waitTime}ms`)
        await this.sleep(waitTime)
      }
    }

    // Check burst limit
    const recentRequests = endpointData.requests.filter(timestamp => now - timestamp < 5000)
    if (recentRequests.length >= this.config.burstLimit) {
      console.log(`⏳ Burst limit reached for ${endpoint}, waiting 5 seconds`)
      await this.sleep(5000)
    }
  }

  /**
   * Track a successful request
   */
  private trackRequest(endpoint: string): void {
    const now = Date.now()
    this.requestCounts.push(now)

    if (!this.endpointLimits[endpoint]) {
      this.endpointLimits[endpoint] = { requests: [], lastRequest: 0 }
    }

    this.endpointLimits[endpoint].requests.push(now)
    this.endpointLimits[endpoint].lastRequest = now
  }

  /**
   * Handle rate limit errors with exponential backoff
   */
  private async handleRateLimit(request: QueuedRequest, error: any): Promise<void> {
    const retryAfter = this.extractRetryAfter(error)
    const backoffDelay = retryAfter || this.calculateBackoffDelay(request.retryCount)

    console.log(`🕒 Rate limited, backing off for ${backoffDelay}ms`)

    this.isThrottled = true
    this.throttleUntil = Date.now() + backoffDelay

    // Put request back in queue for retry
    if (request.retryCount < this.config.maxRetries) {
      request.retryCount++
      this.queue.unshift(request)
    } else {
      request.reject(new Error(`Rate limit exceeded after ${this.config.maxRetries} retries`))
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      // Within same priority, sort by timestamp (FIFO)
      return a.timestamp - b.timestamp
    })
  }

  /**
   * Get endpoint-specific configuration
   */
  private getEndpointConfig(endpoint: string): RateLimitConfig {
    const baseConfig = { ...this.config }
    const endpointOverrides = this.endpointConfigs[endpoint] || {}
    return { ...baseConfig, ...endpointOverrides }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return (
      error.response?.status === 429 ||
      error.code === 'ECONNRESET' ||
      error.message?.toLowerCase().includes('rate limit') ||
      error.message?.toLowerCase().includes('too many requests')
    )
  }

  /**
   * Extract retry-after header from error response
   */
  private extractRetryAfter(error: any): number | null {
    const retryAfter = error.response?.headers['retry-after']
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10)
      return isNaN(seconds) ? null : seconds * 1000
    }
    return null
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay
    const exponentialDelay = baseDelay * Math.pow(2, retryCount)
    const jitter = Math.random() * 1000 // Add random jitter
    return Math.min(exponentialDelay + jitter, 30000) // Cap at 30 seconds
  }

  /**
   * Calculate retry delay for non-rate-limit errors
   */
  private calculateRetryDelay(retryCount: number): number {
    return Math.min(this.config.retryDelay * retryCount, 5000)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up old request timestamps
   */
  private cleanupOldRequests(): void {
    const now = Date.now()
    const cutoff = now - 60000

    this.requestCounts = this.requestCounts.filter(timestamp => timestamp > cutoff)

    Object.keys(this.endpointLimits).forEach(endpoint => {
      this.endpointLimits[endpoint].requests = this.endpointLimits[endpoint].requests.filter(
        timestamp => timestamp > cutoff
      )
    })

    // Clean up cache
    const cacheEntries = Array.from(this.requestCache.entries())
    for (const [key, value] of cacheEntries) {
      if (now > value.expiry) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * Cache management
   */
  private getCachedResult(key: string): any | null {
    const cached = this.requestCache.get(key)
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }
    return null
  }

  private setCachedResult(key: string, data: any, duration: number): void {
    this.requestCache.set(key, {
      data,
      expiry: Date.now() + duration
    })
  }

  /**
   * Get rate limiter statistics
   */
  getStats() {
    const now = Date.now()
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      isThrottled: this.isThrottled,
      throttleTimeRemaining: this.isThrottled ? Math.max(0, this.throttleUntil - now) : 0,
      recentRequests: this.requestCounts.filter(t => now - t < 60000).length,
      cacheSize: this.requestCache.size,
      endpointStats: Object.entries(this.endpointLimits).map(([endpoint, data]) => ({
        endpoint,
        recentRequests: data.requests.filter(t => now - t < 60000).length,
        lastRequest: data.lastRequest ? now - data.lastRequest : null
      }))
    }
  }

  /**
   * Clear the queue (for emergencies)
   */
  clearQueue(): void {
    console.log(`🧹 Clearing rate limiter queue (${this.queue.length} requests)`)
    this.queue.forEach(req => req.reject(new Error('Queue cleared')))
    this.queue = []
    this.processing = false
  }

  /**
   * Manually trigger throttle (for testing or emergency situations)
   */
  throttle(durationMs: number): void {
    console.log(`🚫 Manual throttle activated for ${durationMs}ms`)
    this.isThrottled = true
    this.throttleUntil = Date.now() + durationMs
  }
}

// Export singleton instance
export const alpacaRateLimiter = new AlpacaRateLimiter()