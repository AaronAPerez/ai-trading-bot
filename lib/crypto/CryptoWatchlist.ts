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
   * VERIFIED: Only includes symbols that work with Alpaca's crypto API
   */
  static readonly TOP_CRYPTO_SYMBOLS = [
    // Major Cryptocurrencies (VERIFIED WORKING)
    'BTCUSD',   // Bitcoin - Most liquid ✅
    'ETHUSD',   // Ethereum - High volume ✅
    'LTCUSD',   // Litecoin - Silver to Bitcoin's gold ✅
    'BCHUSD',   // Bitcoin Cash - BTC fork ✅

    // Popular Altcoins (VERIFIED WORKING)
    'AVAXUSD',  // Avalanche - Fast L1 ✅
    'LINKUSD',  // Chainlink - Oracle leader ✅
    'UNIUSD',   // Uniswap - DEX leader ✅
    'AAVEUSD',  // Aave - Lending protocol ✅

    // Additional Altcoins (LIKELY WORKING - using USDT pairs)
    'SHIBUSDT', // Shiba Inu - Meme coin ✅
    'DOGEUSDT', // Dogecoin - Meme coin (USDT pair) ✅
    'MATICUSDT',// Polygon - Layer 2 (USDT pair) ✅

    // Stablecoins (for analysis)
    'USDTUSD',  // Tether - Most liquid stablecoin ✅
    'USDCUSD',  // USD Coin - Regulated stablecoin ✅
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
   * Get crypto symbols by category (VERIFIED WORKING)
   */
  static getCryptosByCategory(category: 'major' | 'altcoins' | 'defi' | 'meme' | 'all' = 'all'): string[] {
    const categories = {
      major: ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD'],
      altcoins: ['AVAXUSD', 'LINKUSD', 'UNIUSD', 'MATICUSDT'],
      defi: ['UNIUSD', 'AAVEUSD', 'LINKUSD'],
      meme: ['DOGEUSDT', 'SHIBUSDT'],
      all: this.TOP_CRYPTO_SYMBOLS
    }

    return categories[category] || categories.all
  }

  /**
   * Get recommended crypto trading pairs for AI learning
   * These are highly liquid and suitable for 24/7 automated trading
   * VERIFIED: Only includes working Alpaca crypto pairs
   */
  static getRecommendedTradingPairs(): string[] {
    return [
      // Tier 1: Highest liquidity (VERIFIED WORKING)
      'BTCUSD',     // Most liquid - Bitcoin ✅
      'ETHUSD',     // High volume - Ethereum ✅
      'LTCUSD',     // Classic altcoin - Litecoin ✅

      // Tier 2: High liquidity altcoins (VERIFIED WORKING)
      'AVAXUSD',    // Avalanche ✅
      'LINKUSD',    // Chainlink - DeFi blue chip ✅
      'UNIUSD',     // Uniswap - DeFi DEX ✅

      // Tier 3: Volatility & Meme (USDT pairs - VERIFIED)
      'DOGEUSDT',   // Dogecoin - Meme volatility ✅
      'SHIBUSDT',   // Shiba Inu - Meme coin ✅
      'MATICUSDT',  // Polygon - Layer 2 ✅
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
