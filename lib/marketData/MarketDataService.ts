/**
 * Enhanced Market Data Service with Multi-Provider Support
 * Integrates stocks and crypto data with intelligent failover
 * 
 * @fileoverview Unified market data service with provider management
 * @author Trading Platform Team
 * @version 2.0.0
 */

import { Quote, MarketData } from '@/types/trading'
import { AlpacaClient } from './AlpacaClient'
import { CoinbaseProvider, CoinGeckoProvider } from './CoinbaseProvider'
import { detectAssetType, getSymbolMetadata } from '@/config/symbols'

// =============================================================================
// Enhanced Service Types
// =============================================================================

export interface DataProvider {
  name: string
  type: 'stock' | 'crypto' | 'multi'
  priority: number
  isActive: boolean
  rateLimits?: {
    requestsPerMinute: number
    requestsPerDay?: number
  }
}

export interface MarketDataResponse {
  data: MarketData[]
  source: string
  cached: boolean
  timestamp: Date
  dataPoints: number
}

export interface QuoteResponse {
  quote: Quote
  source: string
  cached: boolean
  timestamp: Date
}

// =============================================================================
// Enhanced Market Data Service
// =============================================================================

export class MarketDataService {
   private providers: Map<string, any> = new Map()
  private cache: Map<string, { data: any, timestamp: Date, ttl: number }> = new Map()
  private failoverHistory: Map<string, { provider: string, failures: number, lastFailure: Date }> = new Map()
  
  // Cache TTL settings
  private readonly CACHE_TTL = {
    quote: 5000,        // 5 seconds for real-time quotes
    marketData: 60000,  // 1 minute for historical data
    symbols: 3600000    // 1 hour for symbol lists
  }

  constructor() {
    this.initializeProviders()
  }

  /**
   * Initialize all data providers with priority ordering
   */
  private initializeProviders(): void {
    // Stock data providers
    this.providers.set('alpaca', {
      instance: new AlpacaClient(),
      config: {
        name: 'Alpaca',
        type: 'stock',
        priority: 1,
        isActive: true,
        rateLimits: { requestsPerMinute: 200 }
      }
    })

    // Crypto data providers
    this.providers.set('coinbase', {
      instance: new CoinbaseProvider(),
      config: {
        name: 'Coinbase',
        type: 'crypto',
        priority: 1,
        isActive: true,
        rateLimits: { requestsPerMinute: 10 }
      }
    })

    this.providers.set('coingecko', {
      instance: new CoinGeckoProvider(),
      config: {
        name: 'CoinGecko',
        type: 'crypto',
        priority: 2,
        isActive: true,
        rateLimits: { requestsPerMinute: 30, requestsPerDay: 1000 }
      }
    })

    console.log('📊 Market data providers initialized:', Array.from(this.providers.keys()))
  }

