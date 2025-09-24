'use client'

import { useState, useEffect, useCallback } from 'react'

interface MarketQuote {
  symbol: string
  bidPrice: number
  askPrice: number
  midPrice: number
  timestamp: Date
  spread: number
  volume?: number
}

export function useMarketData(symbols?: string[]) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [marketStatus, setMarketStatus] = useState<'OPEN' | 'CLOSED' | 'PRE' | 'POST'>('CLOSED')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'alpaca' | 'fallback' | 'hybrid'>('alpaca')
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(symbols || [])

  // Fetch default popular symbols if none provided
  useEffect(() => {
    if (!symbols || symbols.length === 0) {
      fetch('/api/symbols?action=popular&size=20')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.symbols) {
            setWatchlistSymbols(data.symbols)
          } else {
            // Fallback to a small set of popular symbols
            setWatchlistSymbols(['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'SPY', 'QQQ'])
          }
        })
        .catch(() => {
          // Fallback to a small set of popular symbols
          setWatchlistSymbols(['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'SPY', 'QQQ'])
        })
    } else {
      setWatchlistSymbols(symbols)
    }
  }, [symbols])

  const refreshData = useCallback(async () => {
    if (watchlistSymbols.length === 0) return

    try {
      setError(null)

      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: watchlistSymbols })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch market data')
      }
      
      const data = await response.json()
      
      // Convert timestamp strings back to Date objects
      const processedQuotes: Record<string, MarketQuote> = {}
      Object.entries(data.quotes).forEach(([symbol, quote]) => {
        const q = quote as any
        processedQuotes[symbol] = {
          ...q,
          timestamp: new Date(q.timestamp)
        }
      })
      
      setQuotes(processedQuotes)
      setMarketStatus(data.marketStatus)
      setDataSource(data.dataSource || 'alpaca')

      console.log(`Market data loaded from ${data.dataSource || 'alpaca'} for:`, Object.keys(processedQuotes))
      if (data.dataSource === 'fallback') {
        console.log('⚠️ Using fallback market data APIs - Alpaca data unavailable')
      } else if (data.dataSource === 'hybrid') {
        console.log('📊 Using hybrid data sources - Alpaca + fallback APIs for complete coverage')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data'
      setError(errorMessage)
      console.error('Market data error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [watchlistSymbols])

  // Refresh data on mount and periodically
  useEffect(() => {
    refreshData()
    
    // Refresh every 30 seconds (reasonable for production)
    const interval = setInterval(refreshData, 30000)
    
    return () => clearInterval(interval)
  }, [refreshData])

  return {
    quotes,
    marketStatus,
    isLoading,
    error,
    dataSource,
    refreshData
  }
}