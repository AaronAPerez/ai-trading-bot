'use client'

import { useState, useEffect } from 'react'
import { CryptoWatchlistManager } from '@/lib/crypto/CryptoWatchlist'
import { Activity, TrendingUp, Clock, Zap, Bitcoin } from 'lucide-react'

interface CryptoQuote {
  symbol: string
  price: number
  change24h: number
  volume: number
  timestamp: string
}

// Helper to get crypto icon based on symbol
const getCryptoIcon = (symbol: string) => {
  const iconClass = "w-5 h-5"

  if (symbol.includes('BTC')) {
    return <Bitcoin className={`${iconClass} text-orange-400`} />
  }
  if (symbol.includes('ETH')) {
    return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#627EEA' }}>
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
    </svg>
  }
  if (symbol.includes('LTC')) {
    return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#345D9D' }}>
      <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm-2.5 7v4.171l-1.5.484v1.345l1.5-.484V17h6v-1.5h-4.5v-3.079l2-.645v-1.346l-2 .645V7h-1.5z"/>
    </svg>
  }
  if (symbol.includes('AVAX')) {
    return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E84142' }}>
      <path d="M17.197 10.804l-3.51-6.08c-.532-.922-1.852-.922-2.384 0l-3.51 6.08c-.532.923.133 2.077 1.192 2.077h7.02c1.059 0 1.724-1.154 1.192-2.077z"/>
      <path d="M6.803 13.196l3.51 6.08c.532.922 1.852.922 2.384 0l3.51-6.08c.532-.923-.133-2.077-1.192-2.077h-7.02c-1.059 0-1.724 1.154-1.192 2.077z"/>
    </svg>
  }
  if (symbol.includes('MATIC')) {
    return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#8247E5' }}>
      <path d="M17.003 14.382l-3.126 1.805v3.61l-1.877 1.084-1.877-1.084v-3.61l-3.126-1.805v-3.61l1.877-1.084 1.877 1.084v3.61l1.877-1.084 1.877 1.084v-3.61l-3.126-1.805V5.857l1.877-1.084 1.877 1.084v3.61l3.126 1.805v3.61l-1.877 1.084z"/>
    </svg>
  }
  // Default crypto icon
  return <Bitcoin className={`${iconClass} text-yellow-400`} />
}

export function CryptoTradingPanel() {
  const [cryptoQuotes, setCryptoQuotes] = useState<CryptoQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [marketStatus, setMarketStatus] = useState<any>(null)

  useEffect(() => {
    loadCryptoData()
    const interval = setInterval(loadCryptoData, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const loadCryptoData = async () => {
    try {
      // Load crypto market status
      const statusRes = await fetch('/api/alpaca/crypto/market-status')
      if (statusRes.ok) {
        const status = await statusRes.json()
        setMarketStatus(status)
      }

      // Load top crypto quotes
      const topCryptos = CryptoWatchlistManager.getTopCryptos(6)
      const quotes = await Promise.all(
        topCryptos.map(async (symbol) => {
          try {
            const res = await fetch(`/api/alpaca/crypto/quote?symbol=${symbol}`)
            if (res.ok) {
              const data = await res.json()
              const quote = data.quotes?.[symbol]

              if (quote) {
                return {
                  symbol,
                  price: quote.ap || 0, // ask price
                  change24h: 0, // Calculate from historical data
                  volume: quote.as || 0, // ask size
                  timestamp: quote.t || new Date().toISOString()
                }
              }
            }
          } catch (err) {
            console.error(`Failed to load quote for ${symbol}:`, err)
          }
          return null
        })
      )

      setCryptoQuotes(quotes.filter((q): q is CryptoQuote => q !== null))
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load crypto data:', error)
      setIsLoading(false)
    }
  }

  const marketInfo = CryptoWatchlistManager.getCryptoMarketInfo()

  return (
    <div className="space-y-6">
      {/* 24/7 Trading Status */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">24/7 Crypto Trading Active</h3>
              <p className="text-sm text-gray-400">AI learning and trading never stops</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-green-400 font-medium">LIVE</span>
          </div>
        </div>

        {/* Market Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Trading Hours</span>
            </div>
            <p className="text-sm font-semibold text-white">{marketInfo.trading_hours}</p>
          </div>

          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Market Status</span>
            </div>
            <p className="text-sm font-semibold text-green-400">Always Open</p>
          </div>

          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Trading Pairs</span>
            </div>
            <p className="text-sm font-semibold text-white">{marketInfo.trading_pairs}</p>
          </div>

          <div className="bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">AI Optimized</span>
            </div>
            <p className="text-sm font-semibold text-blue-400">
              {marketInfo.recommended_for_ai.length} Pairs
            </p>
          </div>
        </div>
      </div>

      {/* Live Crypto Prices */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-orange-400" />
          Live Crypto Prices
        </h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-400 mt-2">Loading crypto data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cryptoQuotes.map((quote) => (
              <div
                key={quote.symbol}
                className="bg-black/30 border border-gray-700 rounded-lg p-3 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCryptoIcon(quote.symbol)}
                    <span className="font-semibold text-white">{quote.symbol}</span>
                  </div>
                  <span className={`text-xs font-medium ${
                    quote.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {quote.change24h >= 0 ? '+' : ''}{quote.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">
                      ${quote.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      Vol: {quote.volume.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-1.5 h-8 bg-gradient-to-t from-blue-500 to-transparent rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Trading Pairs */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-3">AI-Optimized Trading Pairs</h4>
        <div className="flex flex-wrap gap-2">
          {marketInfo.recommended_for_ai.map((symbol: string) => (
            <div
              key={symbol}
              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-400 font-medium flex items-center gap-1.5"
            >
              {getCryptoIcon(symbol)}
              {symbol}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          These pairs are optimized for 24/7 AI learning with high liquidity and volatility
        </p>
      </div>
    </div>
  )
}
