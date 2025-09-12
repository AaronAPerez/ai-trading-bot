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

export function useMarketData(symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [marketStatus, setMarketStatus] = useState<'OPEN' | 'CLOSED' | 'PRE' | 'POST'>('CLOSED')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
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
      
      console.log('Real market data loaded for:', Object.keys(processedQuotes))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data'
      setError(errorMessage)
      console.error('Market data error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [symbols])

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
    refreshData
  }
}