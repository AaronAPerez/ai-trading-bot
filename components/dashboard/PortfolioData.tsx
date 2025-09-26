// =============================================================================
// Helper Functions
// =============================================================================

/**
 *  basic portfolio data with advanced metrics
 */
async function PortfolioData(portfolioData: any, quotes: any = {}, includeAnalysis: boolean = false) {
  const positions = portfolioData.positions || []
  const Positions = []

  // Process each position
  for (const position of positions) {
    const quote = quotes[position.symbol]
    const currentPrice = quote?.last || position.currentPrice || position.avgPrice
    const marketValue = position.quantity * currentPrice
    const unrealizedPnL = (currentPrice - position.avgPrice) * position.quantity
    const percentChange = ((currentPrice - position.avgPrice) / position.avgPrice) * 100

    // Determine asset type and risk level
    const assetType = position.symbol.includes('-USD') ? 'crypto' : 'stock'
    const riskLevel = assetType === 'crypto' ? 'HIGH' : 
                     Math.abs(percentChange) > 20 ? 'HIGH' :
                     Math.abs(percentChange) > 10 ? 'MEDIUM' : 'LOW'

    Positions.push({
      ...position,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent: percentChange,
      percentChange,
      assetType,
      riskLevel,
      positionSize: 0, // Will be calculated after total portfolio value
      entryDate: position.entryDate || new Date(),
      volatility: assetType === 'crypto' ? 80 : 20
    })
  }

  // Calculate portfolio totals
  const totalMarketValue = Positions.reduce((sum, pos) => sum + pos.marketValue, 0)
  const cashBalance = portfolioData.cashBalance || 0
  const totalValue = totalMarketValue + cashBalance
  const totalPnL = Positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)

  // Update position sizes
  Positions.forEach(pos => {
    pos.positionSize = (pos.marketValue / totalValue) * 100
  })

  // Asset breakdown
  const stocks = Positions.filter(p => p.assetType === 'stock')
  const crypto = Positions.filter(p => p.assetType === 'crypto')
  const stockValue = stocks.reduce((sum, pos) => sum + pos.marketValue, 0)
  const cryptoValue = crypto.reduce((sum, pos) => sum + pos.marketValue, 0)

  const assetBreakdown = {
    stocks: {
      count: stocks.length,
      value: stockValue,
      percentage: (stockValue / totalValue) * 100
    },
    crypto: {
      count: crypto.length,
      value: cryptoValue,
      percentage: (cryptoValue / totalValue) * 100
    },
    options: {
      count: 0,
      value: 0,
      percentage: 0
    },
    cash: {
      value: cashBalance,
      percentage: (cashBalance / totalValue) * 100
    }
  }

  // Risk metrics
  const concentration = Positions.length > 0 ? 
    Math.max(...Positions.map(p => p.positionSize)) : 0
  
  const diversificationScore = Math.min(90, Positions.length * 15)
  
  const volatilityEstimate = Positions.reduce((weighted, pos) => {
    const weight = pos.marketValue / totalValue
    return weighted + (weight * (pos.volatility || 20))
  }, 0)

  const riskMetrics = {
    concentration,
    volatilityEstimate,
    diversificationScore,
    sharpeRatio: 0, // Would need more historical data
    maxDrawdown: Math.abs(Math.min(...Positions.map(p => p.percentChange), 0)),
    beta: 1.0, // Portfolio beta estimate
    var95: (volatilityEstimate * 1.645) / 100 // 95% VaR
  }

  // Performance history (generate basic 30-day history)
  const performanceHistory = []
  const startValue = totalValue * 0.95 // Assume started 5% lower
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dailyReturn = (Math.random() - 0.5) * 0.02 // ±1% daily
    const value = startValue * (1 + dailyReturn * (30 - i) / 30)
    const pnl = value - startValue
    
    performanceHistory.push({
      date,
      value,
      pnl,
      return: (pnl / startValue) * 100
    })
  }

  return {
    account: {
      totalReserve: 100000, // Default reserve
      activeBalance: totalValue,
      reservedBalance: 0,
      usedBalance: totalMarketValue,
      availableBalance: cashBalance,
      totalPnL,
      dayPnL: 0, // Would need daily tracking
      totalReturn: (totalPnL / totalValue) * 100,
      dayReturn: 0,
      isLiveMode: false,
      accountType: 'PAPER' as const,
      lastUpdated: new Date(),
      riskLimits: {
        maxPositionSize: 10,
        maxDailyLoss: 5,
        maxTotalRisk: 25
      }
    },
    positions: Positions,
    allocation: {
      ...Positions.reduce((acc, pos) => {
        acc[pos.symbol] = pos.positionSize
        return acc
      }, {} as Record<string, number>),
      CASH: assetBreakdown.cash.percentage
    },
    assetBreakdown,
    riskMetrics,
    performanceHistory,
    lastUpdate: new Date()
  }
}

