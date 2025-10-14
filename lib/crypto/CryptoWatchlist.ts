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
   * EXPANDED: More symbols for increased trading opportunities
   */
  static readonly TOP_CRYPTO_SYMBOLS = [
    // Tier 1: Major Cryptocurrencies (Highest Volume)
    'BTCUSD',   // Bitcoin - Most liquid ✅
    'ETHUSD',   // Ethereum - High volume ✅
    'LTCUSD',   // Litecoin - Silver to Bitcoin's gold ✅
    'BCHUSD',   // Bitcoin Cash - BTC fork ✅

    // Tier 2: Popular Layer 1s & DeFi Blue Chips
    'AVAXUSD',  // Avalanche - Fast L1 ✅
    'SOLUSD',   // Solana - High performance L1 ✅
    'ADAUSD',   // Cardano - Popular L1 ✅
    'DOTUSD',   // Polkadot - Interoperability ✅
    'ATOMUSD',  // Cosmos - IBC ecosystem ✅
    'NEARUSD',  // NEAR Protocol - Developer activity ✅
    'ALGOUSD',  // Algorand - Fast consensus ✅
    'FTMUSD',   // Fantom - Low fees ✅

    // Tier 3: DeFi Leaders
    'LINKUSD',  // Chainlink - Oracle leader ✅
    'UNIUSD',   // Uniswap - DEX leader ✅
    'AAVEUSD',  // Aave - Lending protocol ✅
    'CRVUSD',   // Curve - Stablecoin DEX ✅
    'MKRUSD',   // Maker - DeFi OG ✅
    'COMPUSD',  // Compound - Lending ✅
    'SNXUSD',   // Synthetix - Derivatives ✅

    // Tier 4: Gaming & NFT
    'MANAUSD',  // Decentraland - Metaverse ✅
    'SANDUSD',  // The Sandbox - Gaming ✅
    'AXSUSD',   // Axie Infinity - Gaming ✅
    'APEUSD',   // ApeCoin - NFT ecosystem ✅
    'ENJUSD',   // Enjin - Gaming tokens ✅
    'GALAUSD',  // Gala - Gaming platform ✅

    // Tier 5: Meme Coins (High Volatility)
    'DOGEUSDT', // Dogecoin - Meme coin ✅
    'SHIBUSDT', // Shiba Inu - Meme coin ✅
    'PEPEUSDT', // Pepe - Popular meme ✅

    // Tier 6: New Layer 1s & Trending
    'SUIUSD',   // Sui - New L1 ✅
    'APTUSD',   // Aptos - Move language ✅
    'SEIUSD',   // Sei - Trading focused ✅
    'INJUSD',   // Injective - DeFi focused ✅
    'TIAUSD',   // Celestia - Modular blockchain ✅
    'WLDUSD',   // Worldcoin - AI narrative ✅

    // Tier 7: Additional Popular Coins
    'XRPUSD',   // Ripple - Cross-border payments ✅
    'TRXUSD',   // TRON - Popular in Asia ✅
    'XLMUSD',   // Stellar - Payments ✅
    'VETUSD',   // VeChain - Enterprise ✅
    'ETCUSD',   // Ethereum Classic - Mining ✅
    'FILUSD',   // Filecoin - Storage ✅
    'HBARUSD',  // Hedera - Enterprise partnerships ✅
    'ICPUSD',   // Internet Computer - Web3 ✅
    'FLOWUSD',  // Flow - NFT ecosystem ✅
    'THETAUSD', // Theta - Video streaming ✅
    'CHZUSD',   // Chiliz - Sports tokens ✅

    // Tier 8: Layer 2 & Scaling
    'MATICUSDT',// Polygon - Layer 2 ✅
    'OPUSD',    // Optimism - L2 scaling ✅
    'ARBUSD',   // Arbitrum - L2 scaling ✅
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
   * Get crypto symbols by category (EXPANDED)
   */
  static getCryptosByCategory(category: 'major' | 'layer1' | 'defi' | 'gaming' | 'meme' | 'trending' | 'all' = 'all'): string[] {
    const categories = {
      major: ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD'],
      layer1: ['AVAXUSD', 'SOLUSD', 'ADAUSD', 'DOTUSD', 'ATOMUSD', 'NEARUSD', 'ALGOUSD', 'FTMUSD'],
      defi: ['LINKUSD', 'UNIUSD', 'AAVEUSD', 'CRVUSD', 'MKRUSD', 'COMPUSD', 'SNXUSD'],
      gaming: ['MANAUSD', 'SANDUSD', 'AXSUSD', 'APEUSD', 'ENJUSD', 'GALAUSD'],
      meme: ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT'],
      trending: ['SUIUSD', 'APTUSD', 'SEIUSD', 'INJUSD', 'TIAUSD', 'WLDUSD'],
      all: this.TOP_CRYPTO_SYMBOLS
    }

    return categories[category] || categories.all
  }

  /**
   * Get recommended crypto trading pairs for AI learning
   * These are highly liquid and suitable for 24/7 automated trading
   * EXPANDED: More opportunities for trading
   */
  static getRecommendedTradingPairs(): string[] {
    return [
      // Tier 1: Highest liquidity
      'BTCUSD',     // Bitcoin - Most liquid
      'ETHUSD',     // Ethereum - High volume
      'LTCUSD',     // Litecoin - Classic alt
      'BCHUSD',     // Bitcoin Cash

      // Tier 2: Popular Layer 1s
      'SOLUSD',     // Solana - High performance
      'AVAXUSD',    // Avalanche - Fast L1
      'ADAUSD',     // Cardano - Popular
      'DOTUSD',     // Polkadot - Interop
      'ATOMUSD',    // Cosmos - IBC
      'NEARUSD',    // NEAR - Developer activity

      // Tier 3: DeFi Leaders
      'LINKUSD',    // Chainlink - Oracles
      'UNIUSD',     // Uniswap - DEX
      'AAVEUSD',    // Aave - Lending

      // Tier 4: Trending & New L1s
      'SUIUSD',     // Sui - New L1
      'APTUSD',     // Aptos - Move language
      'INJUSD',     // Injective - DeFi

      // Tier 5: Volatility & Meme
      'DOGEUSDT',   // Dogecoin - Meme volatility
      'SHIBUSDT',   // Shiba Inu - Meme coin
      'PEPEUSDT',   // Pepe - Popular meme

      // Tier 6: Additional Popular
      'XRPUSD',     // Ripple - Payments
      'MATICUSDT',  // Polygon - Layer 2
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
