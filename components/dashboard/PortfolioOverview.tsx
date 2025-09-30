'use client';

import React from 'react';

/**
 * Accessible Portfolio Overview Component
 * 
 * Features:
 * - Responsive card grid (1/2/3/4 columns)
 * - Color-blind friendly indicators
 * - Screen reader friendly financial data
 * - Touch-optimized interactive elements
 * - Proper number formatting with localization
 * - Loading and error states
 */

interface Position {
  symbol: string;
  quantity: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  currentPrice: number;
  avgEntryPrice: number;
}

interface PortfolioData {
  totalValue: number;
  buyingPower: number;
  cash: number;
  dayPnL: number;
  dayPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
}

interface PortfolioOverviewProps {
  portfolio: PortfolioData;
  positions: Position[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  portfolio,
  positions,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  // Format currency with proper accessibility
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage with proper accessibility
  const formatPercent = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Get accessible color class
  const getValueColorClass = (value: number): string => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-300';
  };

  // Calculate portfolio stats
  const winnersCount = positions.filter(p => p.unrealizedPnL > 0).length;
  const losersCount = positions.filter(p => p.unrealizedPnL < 0).length;

  // Loading state
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading portfolio data"
        className="flex flex-col items-center justify-center py-12 space-y-4"
      >
        <div className="animate-spin text-4xl" aria-hidden="true">⏳</div>
        <p className="text-gray-400">Loading portfolio data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-red-900/50 border-2 border-red-500 rounded-lg p-6"
      >
        <div className="flex items-start space-x-3">
          <span className="text-3xl flex-shrink-0" aria-hidden="true">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-200 text-lg">Error Loading Portfolio</h3>
            <p className="text-red-300 mt-2">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors min-h-[44px]"
                aria-label="Retry loading portfolio"
                type="button"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value Card */}
        <article
          className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-2 border-blue-700 rounded-lg p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
          aria-labelledby="total-value-heading"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3
                id="total-value-heading"
                className="text-sm font-medium text-blue-200"
              >
                Total Portfolio Value
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">
                {formatCurrency(portfolio.totalValue)}
              </p>
            </div>
            <div
              className="p-2 bg-blue-700/50 rounded-lg"
              aria-hidden="true"
            >
              <span className="text-2xl">💼</span>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className={`font-semibold ${getValueColorClass(portfolio.totalPnLPercent)}`}>
              {formatPercent(portfolio.totalPnLPercent)}
            </span>
            <span className="text-gray-300 ml-1">total return</span>
          </div>
        </article>

        {/* Day P&L Card */}
        <article
          className={`bg-gradient-to-br ${
            portfolio.dayPnL >= 0
              ? 'from-green-900/40 to-green-800/40 border-green-700'
              : 'from-red-900/40 to-red-800/40 border-red-700'
          } border-2 rounded-lg p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200`}
          aria-labelledby="day-pnl-heading"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3
                id="day-pnl-heading"
                className={`text-sm font-medium ${
                  portfolio.dayPnL >= 0 ? 'text-green-200' : 'text-red-200'
                }`}
              >
                Daily P&L
              </h3>
              <p
                className={`text-2xl md:text-3xl font-bold mt-2 ${getValueColorClass(
                  portfolio.dayPnL
                )}`}
              >
                {formatCurrency(portfolio.dayPnL)}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                portfolio.dayPnL >= 0 ? 'bg-green-700/50' : 'bg-red-700/50'
              }`}
              aria-hidden="true"
            >
              <span className="text-2xl">
                {portfolio.dayPnL >= 0 ? '📈' : '📉'}
              </span>
            </div>
          </div>
          <div className="flex items-center text-sm">
            <span className={`font-semibold ${getValueColorClass(portfolio.dayPnLPercent)}`}>
              {formatPercent(portfolio.dayPnLPercent)}
            </span>
            <span className="text-gray-300 ml-1">today</span>
          </div>
        </article>

        {/* Buying Power Card */}
        <article
          className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-2 border-purple-700 rounded-lg p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
          aria-labelledby="buying-power-heading"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3
                id="buying-power-heading"
                className="text-sm font-medium text-purple-200"
              >
                Buying Power
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">
                {formatCurrency(portfolio.buyingPower)}
              </p>
            </div>
            <div
              className="p-2 bg-purple-700/50 rounded-lg"
              aria-hidden="true"
            >
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            Cash: {formatCurrency(portfolio.cash)}
          </div>
        </article>

        {/* Open Positions Card */}
        <article
          className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/40 border-2 border-indigo-700 rounded-lg p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
          aria-labelledby="positions-heading"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3
                id="positions-heading"
                className="text-sm font-medium text-indigo-200"
              >
                Open Positions
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">
                {positions.length}
              </p>
            </div>
            <div
              className="p-2 bg-indigo-700/50 rounded-lg"
              aria-hidden="true"
            >
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="flex items-center text-sm space-x-3">
            <span className="text-green-400 font-semibold">
              {winnersCount} ↑
            </span>
            <span className="text-red-400 font-semibold">
              {losersCount} ↓
            </span>
          </div>
        </article>
      </div>

      {/* Positions Table - Responsive */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-900/50 border-b-2 border-gray-700">
          <h2 className="text-xl font-bold text-white">Current Positions</h2>
          <p className="text-sm text-gray-400 mt-1">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {positions.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl mb-4 block" aria-hidden="true">📭</span>
            <p className="text-gray-400 text-lg">No open positions</p>
            <p className="text-gray-500 text-sm mt-2">
              Start trading to see your positions here
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" role="table" aria-label="Portfolio positions">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-700">
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Market Value
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      P&L
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      P&L %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {positions.map((position, index) => (
                    <tr
                      key={`${position.symbol}-${index}`}
                      className="hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-white text-lg">
                          {position.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-300">
                        {position.quantity?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-300">
                        {formatCurrency(position.avgEntryPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                        {formatCurrency(position.marketValue)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${getValueColorClass(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${getValueColorClass(position.unrealizedPnLPercent)}`}>
                        {formatPercent(position.unrealizedPnLPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-700">
              {positions.map((position, index) => (
                <article
                  key={`${position.symbol}-mobile-${index}`}
                  className="p-4 hover:bg-gray-700/30 transition-colors"
                  aria-label={`Position in ${position.symbol}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-white">
                      {position.symbol}
                    </h3>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        position.unrealizedPnL >= 0
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      {formatPercent(position.unrealizedPnLPercent)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400">Quantity</div>
                      <div className="text-white font-semibold mt-1">
                        {position.quantity?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Current Price</div>
                      <div className="text-white font-semibold mt-1">
                        {formatCurrency(position.currentPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Market Value</div>
                      <div className="text-white font-semibold mt-1">
                        {formatCurrency(position.marketValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Unrealized P&L</div>
                      <div className={`font-semibold mt-1 ${getValueColorClass(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                    <span>Avg Entry: {formatCurrency(position.avgEntryPrice)}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PortfolioOverview;