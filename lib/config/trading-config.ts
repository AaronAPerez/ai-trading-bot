export const ENHANCED_TRADING_CONFIG = {
  ai: {
    confidenceThresholds: {
      minimum: 0.55,      // Lowered for more opportunities
      conservative: 0.65,
      aggressive: 0.75,
      maximum: 0.85
    },
    strategies: ['ML_ENHANCED', 'TECHNICAL_CONFIRMATION', 'SENTIMENT_MOMENTUM'],
    learningEnabled: true,
    sentimentSources: ['news', 'fear_greed'], // Add 'twitter', 'reddit' when APIs available
    technicalIndicators: {
      trend: ['SMA_20', 'SMA_50', 'EMA_12', 'EMA_26'],
      momentum: ['RSI_14', 'MACD', 'STOCH_14'],
      volatility: ['BOLLINGER_20', 'ATR_14'],
      volume: ['OBV']
    }
  },
  
  risk: {
    maxDailyLoss: 0.03,        // 3% max daily loss
    maxDrawdown: 0.15,         // 15% max drawdown
    maxPositionSize: 0.08,     // 8% max position size (reduced)
    maxSectorExposure: 0.25,   // 25% max sector exposure
    maxCorrelation: 0.70,      // 70% max correlation
    stopLossRequired: true,
    positionSizingModel: 'KELLY_CRITERION' // Advanced sizing
  },

  execution: {
    autoExecuteEnabled: true,
    confidenceBuffer: 0.05,    // Execute 5% below user threshold
    maxExecutionsPerCycle: 6,  // Reduced from 8
    executionDelay: 2000,      // 2 second delay between executions
    
    positionSizing: {
      baseSize: 0.025,         // 2.5% base position
      maxSize: 0.08,           // 8% maximum position
      confidenceMultiplier: 2.2, // Good sensitivity
      riskAdjustment: true     // Enable risk-based adjustment
    }
  },

  learning: {
    enabled: true,
    analysisFrequency: 'HOURLY', // Run learning analysis every hour
    minTradesSample: 10,        // Minimum trades for analysis
    patternRecognition: true,   // Enable pattern recognition
    modelAdaptation: true,      // Enable model adaptation
    feedbackLearning: true      // Enable manual feedback learning
  }
}