import { MarketData } from "@/lib/market-data/YahooFinanceClient";
import { AIConfig } from "@/types/trading";

export class MLPredictionEngine {
  constructor(private config: AIConfig) {}

  async loadModels(): Promise<void> {
    console.log("🤖 ML models loaded");
  }

  async shutdown(): Promise<void> {
    console.log("🤖 ML models shut down");
  }

  async predict(marketData: MarketData[]): Promise<{
    direction: "UP" | "DOWN" | "HOLD";
    confidence: number;
    riskScore: number;
    reasoning: string;
  }> {
     const recentPrices = marketData.slice(-5).map(d => d.close)
     const trend = (recentPrices[4] - recentPrices[0]) / recentPrices[0]

    const direction = trend > 0.01 ? 'UP' : trend < -0.01 ? 'DOWN' : 'HOLD'
    const confidence = Math.min(0.95, 0.6 + Math.abs(trend) * 10)
    const riskScore = Math.max(0.1, Math.min(0.8, Math.abs(trend) * 5))
    
   return {
      direction,
      confidence,
      riskScore,
      reasoning: `Trend-based prediction: ${(trend * 100).toFixed(2)}% price change`
    }
  }

  private calculateStochastic(data: MarketData[], period: number): number {
    if (data.length < period) return 50;

    const recentData = data.slice(-period);
    const highs = recentData.map((d) => d.high);
    const lows = recentData.map((d) => d.low);
    const currentClose = data[data.length - 1].close;

    const highest = Math.max(...highs);
    const lowest = Math.min(...lows);

    if (highest === lowest) return 50;
    return ((currentClose - lowest) / (highest - lowest)) * 100;
  }

  private calculateWilliamsR(data: MarketData[], period: number): number {
    return this.calculateStochastic(data, period) - 100; // Williams %R is inverted Stochastic
  }

  private calculateROC(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;

    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];

    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 20) return 0;

    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const currentPrice = prices[prices.length - 1];

    // Trend strength based on price position relative to moving averages
    const short_trend = (currentPrice - sma20) / sma20;
    const long_trend = (sma20 - sma50) / sma50;

    return short_trend * 0.7 + long_trend * 0.3;
  }

  private calculateVolumeSentiment(
    prices: number[],
    volumes: number[]
  ): number {
    if (prices.length < 2 || volumes.length < 2) return 0;

    let bullishVolume = 0,
      bearishVolume = 0;

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        bullishVolume += volumes[i];
      } else {
        bearishVolume += volumes[i];
      }
    }

    const totalVolume = bullishVolume + bearishVolume;
    if (totalVolume === 0) return 0;

    return (bullishVolume - bearishVolume) / totalVolume;
  }

  private calculateVolatilitySentiment(prices: number[]): number {
    const volatility = this.calculateVolatility(prices);

    // Higher volatility often indicates fear/uncertainty (negative sentiment)
    // Lower volatility indicates complacency (neutral to positive)
    if (volatility > 0.4) return -0.5; // High fear
    if (volatility > 0.25) return -0.2; // Moderate concern
    if (volatility < 0.1) return 0.3; // Complacency
    return 0; // Normal volatility
  }

  private isMarketOpen(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();

    // US market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  }

  private getMarketRegime(date: Date): number {
    // Simplified market regime classification
    const hour = date.getHours();

    if (hour >= 9 && hour < 11) return 0.8; // Opening volatility
    if (hour >= 11 && hour < 14) return 0.3; // Midday calm
    if (hour >= 14 && hour < 16) return 0.9; // Closing volatility
    return 0.1; // After hours
  }

  private analyzeSequencePattern(recentData: MarketData[]): number {
    const prices = recentData.map((d) => d.close);
    let pattern = 0;

    // Look for common patterns
    for (let i = 2; i < prices.length; i++) {
      if (prices[i] > prices[i - 1] && prices[i - 1] > prices[i - 2]) {
        pattern += 0.1; // Uptrend continuation
      } else if (prices[i] < prices[i - 1] && prices[i - 1] < prices[i - 2]) {
        pattern -= 0.1; // Downtrend continuation
      }
    }

    return Math.tanh(pattern); // Bounded between -1 and 1
  }

  private calculateAttentionWeights(marketData: MarketData[]): number[] {
    // Simplified attention mechanism - focus on recent data and high volatility periods
    const weights = [];
    const prices = marketData.map((d) => d.close);

    for (let i = 0; i < marketData.length; i++) {
      // Recency bias
      const recencyWeight = Math.exp(-(marketData.length - i - 1) * 0.1);

      // Volatility attention
      const volatilityWeight =
        i > 0 ? Math.abs(prices[i] - prices[i - 1]) / prices[i - 1] : 0;

      weights.push(recencyWeight + volatilityWeight * 2);
    }

    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => w / sum);
  }

  private findComplexPatterns(
    marketData: MarketData[],
    attentionWeights: number[]
  ): number {
    // Simulate complex pattern recognition using attention weights
    const prices = marketData.map((d) => d.close);
    let patternStrength = 0;

    // Weighted pattern analysis
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i - 1]) / prices[i - 1];
      const weight = attentionWeights[i];
      patternStrength += priceChange * weight;
    }

    return Math.tanh(patternStrength * 5); // Amplify and bound the signal
  }

  private calculateTechnicalScore(indicators: number[]): number {
    if (indicators.length < 7) return 0;

    const [rsi, macd, signal, bb, stoch, williamsR, roc] = indicators;

    // Convert indicators to normalized scores (-1 to 1)
    const rsiScore = (rsi - 50) / 50; // RSI: 0-100 -> -1 to 1
    const macdScore = Math.tanh(macd - signal); // MACD divergence
    const bbScore = Math.tanh(bb); // Bollinger position
    const stochScore = (stoch - 50) / 50; // Stochastic: 0-100 -> -1 to 1
    const wrScore = (williamsR + 50) / 50; // Williams %R: -100 to 0 -> -1 to 1
    const rocScore = Math.tanh(roc / 10); // Rate of change

    return (
      (rsiScore + macdScore + bbScore + stochScore + wrScore + rocScore) / 6
    );
  }

  private calculateAgreement(predictions: MLPrediction[]): number {
    if (predictions.length < 2) return 0;

    const directions = predictions.map((p) => p.direction);
    const uniqueDirections = new Set(directions);

    // Perfect agreement bonus
    if (uniqueDirections.size === 1) return 1;

    // Partial agreement
    const mostCommon = [...uniqueDirections]
      .map((dir) => ({
        dir,
        count: directions.filter((d) => d === dir).length,
      }))
      .sort((a, b) => b.count - a.count)[0];

    return mostCommon.count / predictions.length;
  }
}

// Simplified ML prediction - replace with actual implementation
//     const recentPrices = marketData.slice(-5).map(d => d.close)
//     const trend = (recentPrices[4] - recentPrices[0]) / recentPrices[0]

//     const direction = trend > 0.01 ? 'UP' : trend < -0.01 ? 'DOWN' : 'HOLD'
//     const confidence = Math.min(0.95, 0.6 + Math.abs(trend) * 10)
//     const riskScore = Math.max(0.1, Math.min(0.8, Math.abs(trend) * 5))

//     return {
//       direction,
//       confidence,
//       riskScore,
//       reasoning: `Trend-based prediction: ${(trend * 100).toFixed(2)}% price change`
//     }
//   }
// }
