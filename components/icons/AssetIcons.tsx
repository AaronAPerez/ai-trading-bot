import { Bitcoin, LineChart, Smartphone, Cpu, Car, Cloud, ShoppingCart, Gamepad2 } from 'lucide-react'

// Helper to detect if symbol is crypto
export const isCryptoSymbol = (symbol: string): boolean => {
  return /^[A-Z]+(USD|USDT|USDC|BUSD)$/i.test(symbol) ||
    ['BTC', 'ETH', 'LTC', 'BCH', 'AVAX', 'MATIC', 'SHIB', 'LINK', 'UNI', 'AAVE'].includes(symbol)
}

// Get crypto-specific icon
export const getCryptoIcon = (symbol: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  if (symbol.includes('BTC')) {
    return <Bitcoin className={`${sizeClass} text-orange-400`} />
  }
  if (symbol.includes('ETH')) {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#627EEA' }}>
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
    </svg>
  }
  if (symbol.includes('LTC')) {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#345D9D' }}>
      <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm-2.5 7v4.171l-1.5.484v1.345l1.5-.484V17h6v-1.5h-4.5v-3.079l2-.645v-1.346l-2 .645V7h-1.5z"/>
    </svg>
  }
  if (symbol.includes('AVAX')) {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E84142' }}>
      <path d="M17.197 10.804l-3.51-6.08c-.532-.922-1.852-.922-2.384 0l-3.51 6.08c-.532.923.133 2.077 1.192 2.077h7.02c1.059 0 1.724-1.154 1.192-2.077z"/>
      <path d="M6.803 13.196l3.51 6.08c.532.922 1.852.922 2.384 0l3.51-6.08c.532-.923-.133-2.077-1.192-2.077h-7.02c-1.059 0-1.724 1.154-1.192 2.077z"/>
    </svg>
  }
  if (symbol.includes('MATIC')) {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#8247E5' }}>
      <path d="M17.003 14.382l-3.126 1.805v3.61l-1.877 1.084-1.877-1.084v-3.61l-3.126-1.805v-3.61l1.877-1.084 1.877 1.084v3.61l1.877-1.084 1.877 1.084v-3.61l-3.126-1.805V5.857l1.877-1.084 1.877 1.084v3.61l3.126 1.805v3.61l-1.877 1.084z"/>
    </svg>
  }

  // Default crypto icon
  return <Bitcoin className={`${sizeClass} text-yellow-400`} />
}

// Get stock-specific icon
export const getStockIcon = (symbol: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  // Tech stocks
  if (symbol === 'AAPL') {
    return <Smartphone className={`${sizeClass} text-gray-400`} />
  }
  if (symbol === 'MSFT') {
    return <Cloud className={`${sizeClass} text-blue-400`} />
  }
  if (symbol === 'GOOGL' || symbol === 'GOOG') {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#4285F4' }}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
  }
  if (symbol === 'NVDA') {
    return <Cpu className={`${sizeClass} text-green-400`} />
  }
  if (symbol === 'AMD') {
    return <Cpu className={`${sizeClass} text-red-400`} />
  }
  if (symbol === 'TSLA') {
    return <Car className={`${sizeClass} text-red-500`} />
  }
  if (symbol === 'AMZN') {
    return <ShoppingCart className={`${sizeClass} text-orange-400`} />
  }
  if (symbol === 'META') {
    return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0668E1' }}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  }

  // ETFs/Indices
  if (symbol === 'SPY' || symbol === 'QQQ' || symbol === 'DIA' || symbol === 'IWM') {
    return <LineChart className={`${sizeClass} text-purple-400`} />
  }

  // Gaming
  if (symbol === 'RBLX' || symbol === 'EA' || symbol === 'ATVI') {
    return <Gamepad2 className={`${sizeClass} text-pink-400`} />
  }

  // Default stock icon
  return <LineChart className={`${sizeClass} text-blue-400`} />
}

// Main function to get asset icon (auto-detect crypto vs stock)
export const getAssetIcon = (symbol: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  if (isCryptoSymbol(symbol)) {
    return getCryptoIcon(symbol, size)
  }
  return getStockIcon(symbol, size)
}
