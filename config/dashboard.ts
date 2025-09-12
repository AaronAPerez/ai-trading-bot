export const DASHBOARD_CONFIG = {
  // Update intervals (milliseconds)
  LIVE_UPDATE_INTERVAL: 60000,        // 1 minute
  CHART_UPDATE_INTERVAL: 300000,      // 5 minutes
  STRATEGY_UPDATE_INTERVAL: 120000,   // 2 minutes
  
  // Default settings
  DEFAULT_SYMBOLS: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
  DEFAULT_TIMEFRAME: 'hourly',
  DEFAULT_PERIODS: 100,
  
  // Performance thresholds
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,
  HIGH_CONSENSUS_THRESHOLD: 0.8,
  
  // Risk levels
  RISK_LEVELS: {
    LOW: { threshold: 30, color: 'green' },
    MEDIUM: { threshold: 60, color: 'yellow' },
    HIGH: { threshold: 100, color: 'red' }
  },
  
  // Chart colors
  CHART_COLORS: {
    primary: '#10B981',
    secondary: '#3B82F6', 
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6'
  }
}

export const STRATEGY_CONFIGS = {
  rsi: {
    name: 'RSI Strategy',
    color: '#10B981',
    description: 'Relative Strength Index momentum strategy'
  },
  macd: {
    name: 'MACD Strategy', 
    color: '#3B82F6',
    description: 'Moving Average Convergence Divergence'
  },
  bollinger: {
    name: 'Bollinger Bands',
    color: '#F59E0B', 
    description: 'Mean reversion with volatility bands'
  },
  ma_crossover: {
    name: 'MA Crossover',
    color: '#EF4444',
    description: 'Moving average golden/death cross'
  },
  mean_reversion: {
    name: 'Mean Reversion',
    color: '#8B5CF6',
    description: 'Statistical price mean reversion'
  }
}