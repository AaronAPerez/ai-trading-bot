import { AlpacaClient } from '@/lib/alpaca/client'

export interface AlpacaAsset {
  id: string
  class: string
  exchange: string
  symbol: string
  name: string
  status: string
  tradable: boolean
  marginable: boolean
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  min_order_size?: string
  min_trade_increment?: string
  price_increment?: string
  attributes?: string[]
}

export interface SymbolCategory {
  name: string
  symbols: string[]
  description: string
}

export interface SymbolFilter {
  exchanges?: string[]
  minPrice?: number
  maxPrice?: number
  minVolume?: number
  marketCap?: 'small' | 'mid' | 'large' | 'mega'
  sectors?: string[]
  tradable?: boolean
  marginable?: boolean
  shortable?: boolean
  fractionable?: boolean
}

export class AlpacaSymbolManager {
  private alpacaClient: AlpacaClient
  private allAssets: AlpacaAsset[] = []
  private symbolCategories: Map<string, SymbolCategory> = new Map()
  private lastUpdate: Date = new Date(0)
  private updateInterval = 24 * 60 * 60 * 1000 // 24 hours
  private allSymbolsCache: string[] = []
  private lastSymbolFetch: Date = new Date(0)
  private symbolCacheInterval = 12 * 60 * 60 * 1000 // 12 hours - cache symbols longer

  constructor(alpacaClient: AlpacaClient) {
    this.alpacaClient = alpacaClient
    this.initializeCategories()
  }

  private initializeCategories() {
    // Popular categories for easier selection
    this.symbolCategories.set('mega_cap', {
      name: 'Mega Cap (>$200B)',
      symbols: [
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META',
        'BRK.A', 'BRK.B', 'UNH', 'JNJ', 'XOM', 'V', 'PG', 'JPM', 'MA', 'HD'
      ],
      description: 'Largest companies by market capitalization'
    })

    this.symbolCategories.set('large_cap', {
      name: 'Large Cap ($10B-$200B)',
      symbols: [
        'ABBV', 'PFE', 'AVGO', 'KO', 'COST', 'DIS', 'ADBE', 'PEP', 'TMO', 'NFLX',
        'CRM', 'ABT', 'CVX', 'MRK', 'VZ', 'ORCL', 'BAC', 'WFC', 'CSCO', 'NKE'
      ],
      description: 'Large established companies'
    })

    this.symbolCategories.set('growth_tech', {
      name: 'Growth Tech',
      symbols: [
        'NVDA', 'TSLA', 'AMD', 'CRM', 'SNOW', 'PLTR', 'ROKU', 'ZM', 'DOCU', 'TWLO',
        'OKTA', 'CRWD', 'NET', 'DDOG', 'MDB', 'ESTC', 'FVRR', 'UPWK', 'SHOP', 'SQ'
      ],
      description: 'High-growth technology companies'
    })

    this.symbolCategories.set('dividend_stocks', {
      name: 'Dividend Aristocrats',
      symbols: [
        'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'MMM', 'CAT', 'HD', 'LOW',
        'CVX', 'XOM', 'IBM', 'VZ', 'T', 'O', 'ABBV', 'KMB', 'CL', 'SYY'
      ],
      description: 'Reliable dividend-paying stocks'
    })

    this.symbolCategories.set('biotech', {
      name: 'Biotechnology',
      symbols: [
        'GILD', 'BIIB', 'REGN', 'VRTX', 'ILMN', 'MRNA', 'BNTX', 'AMGN', 'CELG',
        'BMRN', 'ALXN', 'INCY', 'SGEN', 'TECH', 'EXAS', 'ARKG', 'CRSP', 'EDIT'
      ],
      description: 'Biotechnology and pharmaceutical companies'
    })

    this.symbolCategories.set('fintech', {
      name: 'Financial Technology',
      symbols: [
        'PYPL', 'SQ', 'V', 'MA', 'ADYEY', 'COIN', 'HOOD', 'SOFI', 'UPST', 'AFRM',
        'LC', 'TREE', 'LPRO', 'TMDX', 'PFSI', 'VIRT', 'IBKR', 'MKTX', 'CME', 'ICE'
      ],
      description: 'Financial technology and payment companies'
    })

    this.symbolCategories.set('clean_energy', {
      name: 'Clean Energy & ESG',
      symbols: [
        'TSLA', 'NEE', 'ENPH', 'SEDG', 'FSLR', 'RUN', 'PLUG', 'BE', 'ICLN', 'QCLN',
        'TAN', 'PBW', 'ARKQ', 'LIT', 'REMX', 'COPX', 'SLV', 'PALL', 'JJC', 'DBA'
      ],
      description: 'Clean energy and ESG-focused companies'
    })

    this.symbolCategories.set('ai_robotics', {
      name: 'AI & Robotics',
      symbols: [
        'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'PLTR', 'C3AI', 'AI', 'ROBO', 'BOTZ',
        'IRBT', 'ABB', 'ROK', 'EMR', 'HON', 'ITW', 'PH', 'TXN', 'ADI', 'MXIM'
      ],
      description: 'Artificial intelligence and robotics companies'
    })

    this.symbolCategories.set('crypto_exposed', {
      name: 'Crypto Exposure',
      symbols: [
        'COIN', 'MSTR', 'TSLA', 'SQ', 'PYPL', 'HOOD', 'RIOT', 'MARA', 'HUT', 'BITF',
        'GBTC', 'ETHE', 'BITO', 'BTF', 'BTCC', 'BITI', 'SATO', 'BLOK', 'LEGR', 'BLCN'
      ],
      description: 'Companies with cryptocurrency exposure'
    })

    this.symbolCategories.set('etfs_popular', {
      name: 'Popular ETFs',
      symbols: [
        'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'AGG', 'LQD', 'HYG', 'TLT',
        'GLD', 'SLV', 'USO', 'UNG', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP'
      ],
      description: 'Most popular and liquid ETFs'
    })
  }

