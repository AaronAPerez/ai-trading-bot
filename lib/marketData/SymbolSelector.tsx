/**
 * Enhanced Symbol Selector Component
 * Provides searchable, categorized symbol selection with real-time data
 * 
 * @fileoverview React component for symbol selection with accessibility features
 * @author Trading Platform Team
 * @version 2.0.0
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  MagnifyingGlassIcon, 
  StarIcon, 
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { 
  STOCK_SYMBOLS, 
  CRYPTO_SYMBOLS, 
  getAllSymbols, 
  getSymbolsByCategory, 
  searchSymbols,
  getTrendingSymbols,
  detectAssetType,
  getSymbolMetadata,
  type StockCategory,
  type CryptoCategory
} from '@/config/symbols'

// =============================================================================
// Component Types
// =============================================================================

interface SymbolData {
  symbol: string
  name: string
  price?: number
  change?: number
  changePercent?: number
  volume?: number
  category: string
  assetType: 'stock' | 'crypto'
}

interface SymbolSelectorProps {
  /** Callback when a symbol is selected */
  onSymbolSelect: (symbol: string) => void
  /** Currently selected symbol */
  selectedSymbol?: string
  /** Filter by asset type */
  assetType?: 'stocks' | 'crypto' | 'all'
  /** Show favorites functionality */
  showFavorites?: boolean
  /** Show trending symbols */
  showTrending?: boolean
  /** Maximum height of the dropdown */
  maxHeight?: string
  /** Custom CSS classes */
  className?: string
  /** Placeholder text for search */
  placeholder?: string
  /** Show real-time prices */
  showPrices?: boolean
}

// =============================================================================
// Symbol Selector Component
// =============================================================================

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({
  onSymbolSelect,
  selectedSymbol,
  assetType = 'all',
  showFavorites = true,
  showTrending = true,
  maxHeight = '400px',
  className = '',
  placeholder = 'Search stocks and crypto...',
  showPrices = true
}) => {
  // Component state
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('trending')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [priceData, setPriceData] = useState<Record<string, SymbolData>>({})
  const [loading, setLoading] = useState(false)

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('trading-favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    localStorage.setItem('trading-favorites', JSON.stringify(Array.from(newFavorites)))
    setFavorites(newFavorites)
  }, [])

  // Toggle favorite status
  const toggleFavorite = useCallback((symbol: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol)
    } else {
      newFavorites.add(symbol)
    }
    saveFavorites(newFavorites)
  }, [favorites, saveFavorites])

  // Fetch real-time price data
  const fetchPriceData = useCallback(async (symbols: string[]) => {
    if (!showPrices || symbols.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/market-data/batch-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbols.slice(0, 20) }) // Limit batch size
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const newPriceData: Record<string, SymbolData> = {}
          
          Object.entries(data.data).forEach(([symbol, quoteResponse]: [string, any]) => {
            const quote = quoteResponse.quote
            const metadata = getSymbolMetadata(symbol)
            
            newPriceData[symbol] = {
              symbol,
              name: metadata.name,
              price: quote.last || 0,
              change: quote.change || 0,
              changePercent: quote.changePercent || 0,
              volume: quote.volume || 0,
              category: metadata.category,
              assetType: detectAssetType(symbol) as 'stock' | 'crypto'
            }
          })
          
          setPriceData(newPriceData)
        }
      }
    } catch (error) {
      console.error('Failed to fetch price data:', error)
    } finally {
      setLoading(false)
    }
  }, [showPrices])

  // Basic return for now to fix TypeScript error
  return (
    <div className="symbol-selector">
      <p>SymbolSelector component needs completion</p>
    </div>
  )
}