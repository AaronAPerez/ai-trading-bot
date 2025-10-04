/**
 * Crypto Watchlist Manager
 * Manages cryptocurrency symbols for 24/7 trading
 */

export interface CryptoAsset {
  symbol: string
  name: string
  tradable: boolean
  marginable: boolean
  maintenance_margin_requirement?: number
  fractionable?: boolean
}

export class CryptoWatchlistManager {

  /**
   * Top crypto assets available on Alpaca for 24/7 trading
   */
  static readonly TOP_CRYPTO_SYMBOLS = [
    // Major Cryptocurrencies
    'BTCUSD',  // Bitcoin
    'ETHUSD',  // Ethereum
    'LTCUSD',  // Litecoin
    'BCHUSD',  // Bitcoin Cash

    // Popular Altcoins
    'AVAXUSD', // Avalanche
    'SHIBUSDT', // Shiba Inu
    'LINKUSD', // Chainlink
    'UNIUSD',  // Uniswap
    'AAVEUSD', // Aave
    'MATICUSD', // Polygon

    // Stablecoins (for analysis)
    'USDTUSD', // Tether
    'USDCUSD', // USD Coin
  ]

  /**
   * Get full crypto watchlist for 24/7 trading
   */
  static getCryptoWatchlist(): string[] {
    return this.TOP_CRYPTO_SYMBOLS
  }

  /**
   * Get top N crypto symbols by market cap
   */
  static getTopCryptos(count: number = 5): string[] {
    return this.TOP_CRYPTO_SYMBOLS.slice(0, count)
  }

  /**
   * Check if a symbol is a cryptocurrency
   */
  static isCryptoSymbol(symbol: string): boolean {
    return this.TOP_CRYPTO_SYMBOLS.includes(symbol) ||
           /^[A-Z]+(USD|USDT|USDC|BUSD)$/i.test(symbol)
  }

  /**
   * Get crypto symbols by category
   */
  static getCryptosByCategory(category: 'major' | 'altcoins' | 'defi' | 'all' = 'all'): string[] {
    const categories = {
      major: ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD'],
      altcoins: ['AVAXUSD', 'SHIBUSDT', 'LINKUSD', 'UNIUSD', 'MATICUSD'],
      defi: ['UNIUSD', 'AAVEUSD', 'LINKUSD'],
      all: this.TOP_CRYPTO_SYMBOLS
    }

    return categories[category] || categories.all
  }

  /**
   * Get recommended crypto trading pairs for AI learning
   * These are highly liquid and suitable for 24/7 automated trading
   */
  static getRecommendedTradingPairs(): string[] {
    return [
      'BTCUSD',  // Most liquid
      'ETHUSD',  // High volume
      'LTCUSD',  // Good volatility
      'AVAXUSD', // Trending altcoin
      'MATICUSD' // Layer 2 solution
    ]
  }

  /**
   * Get crypto market information
   */
  static getCryptoMarketInfo() {
    return {
      market_type: 'crypto',
      trading_hours: '24/7',
      is_always_open: true,
      no_market_close: true,
      weekend_trading: true,
      after_hours_trading: true,
      supported_exchanges: ['Alpaca Crypto'],
      trading_pairs: this.TOP_CRYPTO_SYMBOLS.length,
      recommended_for_ai: this.getRecommendedTradingPairs()
    }
  }

  /**
   * Combine crypto and stock watchlists for hybrid trading
   */
  static getHybridWatchlist(stockSymbols: string[], includeTopCryptos: number = 5): string[] {
    const cryptoSymbols = this.getTopCryptos(includeTopCryptos)
    return [...stockSymbols, ...cryptoSymbols]
  }

  /**
   * Filter valid crypto symbols from a list
   */
  static filterCryptoSymbols(symbols: string[]): string[] {
    return symbols.filter(symbol => this.isCryptoSymbol(symbol))
  }

  /**
   * Get 24/7 trading configuration for crypto
   */
  static getCryptoTradingConfig() {
    return {
      enabled: true,
      marketHoursOnly: false,
      afterHoursTrading: true,
      weekendTrading: true,
      cryptoTradingEnabled: true,
      cryptoSpreadThreshold: 0.06, // 6% spread tolerance for crypto
      recommendedSymbols: this.getRecommendedTradingPairs(),
      supportedPairs: this.TOP_CRYPTO_SYMBOLS
    }
  }
}