  async getAllTradableAssets(forceRefresh = false): Promise<AlpacaAsset[]> {
    const needsUpdate = forceRefresh ||
      (Date.now() - this.lastUpdate.getTime()) > this.updateInterval ||
      this.allAssets.length === 0

    if (needsUpdate) {
      console.log('🔄 Fetching all tradable assets from Alpaca...')
      try {
        // Use the Alpaca client to get all assets
        const assets = await this.fetchAssetsFromAlpaca()

        // Filter for tradable US equities
        this.allAssets = assets.filter(asset =>
          asset.tradable &&
          asset.status === 'active' &&
          asset.class === 'us_equity' &&
          !asset.symbol.includes('.') && // Remove complex symbols
          asset.symbol.length <= 5 // Standard symbol length
        )

        this.lastUpdate = new Date()
        console.log(`✅ Loaded ${this.allAssets.length} tradable symbols`)
      } catch (error) {
        console.error('Failed to fetch assets from Alpaca:', error)
        if (this.allAssets.length === 0) {
          // Fallback to predefined symbols if API fails
          this.loadFallbackSymbols()
        }
      }
    }

    return this.allAssets
  }

  private async fetchAssetsFromAlpaca(): Promise<AlpacaAsset[]> {
    // This would use the actual Alpaca API to fetch assets
    // For now, we'll simulate with a comprehensive list
    return this.getComprehensiveSymbolList()
  }

