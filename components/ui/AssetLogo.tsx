"use client"

import { useState } from 'react'
import { Bitcoin, Building2 } from 'lucide-react'
import Image from 'next/image'

interface AssetLogoProps {
  symbol: string
  isCrypto?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AssetLogo({ symbol, isCrypto, size = 'md', className = '' }: AssetLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Determine if crypto based on symbol format if not explicitly provided
  // Crypto formats: BTC/USD, BTC-USD, ETH/USDT, etc.
  // DO NOT use ticker-based detection as some stock ETFs have same tickers (e.g., ETH = Grayscale ETF)
  const isActuallyCrypto = isCrypto ?? (
    symbol?.includes('/') || /[-](USD|USDT|USDC)$/i.test(symbol)
  )

  // Size mappings
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const iconSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const containerSize = sizeMap[size]
  const iconSize = iconSizeMap[size]

  // Get logo URL based on asset type
  const getLogoUrl = () => {
    if (isActuallyCrypto) {
      // Extract base crypto symbol (e.g., BTC from BTC/USD, BTC-USD, or BTC/USDT)
      let cryptoSymbol = symbol.split(/[/-]/)[0].toUpperCase()

      // Handle special cases
      if (cryptoSymbol === 'SHIB') cryptoSymbol = 'SHIB'
      else if (cryptoSymbol === 'DOGE') cryptoSymbol = 'DOGE'

      // CryptoCompare uses lowercase for the API path but the symbol should be uppercase
      return `https://www.cryptocompare.com/media/37746251/${cryptoSymbol.toLowerCase()}.png`
    } else {
      // For stocks, use multiple fallback options
      const stockSymbol = symbol.toUpperCase()

      // Option 1: Clearbit (works for most major companies)
      // We'll need to map ticker to company domain
      const companyDomains: Record<string, string> = {
        'AAPL': 'apple.com',
        'MSFT': 'microsoft.com',
        'GOOGL': 'google.com',
        'GOOG': 'google.com',
        'AMZN': 'amazon.com',
        'META': 'meta.com',
        'TSLA': 'tesla.com',
        'NVDA': 'nvidia.com',
        'JPM': 'jpmorganchase.com',
        'V': 'visa.com',
        'WMT': 'walmart.com',
        'JNJ': 'jnj.com',
        'PG': 'pg.com',
        'MA': 'mastercard.com',
        'UNH': 'unitedhealthgroup.com',
        'HD': 'homedepot.com',
        'BAC': 'bankofamerica.com',
        'DIS': 'disney.com',
        'ADBE': 'adobe.com',
        'NFLX': 'netflix.com',
        'CRM': 'salesforce.com',
        'XOM': 'exxonmobil.com',
        'CVX': 'chevron.com',
        'PFE': 'pfizer.com',
        'KO': 'coca-cola.com',
        'PEP': 'pepsico.com',
        'INTC': 'intel.com',
        'AMD': 'amd.com',
        'PYPL': 'paypal.com',
        'CSCO': 'cisco.com',
        'ABT': 'abbott.com',
        'NKE': 'nike.com',
        'TMO': 'thermofisher.com',
        'MRK': 'merck.com',
        'COST': 'costco.com',
        'AVGO': 'broadcom.com',
        'ACN': 'accenture.com',
        'TXN': 'ti.com',
        'ORCL': 'oracle.com',
        'LLY': 'lilly.com',
      }

      const domain = companyDomains[stockSymbol]
      if (domain) {
        return `https://logo.clearbit.com/${domain}`
      }

      // Fallback: Use a generic stock API service
      // Financialmodelingprep free tier (limited)
      return `https://financialmodelingprep.com/image-stock/${stockSymbol}.png`
    }
  }

  const logoUrl = getLogoUrl()

  // Fallback icon component
  const FallbackIcon = () => (
    <div className={`${containerSize} rounded-lg flex items-center justify-center ${
      isActuallyCrypto
        ? 'bg-orange-500/20 text-orange-400'
        : 'bg-blue-500/20 text-blue-400'
    } ${className}`}>
      {isActuallyCrypto ? (
        <Bitcoin className={iconSize} />
      ) : (
        <Building2 className={iconSize} />
      )}
    </div>
  )

  // Show fallback immediately if we already know the image failed
  if (imageError) {
    return <FallbackIcon />
  }

  return (
    <div className={`${containerSize} relative ${className}`}>
      {!imageLoaded && <FallbackIcon />}
      <Image
        src={logoUrl}
        alt={`${symbol} logo`}
        width={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
        height={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
        className={`rounded-lg object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true)
          setImageLoaded(false)
        }}
        unoptimized // Allow loading from external domains
      />
    </div>
  )
}
