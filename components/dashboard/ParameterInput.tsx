/**
 * ParameterInput - Reusable parameter input component
 * Used for configuring strategy parameters that affect Alpaca API analysis
 */

'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

interface ParameterInputProps {
  name: string
  label: string
  value: number
  min: number
  max: number
  step: number
  description: string
  onChange: (value: number) => void
}

export function ParameterInput({
  name,
  label,
  value,
  min,
  max,
  step,
  description,
  onChange
}: ParameterInputProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      {/* Label and Info */}
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="text-sm font-medium text-gray-700 flex items-center gap-1">
          {label}
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="relative text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={`Info about ${label}`}
          >
            <Info className="w-4 h-4" />
            {showTooltip && (
              <div className="absolute z-10 left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                {description}
                <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1" />
              </div>
            )}
          </button>
        </label>

        {/* Value Input */}
        <input
          type="number"
          id={name}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleInputChange}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`
          }}
        />
        {/* Min/Max Labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Description (always visible for important parameters) */}
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
