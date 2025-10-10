/**
 * Centralized formatting utilities
 * Consolidates all formatting functions used across the application
 */

export const formatCurrency = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue)
}

export const formatPercent = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) {
    return '0.00%'
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export const formatNumber = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) {
    return '0.00'
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const formatDate = (date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    case 'long':
      return dateObj.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    case 'time':
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    default:
      return dateObj.toISOString()
  }
}

export const formatUptime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '0m'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Format a number with optional sign prefix
 */
export const formatNumberWithSign = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) {
    return '0.00'
  }
  const formatted = formatNumber(Math.abs(value), decimals)
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

/**
 * Format market value with compact notation for large numbers
 */
export const formatMarketValue = (value: number): string => {
  if (isNaN(value)) {
    return '$0.00'
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return formatCurrency(value)
}

/**
 * Format position size (shares)
 */
export const formatShares = (shares: number, decimals: number = 0): string => {
  if (isNaN(shares)) {
    return '0'
  }
  return shares.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format price with appropriate decimal places
 */
export const formatPrice = (price: number, symbol?: string): string => {
  if (isNaN(price)) {
    return '$0.00'
  }

  // Crypto typically needs more decimal places
  const isCrypto = symbol && (
    symbol.includes('USD') ||
    symbol.includes('BTC') ||
    symbol.includes('ETH')
  )

  const decimals = isCrypto ? 4 : 2
  return formatCurrency(price, decimals)
}