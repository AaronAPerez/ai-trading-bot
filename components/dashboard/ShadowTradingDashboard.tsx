'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, TrendingUp, TrendingDown, Target, DollarSign, Percent, Award } from 'lucide-react'

interface ShadowPortfolio {
  id: string
  name: string
  strategyVariant: string
  initialCapital: number
  currentCapital: number
  positions: any[]
  closedTrades: any[]
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  tradesCount: number
  metadata: any
}

export default function ShadowTradingDashboard() {
  const queryClient = useQueryClient()
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null)

  // Fetch shadow portfolios
  const { data: portfoliosData, isLoading } = useQuery({
    queryKey: ['shadowPortfolios'],
    queryFn: async () => {
      const res = await fetch('/api/shadow-trading?action=list')
      return res.json()
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Fetch comparison data
  const { data: comparisonData } = useQuery({
    queryKey: ['shadowComparison', selectedPortfolio],
    queryFn: async () => {
      if (!selectedPortfolio) return null
      const res = await fetch(`/api/shadow-trading?action=compare&portfolioId=${selectedPortfolio}`)
      return res.json()
    },
    enabled: !!selectedPortfolio,
    refetchInterval: 5000
  })

  // Create shadow portfolio mutation
  const createPortfolio = useMutation({
    mutationFn: async (config: { name: string; strategyVariant: string; initialCapital: number }) => {
      const res = await fetch('/api/shadow-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-portfolio', ...config })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shadowPortfolios'] })
    }
  })

  // Update positions mutation
  const updatePositions = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/shadow-trading?action=update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shadowPortfolios'] })
    }
  })

  const portfolios: ShadowPortfolio[] = portfoliosData?.portfolios || []
  const comparison = comparisonData?.comparison

  // Auto-select first portfolio
  useEffect(() => {
    if (portfolios.length > 0 && !selectedPortfolio) {
      setSelectedPortfolio(portfolios[0].id)
    }
  }, [portfolios, selectedPortfolio])

  const handleCreateDefaultPortfolios = () => {
    // Create common shadow portfolios for comparison
    const defaultPortfolios = [
      { name: 'Conservative Shadow', strategyVariant: 'conservative', initialCapital: 10000 },
      { name: 'Aggressive Shadow', strategyVariant: 'aggressive', initialCapital: 10000 },
      { name: 'Mean Reversion Shadow', strategyVariant: 'mean_reversion', initialCapital: 10000 }
    ]

    defaultPortfolios.forEach(config => {
      createPortfolio.mutate(config)
    })
  }

  const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span>Shadow Trading System</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Test strategies in real-time without risking capital</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => updatePositions.mutate()}
            disabled={updatePositions.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {updatePositions.isPending ? 'Updating...' : 'Update Prices'}
          </button>

          {portfolios.length === 0 && (
            <button
              onClick={handleCreateDefaultPortfolios}
              disabled={createPortfolio.isPending}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createPortfolio.isPending ? 'Creating...' : 'Create Shadow Portfolios'}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading shadow portfolios...</div>
        </div>
      ) : portfolios.length === 0 ? (
        <div className="bg-gray-900/40 rounded-lg p-12 border border-gray-700/50 text-center">
          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Shadow Portfolios Yet</h3>
          <p className="text-gray-400 mb-6">Create shadow portfolios to track alternative strategies in real-time</p>
          <button
            onClick={handleCreateDefaultPortfolios}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors"
          >
            Create Default Shadow Portfolios
          </button>
        </div>
      ) : (
        <>
          {/* Portfolio Selector */}
          <div className="flex space-x-2 overflow-x-auto">
            {portfolios.map(portfolio => (
              <button
                key={portfolio.id}
                onClick={() => setSelectedPortfolio(portfolio.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedPortfolio === portfolio.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {portfolio.name}
              </button>
            ))}
          </div>

          {selectedPortfolioData && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total P&L</span>
                    <DollarSign className={`w-5 h-5 ${selectedPortfolioData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <div className={`text-2xl font-bold ${selectedPortfolioData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${selectedPortfolioData.totalPnL.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedPortfolioData.totalPnLPercent >= 0 ? '+' : ''}{selectedPortfolioData.totalPnLPercent.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Win Rate</span>
                    <Award className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selectedPortfolioData.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedPortfolioData.closedTrades.filter((t: any) => t.pnl > 0).length} / {selectedPortfolioData.closedTrades.length} trades
                  </div>
                </div>

                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Portfolio Value</span>
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${(selectedPortfolioData.metadata?.totalPortfolioValue || selectedPortfolioData.currentCapital).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Initial: ${selectedPortfolioData.initialCapital.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total Trades</span>
                    <Activity className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selectedPortfolioData.tradesCount}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Array.from(selectedPortfolioData.positions).length} open positions
                  </div>
                </div>
              </div>

              {/* Open Positions */}
              {Array.from(selectedPortfolioData.positions).length > 0 && (
                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Open Shadow Positions</h3>
                  <div className="space-y-2">
                    {Array.from(selectedPortfolioData.positions).map(([symbol, position]: [string, any]) => {
                      const unrealizedPnL = position.metadata?.unrealizedPnL || 0
                      const unrealizedPnLPercent = position.metadata?.unrealizedPnLPercent || 0

                      return (
                        <div key={symbol} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              position.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {position.side.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{symbol}</div>
                              <div className="text-xs text-gray-400">
                                {position.qty} shares @ ${position.entryPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                            </div>
                            <div className={`text-xs ${unrealizedPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {unrealizedPnLPercent >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Closed Trades */}
              {selectedPortfolioData.closedTrades.length > 0 && (
                <div className="bg-gray-900/40 rounded-lg p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Closed Shadow Trades</h3>
                  <div className="space-y-2">
                    {selectedPortfolioData.closedTrades.slice(-5).reverse().map((trade: any) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${trade.pnl >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {trade.pnl >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{trade.symbol}</div>
                            <div className="text-xs text-gray-400">
                              {trade.qty} @ ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                          <div className={`text-xs ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
