import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDate,
  formatUptime,
  formatNumberWithSign,
  formatMarketValue,
  formatShares,
  formatPrice
} from "@/lib/utils/formatters"

/**
 * useFormatters - Reusable formatting hook
 * Provides access to all centralized formatting utilities
 */
export const useFormatters = () => {
  return {
    formatCurrency,
    formatPercent,
    formatNumber,
    formatDate,
    formatUptime,
    formatNumberWithSign,
    formatMarketValue,
    formatShares,
    formatPrice
  }
}