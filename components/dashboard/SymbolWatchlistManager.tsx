'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Checkbox } from '@/components/ui/checkbox'
import { Search, Plus, Minus, Shuffle, TrendingUp, DollarSign, Zap } from 'lucide-react'
import { Button } from '../ui/Button'
import { SelectContent } from '@/components/ui/select';

interface SymbolCategory {
  key: string
  name: string
  description: string
  symbolCount: number
  symbols: string[]
}

interface WatchlistConfig {
  watchlistSize: number
  watchlistCriteria: {
    includeETFs: boolean
    includeCrypto: boolean
    riskLevel: 'low' | 'medium' | 'high'
    marketCap: string[]
    categories: string[]
  }
}

export default function SymbolWatchlistManager() {
  const [categories, setCategories] = useState<SymbolCategory[]>([])
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<WatchlistConfig>({
    watchlistSize: 50,
    watchlistCriteria: {
      includeETFs: true,
      includeCrypto: true,
      riskLevel: 'medium',
      marketCap: ['mega', 'large'],
      categories: ['growth_tech', 'fintech', 'clean_energy']
    }
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/symbols?action=categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const searchSymbols = async () => {
    if (!searchQuery) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/symbols?action=search&search=${encodeURIComponent(searchQuery)}&limit=20`)
      const data = await response.json()
      setSearchResults(data.symbols || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const addSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols(prev => [...prev, symbol])
    }
  }

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol))
  }

  const addCategorySymbols = async (categoryKey: string, limit = 10) => {
    try {
      const response = await fetch(`/api/symbols?action=category&category=${categoryKey}&limit=${limit}`)
      const data = await response.json()

      const newSymbols = data.symbols.filter((symbol: string) => !selectedSymbols.includes(symbol))
      setSelectedSymbols(prev => [...prev, ...newSymbols])
    } catch (error) {
      console.error('Failed to add category symbols:', error)
    }
  }

  const generateOptimalWatchlist = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        action: 'optimal_watchlist',
        size: config.watchlistSize.toString(),
        includeETFs: config.watchlistCriteria.includeETFs.toString(),
        includeCrypto: config.watchlistCriteria.includeCrypto.toString(),
        riskLevel: config.watchlistCriteria.riskLevel
      })

      const response = await fetch(`/api/symbols?${params}`)
      const data = await response.json()

      setSelectedSymbols(data.symbols || [])
    } catch (error) {
      console.error('Failed to generate optimal watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRandomSymbols = async (count = 20) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/symbols?action=random&limit=${count}`)
      const data = await response.json()

      const newSymbols = data.symbols.filter((symbol: string) => !selectedSymbols.includes(symbol))
      setSelectedSymbols(prev => [...prev, ...newSymbols])
    } catch (error) {
      console.error('Failed to get random symbols:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAIWatchlist = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_watchlist',
          watchlistConfig: {
            watchlist: selectedSymbols,
            watchlistSize: config.watchlistSize,
            watchlistCriteria: config.watchlistCriteria
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('AI Trading watchlist updated successfully!')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to update AI watchlist:', error)
      alert('Failed to update watchlist: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const popularCategories = [
    { key: 'mega_cap', icon: TrendingUp, color: 'bg-blue-500' },
    { key: 'growth_tech', icon: Zap, color: 'bg-purple-500' },
    { key: 'fintech', icon: DollarSign, color: 'bg-green-500' },
    { key: 'etfs_popular', icon: TrendingUp, color: 'bg-orange-500' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            Symbol Watchlist Manager
          </CardTitle>
          <CardDescription>
            Manage your AI trading watchlist with {selectedSymbols.length} symbols selected
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Symbol Search & Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Symbols</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search symbols (e.g., AAPL, Tesla, etc.)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchSymbols()}
                />
                <Button onClick={searchSymbols} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.symbol}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div>
                        <span className="font-bold">{result.symbol}</span>
                        <span className="text-sm text-gray-500 ml-2">{result.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addSymbol(result.symbol)}
                        disabled={selectedSymbols.includes(result.symbol)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {popularCategories.map(({ key, icon: Icon, color }) => {
                  const category = categories.find(c => c.key === key)
                  if (!category) return null

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{category.name}</div>
                          <div className="text-xs text-gray-500">{category.symbolCount} symbols</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addCategorySymbols(key, 10)}
                      >
                        Add 10
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* All Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.key}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-gray-500">{category.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{category.symbolCount}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addCategorySymbols(category.key, 5)}
                      >
                        Add 5
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration & Selected Symbols */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={generateOptimalWatchlist}
                disabled={loading}
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate AI Optimal List
              </Button>

              <Button
                onClick={() => getRandomSymbols(15)}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Add 15 Random Symbols
              </Button>

              <Button
                onClick={() => setSelectedSymbols([])}
                variant="destructive"
                className="w-full"
              >
                Clear All Symbols
              </Button>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Watchlist Config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="watchlistSize">Watchlist Size</Label>
                <Input
                  id="watchlistSize"
                  type="number"
                  value={config.watchlistSize}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    watchlistSize: parseInt(e.target.value) || 50
                  }))}
                  min="10"
                  max="200"
                />
              </div>

              <div>
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={config.watchlistCriteria.riskLevel}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setConfig(prev => ({
                      ...prev,
                      watchlistCriteria: { ...prev.watchlistCriteria, riskLevel: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeETFs"
                    checked={config.watchlistCriteria.includeETFs}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        watchlistCriteria: { ...prev.watchlistCriteria, includeETFs: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="includeETFs">Include ETFs</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCrypto"
                    checked={config.watchlistCriteria.includeCrypto}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        watchlistCriteria: { ...prev.watchlistCriteria, includeCrypto: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="includeCrypto">Include Crypto Exposure</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Symbols */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Selected Symbols ({selectedSymbols.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {selectedSymbols.map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removeSymbol(symbol)}
                    >
                      {symbol}
                      <Minus className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                {selectedSymbols.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No symbols selected
                  </div>
                )}
              </div>

              {selectedSymbols.length > 0 && (
                <Button
                  onClick={updateAIWatchlist}
                  disabled={loading}
                  className="w-full mt-4"
                >
                  Update AI Trading Watchlist
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}