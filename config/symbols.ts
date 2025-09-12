/**
 * Enhanced Symbol Configuration for Trading Platform
 * Supports stocks, crypto, ETFs, and indices with comprehensive categorization
 * 
 * @fileoverview Centralized symbol management with market data and trading support
 * @author Trading Platform Team
 * @version 2.0.0
 */

// =============================================================================
// Stock Symbol Categories
// =============================================================================

export const STOCK_SYMBOLS = {
  // Mega Cap Technology (Market Cap > $1T)
  mega_cap_tech: [
    'AAPL',   // Apple Inc.
    'MSFT',   // Microsoft Corporation
    'GOOGL',  // Alphabet Inc. Class A
    'GOOG',   // Alphabet Inc. Class C
    'AMZN',   // Amazon.com Inc.
    'NVDA',   // NVIDIA Corporation
    'META',   // Meta Platforms Inc.
    'TSLA'    // Tesla Inc.
  ],

  // Large Cap Growth Stocks
  large_cap_growth: [
    'NFLX',   // Netflix Inc.
    'CRM',    // Salesforce Inc.
    'ADBE',   // Adobe Inc.
    'ORCL',   // Oracle Corporation
    'NOW',    // ServiceNow Inc.
    'SHOP',   // Shopify Inc.
    'ROKU',   // Roku Inc.
    'SNOW',   // Snowflake Inc.
    'PLTR',   // Palantir Technologies Inc.
    'RBLX'    // Roblox Corporation
  ],

  // Financial Services
  financials: [
    'JPM',    // JPMorgan Chase & Co.
    'BAC',    // Bank of America Corp.
    'WFC',    // Wells Fargo & Company
    'GS',     // Goldman Sachs Group Inc.
    'MS',     // Morgan Stanley
    'C',      // Citigroup Inc.
    'BRK.B',  // Berkshire Hathaway Inc. Class B
    'V',      // Visa Inc.
    'MA',     // Mastercard Inc.
    'PYPL'    // PayPal Holdings Inc.
  ],

  // Healthcare & Pharmaceuticals
  healthcare: [
    'JNJ',    // Johnson & Johnson
    'PFE',    // Pfizer Inc.
    'UNH',    // UnitedHealth Group Inc.
    'MRNA',   // Moderna Inc.
    'ABBV',   // AbbVie Inc.
    'TMO',    // Thermo Fisher Scientific Inc.
    'DHR',    // Danaher Corporation
    'BMY',    // Bristol Myers Squibb Co.
    'AMGN',   // Amgen Inc.
    'GILD'    // Gilead Sciences Inc.
  ],

  // Consumer & Retail
  consumer: [
    'WMT',    // Walmart Inc.
    'HD',     // Home Depot Inc.
    'PG',     // Procter & Gamble Co.
    'KO',     // Coca-Cola Company
    'PEP',    // PepsiCo Inc.
    'MCD',    // McDonald's Corporation
    'SBUX',   // Starbucks Corporation
    'NKE',    // Nike Inc.
    'TGT',    // Target Corporation
    'COST'    // Costco Wholesale Corporation
  ],

  // Energy & Utilities
  energy: [
    'XOM',    // Exxon Mobil Corporation
    'CVX',    // Chevron Corporation
    'COP',    // ConocoPhillips
    'SLB',    // Schlumberger NV
    'EOG',    // EOG Resources Inc.
    'KMI',    // Kinder Morgan Inc.
    'OKE',    // ONEOK Inc.
    'WMB',    // Williams Companies Inc.
    'EPD',    // Enterprise Products Partners LP
    'ET'      // Energy Transfer LP
  ],

  // Industrial & Manufacturing
  industrials: [
    'BA',     // Boeing Company
    'CAT',    // Caterpillar Inc.
    'GE',     // General Electric Company
    'MMM',    // 3M Company
    'HON',    // Honeywell International Inc.
    'UPS',    // United Parcel Service Inc.
    'FDX',    // FedEx Corporation
    'LMT',    // Lockheed Martin Corporation
    'RTX',    // Raytheon Technologies Corp.
    'DE'      // Deere & Company
  ],

  // Sector ETFs for Diversification
  sector_etfs: [
    'XLK',    // Technology Select Sector SPDR Fund
    'XLF',    // Financial Select Sector SPDR Fund
    'XLV',    // Health Care Select Sector SPDR Fund
    'XLE',    // Energy Select Sector SPDR Fund
    'XLI',    // Industrial Select Sector SPDR Fund
    'XLB',    // Materials Select Sector SPDR Fund
    'XLRE',   // Real Estate Select Sector SPDR Fund
    'XLU',    // Utilities Select Sector SPDR Fund
    'XLP',    // Consumer Staples Select Sector SPDR Fund
    'XLY'     // Consumer Discretionary Select Sector SPDR Fund
  ],

  // Market Index ETFs
  market_indices: [
    'SPY',    // SPDR S&P 500 ETF Trust
    'QQQ',    // Invesco QQQ Trust
    'IWM',    // iShares Russell 2000 ETF
    'VTI',    // Vanguard Total Stock Market ETF
    'VOO',    // Vanguard S&P 500 ETF
    'VEA',    // Vanguard FTSE Developed Markets ETF
    'VWO',    // Vanguard FTSE Emerging Markets ETF
    'AGG',    // iShares Core U.S. Aggregate Bond ETF
    'TLT',    // iShares 20+ Year Treasury Bond ETF
    'GLD'     // SPDR Gold Shares
  ],

  // Emerging & High-Growth
  emerging_growth: [
    'RIVN',   // Rivian Automotive Inc.
    'LCID',   // Lucid Group Inc.
    'SOFI',   // SoFi Technologies Inc.
    'HOOD',   // Robinhood Markets Inc.
    'COIN',   // Coinbase Global Inc.
    'UPST',   // Upstart Holdings Inc.
    'OPEN',   // Opendoor Technologies Inc.
    'WISH',   // ContextLogic Inc.
    'CLOV',   // Clover Health Investments Corp.
    'SPCE'    // Virgin Galactic Holdings Inc.
  ]
} as const