  private getComprehensiveSymbolList(): AlpacaAsset[] {
    // Comprehensive list of popular tradable symbols
    const symbols = [
      // Mega Cap Technology
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'ADBE',
      'CRM', 'ORCL', 'AVGO', 'CSCO', 'AMD', 'QCOM', 'INTC', 'TXN', 'AMAT', 'ADI',

      // Financial Services
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SPGI', 'AXP', 'V', 'MA', 'PYPL',
      'COF', 'USB', 'TFC', 'PNC', 'SCHW', 'CME', 'ICE', 'MCO',

      // Healthcare & Biotech
      'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'MRK', 'DHR', 'BMY', 'AMGN',
      'GILD', 'BIIB', 'REGN', 'VRTX', 'ILMN', 'MRNA', 'BNTX', 'MDT', 'SYK', 'ISRG',

      // Consumer & Retail
      'WMT', 'HD', 'PG', 'KO', 'PEP', 'MCD', 'COST', 'LOW', 'TGT', 'SBUX',
      'NKE', 'DIS', 'CMCSA', 'VZ', 'T', 'CHTR', 'PM', 'MO', 'CL', 'KMB',

      // Industrial & Energy
      'CAT', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'GE', 'MMM', 'DE', 'EMR',
      'XOM', 'CVX', 'COP', 'EOG', 'PXD', 'KMI', 'WMB', 'OKE', 'SLB', 'HAL',

      // Growth Technology
      'SNOW', 'PLTR', 'ROKU', 'ZM', 'DOCU', 'TWLO', 'OKTA', 'CRWD', 'NET', 'DDOG',
      'MDB', 'ESTC', 'FVRR', 'UPWK', 'SHOP', 'SQ', 'RBLX', 'UNITY', 'U', 'PATH',

      // Fintech & Crypto
      'COIN', 'HOOD', 'SOFI', 'UPST', 'AFRM', 'LC', 'MSTR', 'RIOT', 'MARA', 'HUT',

      // Clean Energy & ESG
      'NEE', 'ENPH', 'SEDG', 'FSLR', 'RUN', 'PLUG', 'BE', 'ICLN', 'TAN', 'PBW',

      // REITs
      'O', 'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'EXR', 'AVB', 'EQR', 'WELL',

      // Materials & Commodities
      'LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'GOLD', 'AA', 'X', 'CLF',

      // Communication Services
      'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'CHTR', 'TMUS', 'TWTR',

      // Utilities
      'NEE', 'DUK', 'SO', 'AEP', 'EXC', 'XEL', 'PEG', 'ED', 'ETR', 'ES',

      // Popular ETFs
      'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'AGG', 'LQD', 'HYG', 'TLT',
      'GLD', 'SLV', 'USO', 'UNG', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP',
      'XLU', 'XLB', 'XLRE', 'XLY', 'ARKK', 'ARKQ', 'ARKW', 'ARKG', 'ARKF',

      // International
      'ASML', 'TSM', 'BABA', 'PDD', 'NIO', 'XPEV', 'LI', 'BIDU', 'JD', 'NTES',
      'SAP', 'SHOP', 'SPOT', 'SE', 'MELI', 'CRSP', 'EDIT', 'BEAM', 'NTLA', 'VERV'
    ]

    return symbols.map(symbol => ({
      id: `${symbol}_id`,
      class: 'us_equity',
      exchange: 'NASDAQ',
      symbol,
      name: `${symbol} Inc.`,
      status: 'active',
      tradable: true,
      marginable: true,
      shortable: true,
      easy_to_borrow: true,
      fractionable: true,
      min_order_size: '1',
      min_trade_increment: '0.0001',
      price_increment: '0.01',
      attributes: []
    }))
  }

  private loadFallbackSymbols() {
    console.log('📦 Loading fallback symbol list...')
    this.allAssets = this.getComprehensiveSymbolList()
    console.log(`✅ Loaded ${this.allAssets.length} fallback symbols`)
  }

  async getFilteredSymbols(filter: SymbolFilter): Promise<string[]> {
    const assets = await this.getAllTradableAssets()

    return assets
      .filter(asset => {
        // Apply filters
        if (filter.tradable !== undefined && asset.tradable !== filter.tradable) return false
        if (filter.marginable !== undefined && asset.marginable !== filter.marginable) return false
        if (filter.shortable !== undefined && asset.shortable !== filter.shortable) return false
        if (filter.fractionable !== undefined && asset.fractionable !== filter.fractionable) return false
        if (filter.exchanges && !filter.exchanges.includes(asset.exchange)) return false

        return true
      })
      .map(asset => asset.symbol)
  }

  getSymbolsByCategory(categoryKey: string): string[] {
    const category = this.symbolCategories.get(categoryKey)
    return category ? category.symbols : []
  }

  getAllCategories(): { key: string; category: SymbolCategory }[] {
    return Array.from(this.symbolCategories.entries()).map(([key, category]) => ({
      key,
      category
    }))
  }

