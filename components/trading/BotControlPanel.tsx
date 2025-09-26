'use client';
// Specialized Components (Pure UI)

import { useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/card"
import { BotConfigurationForm } from "./BotConfigurationForm"
import LoadingSpinner from "../ui/LoadingSpinner"

type BotStatus = 'stopped' | 'running' | 'paused'

interface BotConfig {
  alpaca: {
    baseUrl: string
    apiKey: string
    secretKey: string
  }
  trading: {
    maxPositionSize: number
    riskLevel: number
  }
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
  maxPositionSize: number
  stopLossPercent: number
  takeProfitPercent: number
  minimumConfidence: number
  watchlistSymbols: string[]
}

const defaultBotConfig: BotConfig = {
  alpaca: {
    baseUrl: 'https://paper-api.alpaca.markets',
    apiKey: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secretKey: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || ''
  },
  trading: {
    maxPositionSize: 10,
    riskLevel: 0.02
  },
  mode: 'BALANCED' as const,
  maxPositionSize: 10,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  minimumConfidence: 75,
  watchlistSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
}

interface BotControlPanelProps {
  status: BotStatus
  onStart: (config: BotConfig) => Promise<void>
  onStop: () => Promise<void>
}

export function BotControlPanel({ status, onStart, onStop }: BotControlPanelProps) {
  const [config, setConfig] = useState<BotConfig>(defaultBotConfig)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleStart = async () => {
    setIsLoading(true)
    try {
      await onStart(config)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Bot Status and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full ${
            status === 'running' ? 'bg-green-500 animate-pulse' :
            status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
          }`} />
          <div>
            <div className="text-lg font-semibold text-white">
              Status: <span className={`${
                status === 'running' ? 'text-green-400' :
                status === 'paused' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {status === 'running' ? 'ACTIVE' : status === 'paused' ? 'PAUSED' : 'STOPPED'}
              </span>
            </div>
            {status === 'running' && (
              <div className="text-sm text-gray-300">AI analyzing markets...</div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleStart}
          disabled={status === 'running' || isLoading}
          variant="success"
          className={`flex-1 py-4 text-lg font-semibold ${
            status !== 'running' ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transform hover:scale-105 transition-all duration-200' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner />
              <span>Starting AI Engine...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16v-6a2 2 0 012-2h2a2 2 0 012 2v6M12 8V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2h8z"/>
              </svg>
              <span>Start AI Trading</span>
            </div>
          )}
        </Button>

        <Button
          onClick={onStop}
          disabled={status === 'stopped'}
          variant="danger"
          className="flex-1 py-4 text-lg font-semibold"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z"/>
            </svg>
            <span>Stop Trading</span>
          </div>
        </Button>
      </div>

      {/* Configuration */}
      <div className="border-t border-gray-600 pt-4">
        <BotConfigurationForm botConfig={config} setBotConfig={setConfig} account={null} />
      </div>
    </div>
  )
}