// =============================================================================
// Cryptocurrency Symbol Categories
// =============================================================================

export const CRYPTO_SYMBOLS = {
  // Major Cryptocurrencies (Market Cap > $100B)
  major: [
    'BTC-USD',   // Bitcoin
    'ETH-USD',   // Ethereum
    'BNB-USD',   // Binance Coin
    'XRP-USD',   // Ripple
    'ADA-USD',   // Cardano
    'DOGE-USD',  // Dogecoin
    'SOL-USD',   // Solana
    'TRX-USD',   // TRON
    'DOT-USD',   // Polkadot
    'MATIC-USD'  // Polygon
  ],

  // DeFi (Decentralized Finance) Tokens
  defi: [
    'UNI-USD',   // Uniswap
    'AAVE-USD',  // Aave
    'COMP-USD',  // Compound
    'MKR-USD',   // Maker
    'SUSHI-USD', // SushiSwap
    'CRV-USD',   // Curve DAO Token
    'YFI-USD',   // yearn.finance
    'CAKE-USD',  // PancakeSwap
    'ALPHA-USD', // Alpha Finance Lab
    'RUNE-USD'   // THORChain
  ],

  // Layer 1 Blockchain Protocols
  layer1: [
    'AVAX-USD',  // Avalanche
    'ATOM-USD',  // Cosmos
    'NEAR-USD',  // NEAR Protocol
    'ALGO-USD',  // Algorand
    'EGLD-USD',  // MultiversX (Elrond)
    'FTM-USD',   // Fantom
    'HBAR-USD',  // Hedera
    'ICP-USD',   // Internet Computer
    'FLOW-USD',  // Flow
    'ROSE-USD'   // Oasis Network
  ],

  // Layer 2 Scaling Solutions
  layer2: [
    'LRC-USD',   // Loopring
    'IMX-USD',   // Immutable X
    'OMG-USD',   // OMG Network
    'METIS-USD', // Metis
    'BOBA-USD',  // Boba Network
    'ARB-USD',   // Arbitrum (if available)
    'OP-USD'     // Optimism (if available)
  ],

  // Stablecoins
  stablecoins: [
    'USDC-USD',  // USD Coin
    'USDT-USD',  // Tether
    'DAI-USD',   // Dai
    'BUSD-USD',  // Binance USD
    'TUSD-USD',  // TrueUSD
    'USDP-USD',  // Pax Dollar
    'FRAX-USD',  // Frax
    'UST-USD'    // TerraUSD (if still available)
  ],

  // NFT & Gaming Tokens
  nft_gaming: [
    'APE-USD',   // ApeCoin
    'SAND-USD',  // The Sandbox
    'MANA-USD',  // Decentraland
    'AXS-USD',   // Axie Infinity
    'GALA-USD',  // Gala
    'ENJ-USD',   // Enjin Coin
    'CHZ-USD',   // Chiliz
    'THETA-USD', // Theta Network
    'LOOKS-USD', // LooksRare
    'RARE-USD'   // SuperRare
  ],

  // Meme & Social Tokens
  meme_social: [
    'SHIB-USD',  // Shiba Inu
    'FLOKI-USD', // Floki Inu
    'PEPE-USD',  // Pepe
    'BABYDOGE-USD', // Baby Doge Coin
    'SAFEMOON-USD', // SafeMoon
    'INU-USD'    // Shiba Predator
  ],

  // Enterprise & Corporate Crypto
  enterprise: [
    'LINK-USD',  // Chainlink
    'VET-USD',   // VeChain
    'XLM-USD',   // Stellar
    'IOTA-USD',  // IOTA
    'HOLO-USD',  // Holo
    'BAT-USD',   // Basic Attention Token
    'ZIL-USD',   // Zilliqa
    'REQ-USD'    // Request Network
  ],

  // Privacy Coins
  privacy: [
    'XMR-USD',   // Monero
    'ZEC-USD',   // Zcash
    'DASH-USD',  // Dash
    'XVG-USD',   // Verge
    'BEAM-USD',  // Beam
    'GRIN-USD'   // Grin
  ]
} as const

