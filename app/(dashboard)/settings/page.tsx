'use client'

import { useState } from 'react'
import { Settings, Shield, Bot, Key, DollarSign, AlertTriangle, Save, RotateCcw, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'api' | 'trading' | 'risk' | 'bot'>('api')
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // API Settings
  const [apiSettings, setApiSettings] = useState({
    alpacaKeyId: process.env.NEXT_PUBLIC_APCA_API_KEY_ID || '',
    alpacaSecretKey: process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY || '',
    tradingMode: 'paper',
    dataFeed: 'iex'
  })

  // Trading Settings
  const [tradingSettings, setTradingSettings] = useState({
    maxPositionSize: 1000,
    maxDailyTrades: 50,
    defaultOrderType: 'market',
    autoConfirmOrders: false
  })

  // Risk Management Settings
  const [riskSettings, setRiskSettings] = useState({
    maxDailyRisk: 2.0,
    maxPositionRisk: 10.0,
    stopLossEnabled: true,
    defaultStopLoss: 5.0,
    takeProfitEnabled: true,
    defaultTakeProfit: 15.0
  })

  // Bot Settings
  const [botSettings, setBotSettings] = useState({
    autoExecution: false,
    minimumConfidence: 75,
    riskLevel: 'balanced',
    tradingMode: 'balanced',
    maxConcurrentPositions: 5,
    analysisInterval: 60,
    portfolioRebalancing: true
  })

  const handleSave = () => {
    // Here you would save settings to your backend/storage
    console.log('Saving settings...', {
      apiSettings,
      tradingSettings,
      riskSettings,
      botSettings
    })
    setHasUnsavedChanges(false)
    // Show success notification
  }

  const handleReset = () => {
    // Reset to default values
    setHasUnsavedChanges(false)
  }

  const updateApiSettings = (key: string, value: any) => {
    setApiSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const updateTradingSettings = (key: string, value: any) => {
    setTradingSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const updateRiskSettings = (key: string, value: any) => {
    setRiskSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const updateBotSettings = (key: string, value: any) => {
    setBotSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const sections = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'trading', label: 'Trading', icon: DollarSign },
    { id: 'risk', label: 'Risk Management', icon: Shield },
    { id: 'bot', label: 'AI Bot', icon: Bot }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="space-y-8 p-1">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <section.icon size={18} />
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </nav>

              {/* Save/Reset Buttons */}
              {hasUnsavedChanges && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="space-y-2">
                    <button
                      onClick={handleSave}
                      className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Save size={16} />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <RotateCcw size={16} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              {/* API Keys Section */}
              {activeSection === 'api' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">API Configuration</h2>
                    <p className="text-gray-400">Configure your Alpaca API credentials and data sources</p>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      <span className="text-yellow-400 font-medium text-sm">Important</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Keep your API keys secure. Never share them publicly or commit them to version control.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Alpaca API Key ID
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys ? 'text' : 'password'}
                          value={apiSettings.alpacaKeyId}
                          onChange={(e) => updateApiSettings('alpacaKeyId', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                          placeholder="Enter your Alpaca API Key ID"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys(!showApiKeys)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showApiKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Alpaca Secret Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys ? 'text' : 'password'}
                          value={apiSettings.alpacaSecretKey}
                          onChange={(e) => updateApiSettings('alpacaSecretKey', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                          placeholder="Enter your Alpaca Secret Key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys(!showApiKeys)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showApiKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trading Mode
                      </label>
                      <select
                        value={apiSettings.tradingMode}
                        onChange={(e) => updateApiSettings('tradingMode', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="paper">Paper Trading</option>
                        <option value="live">Live Trading</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Data Feed
                      </label>
                      <select
                        value={apiSettings.dataFeed}
                        onChange={(e) => updateApiSettings('dataFeed', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="iex">IEX (Free)</option>
                        <option value="sip">SIP (Premium)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Settings Section */}
              {activeSection === 'trading' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Trading Configuration</h2>
                    <p className="text-gray-400">Set your default trading parameters and order preferences</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Position Size ($)
                      </label>
                      <input
                        type="number"
                        value={tradingSettings.maxPositionSize}
                        onChange={(e) => updateTradingSettings('maxPositionSize', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Daily Trades
                      </label>
                      <input
                        type="number"
                        value={tradingSettings.maxDailyTrades}
                        onChange={(e) => updateTradingSettings('maxDailyTrades', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Default Order Type
                      </label>
                      <select
                        value={tradingSettings.defaultOrderType}
                        onChange={(e) => updateTradingSettings('defaultOrderType', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                        <option value="stop">Stop</option>
                        <option value="stop_limit">Stop Limit</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="autoConfirm"
                        checked={tradingSettings.autoConfirmOrders}
                        onChange={(e) => updateTradingSettings('autoConfirmOrders', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoConfirm" className="text-sm font-medium text-gray-300">
                        Auto-confirm orders
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Management Section */}
              {activeSection === 'risk' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Risk Management</h2>
                    <p className="text-gray-400">Configure risk limits and protective measures</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Daily Risk (%)
                      </label>
                      <input
                        type="number"
                        value={riskSettings.maxDailyRisk}
                        onChange={(e) => updateRiskSettings('maxDailyRisk', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0.1"
                        max="10"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Position Risk (%)
                      </label>
                      <input
                        type="number"
                        value={riskSettings.maxPositionRisk}
                        onChange={(e) => updateRiskSettings('maxPositionRisk', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="50"
                        step="1"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="stopLoss"
                          checked={riskSettings.stopLossEnabled}
                          onChange={(e) => updateRiskSettings('stopLossEnabled', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="stopLoss" className="text-sm font-medium text-gray-300">
                          Enable Stop Loss
                        </label>
                      </div>
                      {riskSettings.stopLossEnabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Default Stop Loss (%)
                          </label>
                          <input
                            type="number"
                            value={riskSettings.defaultStopLoss}
                            onChange={(e) => updateRiskSettings('defaultStopLoss', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            max="50"
                            step="1"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="takeProfit"
                          checked={riskSettings.takeProfitEnabled}
                          onChange={(e) => updateRiskSettings('takeProfitEnabled', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="takeProfit" className="text-sm font-medium text-gray-300">
                          Enable Take Profit
                        </label>
                      </div>
                      {riskSettings.takeProfitEnabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Default Take Profit (%)
                          </label>
                          <input
                            type="number"
                            value={riskSettings.defaultTakeProfit}
                            onChange={(e) => updateRiskSettings('defaultTakeProfit', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            max="100"
                            step="1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Bot Section */}
              {activeSection === 'bot' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">AI Bot Configuration</h2>
                    <p className="text-gray-400">Configure your AI trading bot behavior and parameters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="autoExecution"
                        checked={botSettings.autoExecution}
                        onChange={(e) => updateBotSettings('autoExecution', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoExecution" className="text-sm font-medium text-gray-300">
                        Enable auto-execution of recommendations
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Confidence (%)
                      </label>
                      <input
                        type="number"
                        value={botSettings.minimumConfidence}
                        onChange={(e) => updateBotSettings('minimumConfidence', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="50"
                        max="95"
                        step="5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Risk Level
                      </label>
                      <select
                        value={botSettings.riskLevel}
                        onChange={(e) => updateBotSettings('riskLevel', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trading Mode
                      </label>
                      <select
                        value={botSettings.tradingMode}
                        onChange={(e) => updateBotSettings('tradingMode', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                        <option value="scalping">Scalping</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Concurrent Positions
                      </label>
                      <input
                        type="number"
                        value={botSettings.maxConcurrentPositions}
                        onChange={(e) => updateBotSettings('maxConcurrentPositions', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="20"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Analysis Interval (seconds)
                      </label>
                      <input
                        type="number"
                        value={botSettings.analysisInterval}
                        onChange={(e) => updateBotSettings('analysisInterval', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="30"
                        max="600"
                        step="30"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="portfolioRebalancing"
                        checked={botSettings.portfolioRebalancing}
                        onChange={(e) => updateBotSettings('portfolioRebalancing', e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="portfolioRebalancing" className="text-sm font-medium text-gray-300">
                        Enable portfolio rebalancing
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}