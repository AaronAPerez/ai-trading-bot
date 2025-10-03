'use client'

/**
 * Risk Management Panel Component
 * Displays risk assessments, limits, and warnings
 */

import { usePortfolioRisk, useRiskLimits, useHighRiskPositions, useRiskActions } from '@/store/unifiedTradingStore'
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Target, Activity } from 'lucide-react'
import { useState } from 'react'

export default function RiskManagementPanel() {
  const portfolioRisk = usePortfolioRisk()
  const riskLimits = useRiskLimits()
  const highRiskPositions = useHighRiskPositions()
  const { updateRiskLimits } = useRiskActions()

  const [showSettings, setShowSettings] = useState(false)
  const [editLimits, setEditLimits] = useState(riskLimits)

  const handleSaveLimits = () => {
    updateRiskLimits(editLimits)
    setShowSettings(false)
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400 bg-green-500/20'
    if (score < 60) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-red-400 bg-red-500/20'
  }

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield size={24} className="text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Risk Management</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm"
        >
          {showSettings ? 'View' : 'Settings'}
        </button>
      </div>

      {!showSettings ? (
        <>
          {/* Overall Risk Score */}
          {portfolioRisk && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400">Overall Risk Score</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(portfolioRisk.riskScore)}`}>
                  {portfolioRisk.riskLevel}
                </span>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full transition-all duration-500 ${
                    portfolioRisk.riskScore < 30
                      ? 'bg-green-500'
                      : portfolioRisk.riskScore < 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(portfolioRisk.riskScore, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          )}

          {/* Risk Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity size={16} className="text-blue-400" />
                <span className="text-gray-400 text-sm">Value at Risk (VaR)</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${portfolioRisk ? portfolioRisk.valueAtRisk.toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500 mt-1">95% confidence</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={16} className="text-green-400" />
                <span className="text-gray-400 text-sm">Sharpe Ratio</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {portfolioRisk ? portfolioRisk.sharpeRatio.toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Risk-adjusted return</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target size={16} className="text-purple-400" />
                <span className="text-gray-400 text-sm">Portfolio Beta</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {portfolioRisk ? portfolioRisk.beta.toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Market correlation</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown size={16} className="text-red-400" />
                <span className="text-gray-400 text-sm">Max Drawdown</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {portfolioRisk ? formatPercentage(portfolioRisk.maxDrawdown * 100) : '0.00%'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Peak to trough</p>
            </div>
          </div>

          {/* Risk Limits Overview */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Risk Limits</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Max Position Size</span>
                <span className="text-white font-medium">{riskLimits.maxPositionSize}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Max Daily Loss</span>
                <span className="text-white font-medium">{riskLimits.maxDailyLoss}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Max Overall Risk</span>
                <span className="text-white font-medium">{riskLimits.maxOverallRisk}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Min Risk/Reward</span>
                <span className="text-white font-medium">{riskLimits.minRiskRewardRatio}:1</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Max Concentration</span>
                <span className="text-white font-medium">{riskLimits.maxConcentration}%</span>
              </div>
            </div>
          </div>

          {/* High Risk Positions */}
          {highRiskPositions.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle size={20} className="text-red-400" />
                <h3 className="text-red-400 font-semibold">High Risk Positions ({highRiskPositions.length})</h3>
              </div>
              <div className="space-y-2">
                {highRiskPositions.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">{assessment.symbol}</span>
                    <span className="text-red-400 font-medium">
                      Risk Score: {assessment.overallRiskScore.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Metrics Details */}
          {portfolioRisk && (
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400">Volatility</span>
                <span className="text-white">{formatPercentage(portfolioRisk.volatility * 100)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400">Concentration Risk</span>
                <span className="text-white">{portfolioRisk.concentrationRisk.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Correlation Risk</span>
                <span className="text-white">{portfolioRisk.correlationRisk.toFixed(2)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Settings Panel */
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Position Size (%)</label>
            <input
              type="number"
              value={editLimits.maxPositionSize}
              onChange={(e) => setEditLimits({ ...editLimits, maxPositionSize: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Daily Loss (%)</label>
            <input
              type="number"
              value={editLimits.maxDailyLoss}
              onChange={(e) => setEditLimits({ ...editLimits, maxDailyLoss: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="0.1"
              max="50"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Overall Risk (%)</label>
            <input
              type="number"
              value={editLimits.maxOverallRisk}
              onChange={(e) => setEditLimits({ ...editLimits, maxOverallRisk: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Risk/Reward Ratio</label>
            <input
              type="number"
              value={editLimits.minRiskRewardRatio}
              onChange={(e) => setEditLimits({ ...editLimits, minRiskRewardRatio: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="0.5"
              max="10"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Concentration (%)</label>
            <input
              type="number"
              value={editLimits.maxConcentration}
              onChange={(e) => setEditLimits({ ...editLimits, maxConcentration: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Leverage</label>
            <input
              type="number"
              value={editLimits.maxLeverage}
              onChange={(e) => setEditLimits({ ...editLimits, maxLeverage: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              min="1"
              max="10"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSaveLimits}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setEditLimits(riskLimits)
                setShowSettings(false)
              }}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