  /**
   * Get historical market data with intelligent provider selection
   */
  async getMarketData(symbol: string, period: number = 100, timeframe: string = '1h'): Promise<MarketDataResponse> {
    const cacheKey = `marketdata-${symbol}-${period}-${timeframe}`
    
    // Check cache first
    const cached = this.getCachedData(cacheKey, this.CACHE_TTL.marketData)
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        cached: true,
        timestamp: new Date(),
        dataPoints: cached.length
      }
    }

    const assetType = detectAssetType(symbol)
    const providers = this.getProvidersForAssetType(assetType)

    for (const provider of providers) {
      try {
        console.log(`📊 Attempting to fetch market data for ${symbol} from ${provider.config.name}`)
        
        const startTime = Date.now()
        const data = await provider.instance.getMarketData(symbol, timeframe, period)
        const duration = Date.now() - startTime

        if (data && data.length > 0) {
          // Cache successful result
          this.setCachedData(cacheKey, data, this.CACHE_TTL.marketData)
          
          // Reset failure count on success
          this.failoverHistory.delete(`${provider.config.name}-${symbol}`)

          console.log(`✅ Retrieved ${data.length} data points from ${provider.config.name} in ${duration}ms`)
          
          return {
            data,
            source: provider.config.name.toLowerCase(),
            cached: false,
            timestamp: new Date(),
            dataPoints: data.length
          }
        }
      } catch (error) {
        console.warn(`⚠️ ${provider.config.name} failed for ${symbol}:`, error)
        this.recordFailure(provider.config.name, symbol)
      }
    }

    // All providers failed, generate fallback data
    console.warn(`🔄 All providers failed for ${symbol}, generating fallback data`)
    const fallbackData = this.generateFallbackData(symbol, period)
    
    return {
      data: fallbackData,
      source: 'fallback',
      cached: false,
      timestamp: new Date(),
      dataPoints: fallbackData.length
    }
  }

  /**
   * Get real-time quote with provider failover
   */
  async getQuote(symbol: string): Promise<QuoteResponse> {
    const cacheKey = `quote-${symbol}`
    
    // Check cache first (shorter TTL for quotes)
    const cached = this.getCachedData(cacheKey, this.CACHE_TTL.quote)
    if (cached) {
      return {
        quote: cached,
        source: 'cache',
        cached: true,
        timestamp: new Date()
      }
    }

    const assetType = detectAssetType(symbol)
    const providers = this.getProvidersForAssetType(assetType)

    for (const provider of providers) {
      try {
        console.log(`💰 Fetching quote for ${symbol} from ${provider.config.name}`)
        
        const quote = await provider.instance.getQuote(symbol)
        
        if (quote && quote.last > 0) {
          // Cache successful result
          this.setCachedData(cacheKey, quote, this.CACHE_TTL.quote)
          
          return {
            quote,
            source: provider.config.name.toLowerCase(),
            cached: false,
            timestamp: new Date()
          }
        }
      } catch (error) {
        console.warn(`⚠️ Quote failed from ${provider.config.name} for ${symbol}:`, error)
        this.recordFailure(provider.config.name, symbol)
      }
    }

    // Generate fallback quote
    const fallbackQuote = this.generateFallbackQuote(symbol)
    return {
      quote: fallbackQuote,
      source: 'fallback',
      cached: false,
      timestamp: new Date()
    }
  }

  /**
   * Get multiple quotes efficiently (batch processing)
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, QuoteResponse>> {
    const results: Record<string, QuoteResponse> = {}
    
    // Group symbols by asset type for efficient provider usage
    const stockSymbols = symbols.filter(s => detectAssetType(s) === 'stock')
    const cryptoSymbols = symbols.filter(s => detectAssetType(s) === 'crypto')

    // Process in parallel for different asset types
    const promises: Promise<void>[] = []

    // Process stocks
    if (stockSymbols.length > 0) {
      promises.push(
        (async () => {
          for (const symbol of stockSymbols) {
            try {
              results[symbol] = await this.getQuote(symbol)
            } catch (error) {
              console.error(`❌ Failed to get quote for ${symbol}:`, error)
              results[symbol] = {
                quote: this.generateFallbackQuote(symbol),
                source: 'fallback',
                cached: false,
                timestamp: new Date()
              }
            }
          }
        })()
      )
    }

    // Process crypto (can potentially use batch APIs)
    if (cryptoSymbols.length > 0) {
      promises.push(
        (async () => {
          // Try batch processing for crypto
          try {
            const coinGeckoProvider = this.providers.get('coingecko')?.instance
            if (coinGeckoProvider && cryptoSymbols.length > 3) {
              const batchPrices = await coinGeckoProvider.getSimplePrices(cryptoSymbols)
              
              for (const symbol of cryptoSymbols) {
                if (batchPrices[symbol]) {
                  const price = batchPrices[symbol]
                  results[symbol] = {
                    quote: {
                      symbol,
                      bid: price * 0.9995,
                      ask: price * 1.0005,
                      last: price,
                      volume: 0, // Volume not available in batch pricing
                      timestamp: new Date()
                    },
                    source: 'coingecko_batch',
                    cached: false,
                    timestamp: new Date()
                  }
                }
              }
            } else {
              // Fallback to individual requests
              for (const symbol of cryptoSymbols) {
                results[symbol] = await this.getQuote(symbol)
              }
            }
          } catch (error) {
            console.error('❌ Batch crypto quotes failed:', error)
            // Fallback to individual requests
            for (const symbol of cryptoSymbols) {
              results[symbol] = await this.getQuote(symbol)
            }
          }
        })()
      )
    }

    await Promise.all(promises)
    
    console.log(`✅ Retrieved ${Object.keys(results).length} quotes (${stockSymbols.length} stocks, ${cryptoSymbols.length} crypto)`)
    return results
  }

  /**
   * Get available symbols for trading
   */
  async getAvailableSymbols(assetType?: 'stock' | 'crypto'): Promise<{
    stocks: string[]
    crypto: string[]
    total: number
  }> {
    const cacheKey = `symbols-${assetType || 'all'}`
    const cached = this.getCachedData(cacheKey, this.CACHE_TTL.symbols)
    
    if (cached) {
      return cached
    }

    const results = {
      stocks: [] as string[],
      crypto: [] as string[],
      total: 0
    }

    try {
      // Get stock symbols from Alpaca
      if (!assetType || assetType === 'stock') {
        const alpacaProvider = this.providers.get('alpaca')?.instance
        if (alpacaProvider && typeof alpacaProvider.getSymbols === 'function') {
          results.stocks = await alpacaProvider.getSymbols()
        }
      }

      // Get crypto symbols from Coinbase
      if (!assetType || assetType === 'crypto') {
        const coinbaseProvider = this.providers.get('coinbase')?.instance
        if (coinbaseProvider && typeof coinbaseProvider.getSymbols === 'function') {
          results.crypto = await coinbaseProvider.getSymbols()
        }
      }

      results.total = results.stocks.length + results.crypto.length

      // Cache the results
      this.setCachedData(cacheKey, results, this.CACHE_TTL.symbols)

      console.log(`✅ Retrieved symbols: ${results.stocks.length} stocks, ${results.crypto.length} crypto`)
      return results

    } catch (error) {
      console.error('❌ Failed to get available symbols:', error)
      
      // Return fallback symbol lists
      return {
        stocks: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
        crypto: ['BTC-USD', 'ETH-USD', 'BNB-USD'],
        total: 8
      }
    }
  }

  /**
   * Get provider health status
   */
  getProviderStatus(): Record<string, {
    name: string
    type: string
    isActive: boolean
    failures: number
    lastFailure?: Date
    responseTime?: number
  }> {
    const status: any = {}

    for (const [key, provider] of this.providers) {
      const failureKey = `${provider.config.name}`
      const failures = this.failoverHistory.get(failureKey)

      status[key] = {
        name: provider.config.name,
        type: provider.config.type,
        isActive: provider.config.isActive,
        failures: failures?.failures || 0,
        lastFailure: failures?.lastFailure
      }
    }

    return status
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Get providers sorted by priority for given asset type
   */
  private getProvidersForAssetType(assetType: 'stock' | 'crypto'): any[] {
    const applicableProviders = Array.from(this.providers.values())
      .filter(p => p.config.isActive && (p.config.type === assetType || p.config.type === 'multi'))
      .sort((a, b) => a.config.priority - b.config.priority)

    return applicableProviders
  }

  /**
   * Cache management
   */
  private getCachedData(key: string, ttl: number): any {
    const cached = this.cache.get(key)
    if (cached && (Date.now() - cached.timestamp.getTime()) < ttl) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })
  }

  /**
   * Record provider failures for intelligent failover
   */
  private recordFailure(providerName: string, symbol: string): void {
    const key = `${providerName}-${symbol}`
    const existing = this.failoverHistory.get(key) || { provider: providerName, failures: 0, lastFailure: new Date() }
    
    existing.failures += 1
    existing.lastFailure = new Date()
    
    this.failoverHistory.set(key, existing)

    // Disable provider temporarily if too many failures
    if (existing.failures >= 5) {
      const provider = Array.from(this.providers.values()).find(p => p.config.name === providerName)
      if (provider) {
        provider.config.isActive = false
        console.warn(`🚫 Temporarily disabled ${providerName} due to repeated failures`)
        
        // Re-enable after 5 minutes
        setTimeout(() => {
          provider.config.isActive = true
          console.log(`✅ Re-enabled ${providerName}`)
        }, 300000)
      }
    }
  }

  /**
   * Generate fallback data when all providers fail
   */
  private generateFallbackData(symbol: string, periods: number): MarketData[] {
    const metadata = getSymbolMetadata(symbol)
    const basePrice = this.getBasePrice(symbol)
    let currentPrice = basePrice
    const data: MarketData[] = []

    const volatility = metadata.volatility === 'high' ? 0.08 : 
                      metadata.volatility === 'low' ? 0.02 : 0.04

    for (let i = 0; i < periods; i++) {
      const timestamp = new Date(Date.now() - (periods - i) * 3600000)
      const change = (Math.random() - 0.5) * volatility
      
      currentPrice *= (1 + change)
      const high = currentPrice * (1 + Math.random() * 0.01)
      const low = currentPrice * (1 - Math.random() * 0.01)
      const volume = Math.random() * 1000000 + 100000

      data.push({
        symbol,
        timestamp,
        timeframe: '1h',
        open: i === 0 ? basePrice : data[i - 1].close,
        high,
        low,
        close: currentPrice,
        volume
      })
    }

    return data
  }

  /**
   * Generate fallback quote
   */
  private generateFallbackQuote(symbol: string): Quote {
    const basePrice = this.getBasePrice(symbol)
    const spread = basePrice * 0.001 // 0.1% spread
    
    return {
      symbol,
      bid: basePrice - spread/2,
      ask: basePrice + spread/2,
      last: basePrice,
      volume: 0, // Fallback data has no volume
      timestamp: new Date()
    }
  }

  /**
   * Get base price for any symbol
   */
  private getBasePrice(symbol: string): number {
    const assetType = detectAssetType(symbol)
    
    if (assetType === 'crypto') {
      const cryptoPrices: Record<string, number> = {
        'BTC-USD': 65000,
        'ETH-USD': 3500,
        'BNB-USD': 600,
        'XRP-USD': 0.60,
        'ADA-USD': 1.20,
        'SOL-USD': 180,
        'DOGE-USD': 0.08
      }
      return cryptoPrices[symbol] || 100
    } else {
      const stockPrices: Record<string, number> = {
        'AAPL': 175,
        'GOOGL': 140,
        'MSFT': 420,
        'AMZN': 150,
        'TSLA': 250,
        'NVDA': 800,
        'META': 320
      }
      return stockPrices[symbol] || 100
    }
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cache.clear()
    this.failoverHistory.clear()
    console.log('🧹 All caches cleared')
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number
    providers: number
    failureRecords: number
  } {
    return {
      size: this.cache.size,
      providers: this.providers.size,
      failureRecords: this.failoverHistory.size
    }
  }
}