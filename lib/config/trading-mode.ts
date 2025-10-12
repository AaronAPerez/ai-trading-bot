/**
 * Trading mode configuration
 * This file stores the current trading mode (paper or live)
 * Can be accessed by both client and server
 */

let currentTradingMode: 'paper' | 'live' = 'paper'

export function getTradingMode(): 'paper' | 'live' {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('trading-mode')
    if (stored === 'live' || stored === 'paper') {
      currentTradingMode = stored
    }
  }
  return currentTradingMode
}

export function setTradingMode(mode: 'paper' | 'live'): void {
  currentTradingMode = mode

  // Persist to localStorage if in browser
  if (typeof window !== 'undefined') {
    localStorage.setItem('trading-mode', mode)
  }

  console.log(`🔄 Trading mode set to: ${mode.toUpperCase()}`)
}

export function getAlpacaBaseUrl(): string {
  const mode = getTradingMode()
  return mode === 'live'
    ? 'https://api.alpaca.markets'
    : 'https://paper-api.alpaca.markets'
}