  async getPopularSymbols(limit = 100): Promise<string[]> {
    // Return most popular symbols based on market cap and volume
    const popularSymbols = [
      // Top 50 by market cap
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'UNH', 'JNJ',
      'XOM', 'V', 'PG', 'JPM', 'MA', 'HD', 'CVX', 'ABBV', 'PFE', 'AVGO',
      'KO', 'COST', 'PEP', 'TMO', 'ABT', 'DIS', 'ADBE', 'WFC', 'CRM', 'VZ',
      'BAC', 'CSCO', 'AMD', 'NFLX', 'QCOM', 'INTC', 'CMCSA', 'NKE', 'T', 'MRK',
      'HON', 'UPS', 'DHR', 'CAT', 'IBM', 'TXN', 'RTX', 'LOW', 'AMAT', 'ORCL',

      // Popular growth stocks
      'SNOW', 'PLTR', 'ROKU', 'ZM', 'DOCU', 'TWLO', 'OKTA', 'CRWD', 'NET', 'DDOG',
      'MDB', 'SHOP', 'SQ', 'PYPL', 'COIN', 'HOOD', 'SOFI', 'UPST', 'AFRM', 'RBLX',

      // ETFs
      'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'AGG', 'LQD', 'HYG', 'TLT',
      'GLD', 'SLV', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP', 'ARKK', 'ARKQ',

      // Clean Energy
      'ENPH', 'SEDG', 'FSLR', 'RUN', 'PLUG', 'BE', 'NEE', 'ICLN', 'TAN', 'PBW'
    ]

    return popularSymbols.slice(0, limit)
  }

  async getSymbolsByMarketCap(category: 'mega' | 'large' | 'mid' | 'small'): Promise<string[]> {
    switch (category) {
      case 'mega':
        return this.getSymbolsByCategory('mega_cap')
      case 'large':
        return this.getSymbolsByCategory('large_cap')
      case 'mid':
        return [
          'ROKU', 'ZM', 'DOCU', 'TWLO', 'OKTA', 'CRWD', 'NET', 'DDOG', 'MDB', 'SHOP',
          'SQ', 'COIN', 'HOOD', 'SOFI', 'UPST', 'AFRM', 'RBLX', 'UNITY', 'PLTR', 'SNOW'
        ]
      case 'small':
        return [
          'FVRR', 'UPWK', 'PATH', 'AI', 'SATO', 'HUT', 'RIOT', 'MARA', 'BITF', 'BE',
          'PLUG', 'FSLR', 'RUN', 'SEDG', 'ENPH', 'LC', 'TREE', 'PFSI', 'VIRT', 'LPRO'
        ]
      default:
        return []
    }
  }

  async searchSymbols(query: string, limit = 20): Promise<AlpacaAsset[]> {
    const assets = await this.getAllTradableAssets()
    const queryUpper = query.toUpperCase()

    return assets
      .filter(asset =>
        asset.symbol.includes(queryUpper) ||
        asset.name.toUpperCase().includes(queryUpper)
      )
      .slice(0, limit)
  }

