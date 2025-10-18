"use client"

import { Brain, Building2 } from 'lucide-react'

export type TradingMode = 'ai-bot' | 'hedge-fund'

interface TradingModeToggleProps {
  currentMode: TradingMode
  onModeChange: (mode: TradingMode) => void
  disabled?: boolean
}

export default function TradingModeToggle({
  currentMode,
  onModeChange,
  disabled = false
}: TradingModeToggleProps) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-1 border border-gray-700 inline-flex">
      {/* AI Bot Mode */}
      <button
        onClick={() => onModeChange('ai-bot')}
        disabled={disabled}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
          ${currentMode === 'ai-bot'
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Brain className="w-4 h-4" />
        <span className="font-semibold text-sm">AI Bot Mode</span>
        {currentMode === 'ai-bot' && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Hedge Fund Mode */}
      <button
        onClick={() => onModeChange('hedge-fund')}
        disabled={disabled}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
          ${currentMode === 'hedge-fund'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Building2 className="w-4 h-4" />
        <span className="font-semibold text-sm">Hedge Fund Mode</span>
        {currentMode === 'hedge-fund' && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </button>
    </div>
  )
}
