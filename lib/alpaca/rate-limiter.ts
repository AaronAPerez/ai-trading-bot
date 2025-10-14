/**
 * Fixed AlpacaRateLimiter with Environment Detection
 * Handles both Node.js and browser environments properly
 * Update your existing lib/alpaca/rate-limiter.ts with this code
 */

interface RateLimitRule {
  requests: number
  window: number // in milliseconds
  description: string
}

interface RequestRecord {
  timestamp: number
  endpoint: string
}

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

export class AlpacaRateLimiter {
  private requests: RequestRecord[] = []
  private cleanupInterval: NodeJS.Timeout | number | null = null
  private pendingRequests: Map<string, PendingRequest<any>> = new Map()
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map()
  
  // Rate limit rules for different Alpaca API endpoints
  private rules: Record<string, RateLimitRule> = {
    default: { requests: 200, window: 60000, description: "200 requests per minute" },
    orders: { requests: 200, window: 60000, description: "200 orders per minute" },
    account: { requests: 200, window: 60000, description: "200 account requests per minute" },
    positions: { requests: 200, window: 60000, description: "200 position requests per minute" },
    market_data: { requests: 200, window: 60000, description: "200 market data requests per minute" }
  }
  enqueue: any

  constructor() {
    this.startCleanupInterval()
  }

  /**
   * Environment-safe cleanup interval setup
   */
  private startCleanupInterval(): void {
    // Check if we're in Node.js environment
    const isNode = typeof process !== 'undefined' && 
                   process.versions && 
                   process.versions.node

    if (isNode) {
      // Node.js environment - use unref() to allow process exit
      this.cleanupInterval = setInterval(() => this.cleanupOldRequests(), 60000)
      
      // Safely call unref if it exists
      if (this.cleanupInterval && typeof (this.cleanupInterval as NodeJS.Timeout).unref === 'function') {
        (this.cleanupInterval as NodeJS.Timeout).unref()
      }
    } else {
      // Browser environment - use regular setInterval
      this.cleanupInterval = setInterval(() => this.cleanupOldRequests(), 60000) as number
    }
  }

  /**
   * Check if request is allowed under rate limits
   */
  async isAllowed(endpoint: string = 'default'): Promise<boolean> {
    const rule = this.getRuleForEndpoint(endpoint)
    const now = Date.now()
    const windowStart = now - rule.window

    // Count requests in current window
    const recentRequests = this.requests.filter(
      req => req.timestamp >= windowStart && this.matchesEndpoint(req.endpoint, endpoint)
    )

    return recentRequests.length < rule.requests
  }