  async getRandomSymbols(count = 10, filter?: SymbolFilter): Promise<string[]> {
    const assets = filter
      ? await this.getFilteredSymbols(filter)
      : (await this.getAllTradableAssets()).map(a => a.symbol)

    // Shuffle and return random selection
    const shuffled = [...assets].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  getTotalSymbolCount(): number {
    return this.allAssets.length
  }

  getLastUpdateTime(): Date {
    return this.lastUpdate
  }

  // NEW: Get ALL available symbols from Alpaca (thousands of symbols)
  async getAllAvailableSymbols(options: {
    includeETFs?: boolean
    includeCrypto?: boolean
    limit?: number
  } = {}): Promise<string[]> {
    // Check cache first to avoid unnecessary API calls
    const needsRefresh = (Date.now() - this.lastSymbolFetch.getTime()) > this.symbolCacheInterval || this.allSymbolsCache.length === 0

    if (!needsRefresh && this.allSymbolsCache.length > 0) {
      console.log(`📋 Using cached symbols (${this.allSymbolsCache.length} symbols) - last fetched ${Math.round((Date.now() - this.lastSymbolFetch.getTime()) / (60 * 1000))} minutes ago`)
      return options.limit ? this.allSymbolsCache.slice(0, options.limit) : this.allSymbolsCache
    }

    try {
      console.log('🔍 Fetching ALL available symbols from Alpaca API...')

      let allSymbols: string[] = []

      // Fetch US equities
      const equityResponse = await fetch('https://paper-api.alpaca.markets/v2/assets?status=active&asset_class=us_equity', {
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
        }
      })

      if (equityResponse.ok) {
        const equities = await equityResponse.json()
        const equitySymbols = equities
          .filter((asset: any) => asset.tradable && asset.status === 'active')
          .map((asset: any) => asset.symbol)

        allSymbols = allSymbols.concat(equitySymbols)
        console.log(`📈 Found ${equitySymbols.length} tradable US equity symbols`)
      }

      // Fetch crypto if requested
      if (options.includeCrypto) {
        try {
          const cryptoResponse = await fetch('https://paper-api.alpaca.markets/v2/assets?status=active&asset_class=crypto', {
            headers: {
              'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
              'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
            }
          })

          if (cryptoResponse.ok) {
            const cryptos = await cryptoResponse.json()
            const cryptoSymbols = cryptos
              .filter((asset: any) => asset.tradable && asset.status === 'active')
              .map((asset: any) => asset.symbol)

            allSymbols = allSymbols.concat(cryptoSymbols)
            console.log(`₿ Found ${cryptoSymbols.length} tradable crypto symbols`)
          }
        } catch (error) {
          console.log('⚠️ Crypto fetch failed, continuing without crypto symbols')
        }
      }

      // Remove duplicates and sort
      const uniqueSymbols = [...new Set(allSymbols)].sort()

      // Cache the results
      this.allSymbolsCache = uniqueSymbols
      this.lastSymbolFetch = new Date()

      // Apply limit if specified
      const finalSymbols = options.limit ? uniqueSymbols.slice(0, options.limit) : uniqueSymbols

      console.log(`🎯 Total available symbols: ${finalSymbols.length} (cached for 12 hours)`)
      return finalSymbols

    } catch (error) {
      console.error('❌ Failed to fetch all symbols:', error.message)

      // Use cached symbols if available, even if stale
      if (this.allSymbolsCache.length > 0) {
        console.log('📦 Using stale cached symbols due to API error...')
        return options.limit ? this.allSymbolsCache.slice(0, options.limit) : this.allSymbolsCache
      }

      console.log('📦 Falling back to comprehensive symbol list...')
      // Return our comprehensive fallback list
      const fallbackAssets = this.getComprehensiveSymbolList()
      const fallbackSymbols = fallbackAssets.map(asset => asset.symbol)

      // Cache the fallback
      this.allSymbolsCache = fallbackSymbols
      this.lastSymbolFetch = new Date()

      return options.limit ? fallbackSymbols.slice(0, options.limit) : fallbackSymbols
    }
  }

  // Generate optimal watchlist based on various criteria
  async generateOptimalWatchlist(criteria: {
    size: number
    includeETFs?: boolean
    includeCrypto?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    sectors?: string[]
  }): Promise<string[]> {
    const watchlist: string[] = []

    // Always include some mega-cap stability
    const megaCap = this.getSymbolsByCategory('mega_cap').slice(0, Math.floor(criteria.size * 0.3))
    watchlist.push(...megaCap)

    // Add growth stocks based on risk level
    const growthCount = criteria.riskLevel === 'high'
      ? Math.floor(criteria.size * 0.4)
      : criteria.riskLevel === 'medium'
        ? Math.floor(criteria.size * 0.25)
        : Math.floor(criteria.size * 0.1)

    const growthStocks = this.getSymbolsByCategory('growth_tech').slice(0, growthCount)
    watchlist.push(...growthStocks)

    // Add ETFs if requested
    if (criteria.includeETFs) {
      const etfCount = Math.floor(criteria.size * 0.2)
      const etfs = this.getSymbolsByCategory('etfs_popular').slice(0, etfCount)
      watchlist.push(...etfs)
    }

    // Add crypto exposure if requested
    if (criteria.includeCrypto) {
      const cryptoCount = Math.floor(criteria.size * 0.15)
      const cryptoStocks = this.getSymbolsByCategory('crypto_exposed').slice(0, cryptoCount)
      watchlist.push(...cryptoStocks)
    }

    // Fill remaining slots with diversified picks
    const remaining = criteria.size - watchlist.length
    if (remaining > 0) {
      const categories = ['large_cap', 'dividend_stocks', 'fintech', 'clean_energy']
      const perCategory = Math.floor(remaining / categories.length)

      categories.forEach(cat => {
        const symbols = this.getSymbolsByCategory(cat)
          .filter(s => !watchlist.includes(s))
          .slice(0, perCategory)
        watchlist.push(...symbols)
      })
    }

    // Remove duplicates and trim to exact size
    return [...new Set(watchlist)].slice(0, criteria.size)
  }
}