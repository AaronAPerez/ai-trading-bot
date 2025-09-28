"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TradingNotification {
  id: string
  type: 'buy' | 'sell'
  symbol: string
  quantity: number
  price: number
  amount: number
  pnl?: number
  timestamp: Date
  confidence?: number
}

interface AITradingNotificationsProps {
  notifications: TradingNotification[]
  onDismiss: (id: string) => void
  autoHideDuration?: number
}

export default function AITradingNotifications({
  notifications,
  onDismiss,
  autoHideDuration = 8000
}: AITradingNotificationsProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<TradingNotification[]>([])

  useEffect(() => {
    setVisibleNotifications(notifications)

    // Auto-hide notifications after specified duration
    if (autoHideDuration > 0) {
      notifications.forEach(notification => {
        setTimeout(() => {
          onDismiss(notification.id)
        }, autoHideDuration)
      })
    }
  }, [notifications, autoHideDuration, onDismiss])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPnL = (pnl: number) => {
    const isPositive = pnl >= 0
    return (
      <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
        {isPositive ? '+' : ''}{formatCurrency(pnl)}
      </span>
    )
  }

  const getNotificationIcon = (type: 'buy' | 'sell') => {
    if (type === 'buy') {
      return (
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
      )
    } else {
      return (
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/>
          </svg>
        </div>
      )
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`bg-gray-900/95 backdrop-blur-sm border rounded-lg p-4 shadow-2xl ${
              notification.type === 'buy' ? 'border-green-500/30' : 'border-red-500/30'
            }`}
          >
            <div className="flex items-start space-x-3">
              {getNotificationIcon(notification.type)}

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                      AI BOT
                    </span>
                  </div>
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* Trade Details */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-sm ${
                      notification.symbol === 'SYSTEM' ? 'text-blue-400' :
                      notification.type === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {notification.symbol === 'SYSTEM' ? 'AI TRADING STARTED' : `${notification.type.toUpperCase()} ${notification.symbol}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {notification.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {notification.symbol !== 'SYSTEM' ? (
                    <div className="text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-medium">{notification.quantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span className="font-medium">{formatCurrency(notification.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">{formatCurrency(notification.amount)}</span>
                      </div>

                      {/* P&L for Sell orders */}
                      {notification.type === 'sell' && notification.pnl !== undefined && (
                        <div className="flex justify-between pt-1 border-t border-gray-700/50 mt-2">
                          <span>P&L:</span>
                          <span className="font-medium">{formatPnL(notification.pnl)}</span>
                        </div>
                      )}

                      {/* AI Confidence */}
                      {notification.confidence !== undefined && (
                        <div className="flex justify-between pt-1">
                          <span>Confidence:</span>
                          <span className="font-medium text-blue-400">
                            {(notification.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-blue-300">
                      AI trading bot is now analyzing markets and executing trades automatically.
                    </div>
                  )}
                </div>

                {/* Progress bar for auto-hide */}
                {autoHideDuration > 0 && (
                  <div className="mt-3">
                    <motion.div
                      className={`h-1 rounded-full ${
                        notification.type === 'buy' ? 'bg-green-500/30' : 'bg-red-500/30'
                      }`}
                    >
                      <motion.div
                        className={`h-full rounded-full ${
                          notification.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: autoHideDuration / 1000, ease: "linear" }}
                      />
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}