  /**
   * Wait for rate limit window if needed, then record request
   */
  async waitAndRecord(endpoint: string = 'default'): Promise<void> {
    const rule = this.getRuleForEndpoint(endpoint)
    
    while (!(await this.isAllowed(endpoint))) {
      // Calculate wait time until oldest request expires
      const now = Date.now()
      const windowStart = now - rule.window
      const recentRequests = this.requests
        .filter(req => this.matchesEndpoint(req.endpoint, endpoint))
        .sort((a, b) => a.timestamp - b.timestamp)

      if (recentRequests.length >= rule.requests) {
        const oldestRequest = recentRequests[0]
        const waitTime = (oldestRequest.timestamp + rule.window) - now + 100 // Add 100ms buffer
        
        if (waitTime > 0) {
          console.log(`Rate limit reached for ${endpoint}. Waiting ${waitTime}ms...`)
          await this.sleep(waitTime)
        }
      }
    }

    // Record the request
    this.recordRequest(endpoint)
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(endpoint: string = 'default'): void {
    this.requests.push({
      timestamp: Date.now(),
      endpoint
    })

    // Cleanup old requests if array gets too large
    if (this.requests.length > 1000) {
      this.cleanupOldRequests()
    }
  }

  /**
   * Get rate limit rule for endpoint
   */
  private getRuleForEndpoint(endpoint: string): RateLimitRule {
    // Map endpoint patterns to rules
    if (endpoint.includes('/orders') || endpoint.includes('order')) {
      return this.rules.orders
    }
    if (endpoint.includes('/account')) {
      return this.rules.account
    }
    if (endpoint.includes('/positions')) {
      return this.rules.positions
    }
    if (endpoint.includes('data.alpaca.markets') || endpoint.includes('/bars') || endpoint.includes('/quotes')) {
      return this.rules.market_data
    }
    
    return this.rules.default
  }

  /**
   * Check if request endpoint matches pattern
   */
  private matchesEndpoint(requestEndpoint: string, patternEndpoint: string): boolean {
    if (patternEndpoint === 'default') {
      return true
    }
    return requestEndpoint.includes(patternEndpoint) || 
           this.getRuleForEndpoint(requestEndpoint) === this.getRuleForEndpoint(patternEndpoint)
  }

  /**
   * Clean up old requests outside rate limit windows
   */
  private cleanupOldRequests(): void {
    const now = Date.now()
    const maxWindow = Math.max(...Object.values(this.rules).map(rule => rule.window))
    
    this.requests = this.requests.filter(
      req => now - req.timestamp < maxWindow + 60000 // Keep extra 1 minute buffer
    )
  }

  /**
   * Environment-safe sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms)
      
      // In Node.js, allow process to exit during sleep
      if (typeof process !== 'undefined' && 
          process.versions && 
          process.versions.node && 
          timeout && 
          typeof (timeout as NodeJS.Timeout).unref === 'function') {
        (timeout as NodeJS.Timeout).unref()
      }
    })
  }

  /**
   * Get current rate limit status
   */
  getStatus(endpoint: string = 'default'): {
    rule: RateLimitRule
    requestsInWindow: number
    requestsRemaining: number
    windowResetTime: number
  } {
    const rule = this.getRuleForEndpoint(endpoint)
    const now = Date.now()
    const windowStart = now - rule.window

    const requestsInWindow = this.requests.filter(
      req => req.timestamp >= windowStart && this.matchesEndpoint(req.endpoint, endpoint)
    ).length

    const oldestRequest = this.requests
      .filter(req => this.matchesEndpoint(req.endpoint, endpoint))
      .sort((a, b) => a.timestamp - b.timestamp)[0]

    const windowResetTime = oldestRequest 
      ? oldestRequest.timestamp + rule.window
      : now

    return {
      rule,
      requestsInWindow,
      requestsRemaining: Math.max(0, rule.requests - requestsInWindow),
      windowResetTime
    }
  }

  /**
   * Environment-safe cleanup and shutdown
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as any)
      this.cleanupInterval = null
    }
    this.requests = []
    this.pendingRequests.clear()
    this.requestCache.clear()
  }

  /**
   * Generate cache key for request deduplication
   */
  private getCacheKey(endpoint: string, params?: any): string {
    return params ? `${endpoint}:${JSON.stringify(params)}` : endpoint
  }

  /**
   * Check if cached response is still valid (within 10 seconds)
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    const cached = this.requestCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data
    }
    return null
  }

  /**
   * Request wrapper with rate limiting, deduplication, and caching
   */
  async request<T>(
    requestFn: () => Promise<T>,
    endpoint: string = 'default',
    retries: number = 3,
    params?: any
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params)

    // Check cache first (prevents duplicate API calls within 10 seconds)
    const cached = this.getCachedResponse<T>(cacheKey)
    if (cached !== null) {
      console.log(`[Cache] Using cached response for ${cacheKey}`)
      return cached
    }

    // Check if identical request is already in flight (deduplication)
    const pending = this.pendingRequests.get(cacheKey)
    if (pending && Date.now() - pending.timestamp < 5000) {
      console.log(`[Dedup] Reusing in-flight request for ${cacheKey}`)
      return pending.promise
    }

    // Create new request
    const promise = (async () => {
      await this.waitAndRecord(endpoint)

      try {
        const result = await requestFn()

        // Cache the result
        this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() })

        // Cleanup cache if it gets too large
        if (this.requestCache.size > 100) {
          const now = Date.now()
          for (const [key, value] of this.requestCache.entries()) {
            if (now - value.timestamp > 10000) {
              this.requestCache.delete(key)
            }
          }
        }

        return result
      } catch (error: any) {
        // In test environment, log the error for debugging
        if (process.env.NODE_ENV === 'test') {
          console.error(`[RateLimiter] Error for ${endpoint}:`, error)
        }

        // Handle rate limit errors with exponential backoff
        if (error.status === 429 && retries > 0) {
          const backoffTime = Math.pow(2, 4 - retries) * 1000 // 1s, 2s, 4s
          console.log(`Rate limited by server. Backing off for ${backoffTime}ms...`)
          await this.sleep(backoffTime)
          return this.request(requestFn, endpoint, retries - 1, params)
        }

        // Always re-throw the error
        throw error
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey)
      }
    })()

    // Store as pending request
    this.pendingRequests.set(cacheKey, { promise, timestamp: Date.now() })

    return promise
  }
}

// Export singleton instance for global use
export const alpacaRateLimiter = new AlpacaRateLimiter()

// Environment detection utility
export const isNodeEnvironment = (): boolean => {
  return typeof process !== 'undefined' && 
         process.versions && 
         process.versions.node !== undefined
}

// Test environment detection
export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test' || 
         process.env.JEST_WORKER_ID !== undefined ||
         (typeof global !== 'undefined' && 'expect' in global)
}