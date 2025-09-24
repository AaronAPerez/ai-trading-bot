import { NextRequest, NextResponse } from 'next/server'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'
import { FreeMarketDataProvider } from '@/lib/marketData/FreeMarketDataProvider'

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      )
    }

    const alpacaClient = new AlpacaServerClient()
    let quotes = await alpacaClient.getLatestQuotes(symbols)

    // Check if we need to supplement with fallback data
    const alpacaSymbols = Object.keys(quotes)
    const missingSymbols = symbols.filter(s => !alpacaSymbols.includes(s))

    let dataSourceUsed = 'alpaca'

    // If Alpaca returned no data at all, use fallback for everything
    if (Object.keys(quotes).length === 0) {
      console.log('Alpaca returned no data, using free market data provider fallback for all symbols')
      dataSourceUsed = 'fallback'

      const freeProvider = new FreeMarketDataProvider()

      // Separate crypto and regular symbols
      const cryptoSymbols = symbols.filter(s => s.includes('USD') && ['BTC', 'ETH', 'ADA', 'SOL', 'AVAX', 'MATIC'].some(crypto => s.startsWith(crypto)))
      const regularSymbols = symbols.filter(s => !cryptoSymbols.includes(s))

      const fallbackQuotes: Record<string, any> = {}

      // Get crypto data
      if (cryptoSymbols.length > 0) {
        const cryptoQuotes = await freeProvider.getCryptoQuotes(cryptoSymbols)
        Object.assign(fallbackQuotes, cryptoQuotes)
      }

      // Get regular stock data
      if (regularSymbols.length > 0) {
        const stockQuotes = await freeProvider.getQuotes(regularSymbols)
        Object.assign(fallbackQuotes, stockQuotes)
      }

      quotes = fallbackQuotes
    }
    // If Alpaca returned some data but is missing symbols (e.g., crypto), supplement with fallback
    else if (missingSymbols.length > 0) {
      console.log(`Alpaca missing ${missingSymbols.length} symbols, supplementing with fallback APIs:`, missingSymbols)
      dataSourceUsed = 'hybrid'

      const freeProvider = new FreeMarketDataProvider()

      // Get missing crypto symbols
      const missingCrypto = missingSymbols.filter(s => s.includes('USD') && ['BTC', 'ETH', 'ADA', 'SOL', 'AVAX', 'MATIC'].some(crypto => s.startsWith(crypto)))
      const missingRegular = missingSymbols.filter(s => !missingCrypto.includes(s))

      // Get missing crypto data
      if (missingCrypto.length > 0) {
        const cryptoQuotes = await freeProvider.getCryptoQuotes(missingCrypto)
        Object.assign(quotes, cryptoQuotes)
      }

      // Get missing regular stock data
      if (missingRegular.length > 0) {
        const stockQuotes = await freeProvider.getQuotes(missingRegular)
        Object.assign(quotes, stockQuotes)
      }
    }
    
    // Determine market status
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()

    let marketStatus: 'OPEN' | 'CLOSED' | 'PRE' | 'POST' = 'CLOSED'

    // Check if we have crypto symbols (crypto markets are 24/7)
    const hasCrypto = symbols.some(s => s.includes('USD') && ['BTC', 'ETH', 'ADA', 'SOL', 'AVAX', 'MATIC'].some(crypto => s.startsWith(crypto)))

    if (hasCrypto) {
      marketStatus = 'OPEN' // Crypto markets are always open
    } else if (currentDay >= 1 && currentDay <= 5) {
      if (currentHour >= 9 && currentHour < 16) {
        marketStatus = 'OPEN'
      } else if (currentHour >= 4 && currentHour < 9) {
        marketStatus = 'PRE'
      } else {
        marketStatus = 'POST'
      }
    }

    return NextResponse.json({
      quotes,
      marketStatus,
      timestamp: new Date().toISOString(),
      dataSource: dataSourceUsed,
      symbolCount: Object.keys(quotes).length
    })
  } catch (error) {
    console.error('Market data API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}