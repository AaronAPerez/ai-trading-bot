import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'
import { AlpacaSymbolManager } from '@/lib/symbols/AlpacaSymbolManager'

let symbolManager: AlpacaSymbolManager | null = null

function getSymbolManager() {
  if (!symbolManager) {
    const alpacaClient = new AlpacaClient({
      key: process.env.APCA_API_KEY_ID!,
      secret: process.env.APCA_API_SECRET_KEY!,
      paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
    })
    symbolManager = new AlpacaSymbolManager(alpacaClient)
  }
  return symbolManager
}

// GET /api/symbols - Get symbols with various options
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'popular'
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const filter = url.searchParams.get('filter')

    const manager = getSymbolManager()

    switch (action) {
      case 'all':
        const allAssets = await manager.getAllTradableAssets()
        return NextResponse.json({
          symbols: allAssets.map(asset => asset.symbol),
          total: allAssets.length,
          lastUpdate: manager.getLastUpdateTime()
        })

      case 'popular':
        const popularSymbols = await manager.getPopularSymbols(limit)
        return NextResponse.json({
          symbols: popularSymbols,
          total: popularSymbols.length,
          category: 'Popular Stocks'
        })

      case 'categories':
        const categories = manager.getAllCategories()
        return NextResponse.json({
          categories: categories.map(({ key, category }) => ({
            key,
            name: category.name,
            description: category.description,
            symbolCount: category.symbols.length,
            symbols: category.symbols.slice(0, 10) // Preview
          }))
        })

      case 'category':
        if (!category) {
          return NextResponse.json(
            { error: 'Category parameter required' },
            { status: 400 }
          )
        }

        const categorySymbols = manager.getSymbolsByCategory(category)
        const categories_info = manager.getAllCategories()
        const categoryInfo = categories_info.find(c => c.key === category)

        return NextResponse.json({
          symbols: categorySymbols.slice(0, limit),
          total: categorySymbols.length,
          category: categoryInfo?.category.name || category,
          description: categoryInfo?.category.description
        })

      case 'market_cap':
        const marketCap = url.searchParams.get('market_cap') as 'mega' | 'large' | 'mid' | 'small'
        if (!marketCap) {
          return NextResponse.json(
            { error: 'market_cap parameter required (mega, large, mid, small)' },
            { status: 400 }
          )
        }

        const marketCapSymbols = await manager.getSymbolsByMarketCap(marketCap)
        return NextResponse.json({
          symbols: marketCapSymbols.slice(0, limit),
          total: marketCapSymbols.length,
          category: `${marketCap.charAt(0).toUpperCase() + marketCap.slice(1)} Cap Stocks`
        })

      case 'search':
        if (!search) {
          return NextResponse.json(
            { error: 'search parameter required' },
            { status: 400 }
          )
        }

        const searchResults = await manager.searchSymbols(search, limit)
        return NextResponse.json({
          symbols: searchResults.map(asset => ({
            symbol: asset.symbol,
            name: asset.name,
            exchange: asset.exchange,
            tradable: asset.tradable,
            marginable: asset.marginable,
            shortable: asset.shortable,
            fractionable: asset.fractionable
          })),
          total: searchResults.length,
          query: search
        })

      case 'filtered':
        const filterParams = filter ? JSON.parse(decodeURIComponent(filter)) : {}
        const filteredSymbols = await manager.getFilteredSymbols(filterParams)
        return NextResponse.json({
          symbols: filteredSymbols.slice(0, limit),
          total: filteredSymbols.length,
          filter: filterParams
        })

      case 'random':
        const randomSymbols = await manager.getRandomSymbols(limit)
        return NextResponse.json({
          symbols: randomSymbols,
          total: randomSymbols.length,
          category: 'Random Selection'
        })

      case 'optimal_watchlist':
        const size = parseInt(url.searchParams.get('size') || '20')
        const includeETFs = url.searchParams.get('includeETFs') === 'true'
        const includeCrypto = url.searchParams.get('includeCrypto') === 'true'
        const riskLevel = url.searchParams.get('riskLevel') as 'low' | 'medium' | 'high' || 'medium'

        const optimalWatchlist = await manager.generateOptimalWatchlist({
          size,
          includeETFs,
          includeCrypto,
          riskLevel
        })

        return NextResponse.json({
          symbols: optimalWatchlist,
          total: optimalWatchlist.length,
          category: `Optimal Watchlist (${riskLevel} risk)`,
          criteria: { size, includeETFs, includeCrypto, riskLevel }
        })

      case 'stats':
        return NextResponse.json({
          totalSymbols: manager.getTotalSymbolCount(),
          lastUpdate: manager.getLastUpdateTime(),
          categories: manager.getAllCategories().length,
          availableActions: [
            'all', 'popular', 'categories', 'category', 'market_cap',
            'search', 'filtered', 'random', 'optimal_watchlist', 'stats'
          ]
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Available: all, popular, categories, category, market_cap, search, filtered, random, optimal_watchlist, stats' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Symbols API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch symbols',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// POST /api/symbols - Update symbol watchlist or configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    const manager = getSymbolManager()

    switch (action) {
      case 'refresh':
        await manager.getAllTradableAssets(true) // Force refresh
        return NextResponse.json({
          success: true,
          message: 'Symbol list refreshed',
          totalSymbols: manager.getTotalSymbolCount(),
          lastUpdate: manager.getLastUpdateTime()
        })

      case 'generate_watchlist':
        const { criteria } = body
        if (!criteria) {
          return NextResponse.json(
            { error: 'Criteria required for watchlist generation' },
            { status: 400 }
          )
        }

        const generatedWatchlist = await manager.generateOptimalWatchlist(criteria)
        return NextResponse.json({
          success: true,
          watchlist: generatedWatchlist,
          criteria,
          count: generatedWatchlist.length
        })

      case 'validate_symbols':
        const { symbols } = body
        if (!Array.isArray(symbols)) {
          return NextResponse.json(
            { error: 'Symbols array required' },
            { status: 400 }
          )
        }

        const allAssets = await manager.getAllTradableAssets()
        const validSymbols = symbols.filter(symbol =>
          allAssets.some(asset => asset.symbol === symbol && asset.tradable)
        )

        const invalidSymbols = symbols.filter(symbol => !validSymbols.includes(symbol))

        return NextResponse.json({
          valid: validSymbols,
          invalid: invalidSymbols,
          validCount: validSymbols.length,
          invalidCount: invalidSymbols.length
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Available: refresh, generate_watchlist, validate_symbols' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Symbols POST error:', error)
    return NextResponse.json(
      {
        error: 'Symbol operation failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}