/**
 * Fetch quotes from multiple sources with fallbacks
 */
async function fetchMultipleQuotes(symbols: string[]): Promise<Record<string, any>> {
  const quotes: Record<string, any> = {}
  
  // Try to get quotes from your existing market data API
  for (const symbol of symbols) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/market-data/${symbol}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const latest = Array.isArray(data.data.data) ? data.data.data[0] : data.data
          quotes[symbol] = {
            symbol,
            last: latest.close || latest.price || 100,
            bid: (latest.close || 100) * 0.9995,
            ask: (latest.close || 100) * 1.0005,
            change: latest.change || 0,
            changePercent: latest.changePercent || 0,
            timestamp: new Date(),
            source: 'existing_api'
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch quote for ${symbol}:`, error)
      // Provide fallback quote
      const basePrice = symbol.includes('BTC') ? 65000 : 
                       symbol.includes('ETH') ? 3500 : 175
      quotes[symbol] = {
        symbol,
        last: basePrice,
        bid: basePrice * 0.9995,
        ask: basePrice * 1.0005,
        change: 0,
        changePercent: 0,
        timestamp: new Date(),
        source: 'fallback'
      }
    }
  }
  
  return quotes
}

/**
 * Generate portfolio analysis
 */
function generatePortfolioAnalysis(portfolio: any) {
  return {
    diversification: {
      score: portfolio.riskMetrics.diversificationScore,
      recommendations: portfolio.riskMetrics.diversificationScore < 50 ? 
        ['Consider adding more positions to improve diversification'] :
        ['Portfolio diversification looks good']
    },
    riskAssessment: {
      level: portfolio.riskMetrics.concentration > 30 ? 'HIGH' : 
             portfolio.riskMetrics.concentration > 20 ? 'MEDIUM' : 'LOW',
      factors: [
        `Largest position: ${portfolio.riskMetrics.concentration.toFixed(1)}%`,
        `Volatility estimate: ${portfolio.riskMetrics.volatilityEstimate.toFixed(1)}%`
      ]
    },
    performance: {
      winners: portfolio.positions.filter((pos: any) => pos.unrealizedPnL > 0).length,
      losers: portfolio.positions.filter((pos: any) => pos.unrealizedPnL < 0).length,
      totalReturn: portfolio.account.totalReturn
    }
  }
} 

// GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const includeQuotes = searchParams.get('quotes') === 'true'
//     const includeAnalysis = searchParams.get('analysis') === 'true'
//     const userId = searchParams.get('userId') || 'default'

//     console.log('🔍  portfolio API called with params:', { includeQuotes, includeAnalysis, userId })

//     // Try to get data from your existing portfolio API first
//     let portfolioData = null
//     let dataSources = {
//       portfolio: 'fallback' as const,
//       prices: 'cached' as const,
//       positions: 'basic' as const
//     }

//     try {
//       // Call your existing portfolio API
//       const basicPortfolioResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portfolio`, {
//         headers: {
//           'User-Agent': '-Dashboard/1.0'
//         }
//       })

//       if (basicPortfolioResponse.ok) {
//         const basicData = await basicPortfolioResponse.json()
//         if (basicData.success && basicData.data) {
//           portfolioData = basicData.data
//           dataSources.portfolio = 'live'
//           console.log('✅ Retrieved data from existing portfolio API')
//         }
//       }
//     } catch (error) {
//       console.warn('⚠️ Basic portfolio API unavailable:', error)
//     }

//     // If no existing data, create a minimal structure
//     if (!portfolioData) {
//       portfolioData = {
//         totalValue: 0,
//         cashBalance: 0,
//         positions: [],
//         allocation: { CASH: 100 }
//       }
//     }

//     // Get current market quotes if requested
//     let quotes = {}
//     if (includeQuotes && portfolioData.positions?.length > 0) {
//       try {
//         const symbols = portfolioData.positions.map((pos: any) => pos.symbol)
//         quotes = await fetchMultipleQuotes(symbols)
//         dataSources.prices = 'real_time'
//       } catch (error) {
//         console.warn('⚠️ Failed to fetch quotes:', error)
//         dataSources.prices = 'cached'
//       }
//     }

//     //  the portfolio data
//     const Portfolio = await PortfolioData(portfolioData, quotes, includeAnalysis)
//     Portfolio.dataSources = dataSources

//     return NextResponse.json({
//       success: true,
//       data: {
//         portfolio: Portfolio,
//         analysis: includeAnalysis ? generatePortfolioAnalysis(Portfolio) : null,
//         quotes: includeQuotes ? quotes : undefined
//       },
//       timestamp: new Date(),
//       cached: false
//     })

//   } catch (error) {
//     console.error('❌  portfolio API error:', error)
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: 'Failed to fetch  portfolio data',
//         details: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     )
//   }
// }