// =============================================================================
// Symbol Metadata & Configuration
// =============================================================================

export interface SymbolMetadata {
  symbol: string
  name: string
  category: string
  sector?: string
  marketCap?: 'large' | 'mid' | 'small' | 'micro'
  volatility?: 'low' | 'medium' | 'high' | 'extreme'
  tradingHours?: '24/7' | 'market_hours' | 'extended'
  minOrderSize?: number
  tickSize?: number
  description?: string
}

export const SYMBOL_METADATA: Record<string, SymbolMetadata> = {
  // Stock Examples
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'mega_cap_tech',
    sector: 'Technology',
    marketCap: 'large',
    volatility: 'medium',
    tradingHours: 'market_hours',
    minOrderSize: 1,
    tickSize: 0.01,
    description: 'Consumer electronics and software company'
  },
  
  // Crypto Examples
  'BTC-USD': {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    category: 'major',
    sector: 'Cryptocurrency',
    marketCap: 'large',
    volatility: 'high',
    tradingHours: '24/7',
    minOrderSize: 0.00001,
    tickSize: 0.01,
    description: 'First and largest cryptocurrency by market cap'
  },
  
  'ETH-USD': {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    category: 'major',
    sector: 'Cryptocurrency',
    marketCap: 'large',
    volatility: 'high',
    tradingHours: '24/7',
    minOrderSize: 0.0001,
    tickSize: 0.01,
    description: 'Smart contract platform and second-largest cryptocurrency'
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all available symbols across all categories
 */
export function getAllSymbols(): string[] {
  const stockSymbols = Object.values(STOCK_SYMBOLS).flat()
  const cryptoSymbols = Object.values(CRYPTO_SYMBOLS).flat()
  return [...stockSymbols, ...cryptoSymbols]
}

/**
 * Get symbols by asset type
 */
export function getSymbolsByType(type: 'stocks' | 'crypto'): string[] {
  if (type === 'stocks') {
    return Object.values(STOCK_SYMBOLS).flat()
  }
  return Object.values(CRYPTO_SYMBOLS).flat()
}

/**
 * Get symbols by category
 */
export function getSymbolsByCategory(category: string): string[] {
  const stockCategory = STOCK_SYMBOLS[category as keyof typeof STOCK_SYMBOLS]
  const cryptoCategory = CRYPTO_SYMBOLS[category as keyof typeof CRYPTO_SYMBOLS]
  
  if (stockCategory) return [...stockCategory]
  if (cryptoCategory) return [...cryptoCategory]
  return []
}

/**
 * Detect asset type from symbol format
 */
export function detectAssetType(symbol: string): 'stock' | 'crypto' {
  return symbol.includes('-USD') || symbol.includes('-') ? 'crypto' : 'stock'
}

/**
 * Get symbol metadata with defaults
 */
export function getSymbolMetadata(symbol: string): SymbolMetadata {
  const existing = SYMBOL_METADATA[symbol]
  if (existing) return existing
  
  // Generate default metadata
  const assetType = detectAssetType(symbol)
  return {
    symbol,
    name: symbol.replace('-USD', ''),
    category: 'unknown',
    sector: assetType === 'crypto' ? 'Cryptocurrency' : 'Unknown',
    marketCap: 'unknown' as any,
    volatility: assetType === 'crypto' ? 'high' : 'medium',
    tradingHours: assetType === 'crypto' ? '24/7' : 'market_hours',
    minOrderSize: assetType === 'crypto' ? 0.0001 : 1,
    tickSize: 0.01
  }
}

/**
 * Search symbols by name or symbol
 */
export function searchSymbols(query: string): string[] {
  const allSymbols = getAllSymbols()
  const lowerQuery = query.toLowerCase()
  
  return allSymbols.filter(symbol => {
    const metadata = getSymbolMetadata(symbol)
    return (
      symbol.toLowerCase().includes(lowerQuery) ||
      metadata.name.toLowerCase().includes(lowerQuery)
    )
  })
}

/**
 * Get trending/popular symbols for quick access
 */
export function getTrendingSymbols(): {
  stocks: string[]
  crypto: string[]
} {
  return {
    stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'SPY'],
    crypto: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'ADA-USD', 'DOGE-USD']
  }
}

// Export types for use in other modules
export type StockCategory = keyof typeof STOCK_SYMBOLS
export type CryptoCategory = keyof typeof CRYPTO_SYMBOLS
export type AssetType = 'stock' | 'crypto'