import { supabaseService } from '@/lib/database/supabase-utils'
import { MarketData } from '@/types/trading'
import { marketRegimeDetector, MarketRegime } from './MarketRegimeDetector'

interface TrainingData {
  features: number[]
  target: number
  metadata: {
    symbol: string
    timestamp: Date
    regime: MarketRegime
    outcome: 'profit' | 'loss' | 'breakeven'
  }
}

interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  sharpeRatio: number
  maxDrawdown: number
  totalReturn: number
  winRate: number
}

interface TrainedModel {
  id: string
  name: string
  type: 'CLASSIFICATION' | 'REGRESSION' | 'ENSEMBLE'
  version: number
  metrics: ModelMetrics
  weights: number[]
  features: string[]
  trainingData: {
    size: number
    dateRange: { start: Date; end: Date }
    regimes: MarketRegime[]
  }
  lastTrained: Date
  isActive: boolean
}

interface FeatureEngineering {
  technicalIndicators: Record<string, number>
  priceFeatures: Record<string, number>
  volumeFeatures: Record<string, number>
  sentimentFeatures: Record<string, number>
  temporalFeatures: Record<string, number>
  regimeFeatures: Record<string, number>
}

export class MLTrainingPipeline {
  private models: Map<string, TrainedModel> = new Map()
  private retrainingThreshold = 100 // Retrain after 100 new trades
  private minTrainingData = 500 // Minimum data points for training

  async trainModels(userId: string, symbol?: string): Promise<{
    trainedModels: TrainedModel[]
    metrics: Record<string, ModelMetrics>
    recommendations: string[]
  }> {
    try {
      console.log(`Starting ML training pipeline for user ${userId}${symbol ? ` and symbol ${symbol}` : ''}`)

      // Prepare training data
      const trainingData = await this.prepareTrainingData(userId, symbol)

      if (trainingData.length < this.minTrainingData) {
        return {
          trainedModels: [],
          metrics: {},
          recommendations: [`Insufficient training data. Need at least ${this.minTrainingData} data points, have ${trainingData.length}`]
        }
      }

      // Split data into train/validation/test sets
      const { trainSet, validationSet, testSet } = this.splitTrainingData(trainingData)

      const trainedModels: TrainedModel[] = []
      const metrics: Record<string, ModelMetrics> = {}
      const recommendations: string[] = []

      // Train multiple model types

      // 1. Price Direction Classifier
      const directionModel = await this.trainDirectionClassifier(trainSet, validationSet, testSet, symbol)
      if (directionModel) {
        trainedModels.push(directionModel)
        metrics[directionModel.name] = directionModel.metrics
      }

      // 2. Return Magnitude Regressor
      const magnitudeModel = await this.trainMagnitudeRegressor(trainSet, validationSet, testSet, symbol)
      if (magnitudeModel) {
        trainedModels.push(magnitudeModel)
        metrics[magnitudeModel.name] = magnitudeModel.metrics
      }

      // 3. Regime-Specific Models
      const regimeModels = await this.trainRegimeSpecificModels(trainSet, validationSet, testSet, symbol)
      trainedModels.push(...regimeModels)
      regimeModels.forEach(model => {
        metrics[model.name] = model.metrics
      })

      // 4. Ensemble Model
      if (trainedModels.length >= 2) {
        const ensembleModel = await this.trainEnsembleModel(trainedModels, validationSet, testSet, symbol)
        if (ensembleModel) {
          trainedModels.push(ensembleModel)
          metrics[ensembleModel.name] = ensembleModel.metrics
        }
      }

      // Store trained models
      trainedModels.forEach(model => {
        this.models.set(model.id, model)
      })

      // Generate recommendations
      recommendations.push(...this.generateTrainingRecommendations(trainedModels, metrics))

      return {
        trainedModels,
        metrics,
        recommendations
      }

    } catch (error) {
      console.error('Error in ML training pipeline:', error)
      return {
        trainedModels: [],
        metrics: {},
        recommendations: ['Training pipeline failed. Check data quality and try again.']
      }
    }
  }

  async shouldRetrain(userId: string, symbol?: string): Promise<{
    shouldRetrain: boolean
    reason: string
    newDataCount: number
    lastTrainingDate?: Date
  }> {
    try {
      const learningData = await supabaseService.getAILearningData(userId, symbol)

      // Get the latest model for this symbol/user
      const latestModel = this.getLatestModel(symbol)

      if (!latestModel) {
        return {
          shouldRetrain: true,
          reason: 'No trained model exists',
          newDataCount: learningData.length
        }
      }

      // Count new data since last training
      const newData = learningData.filter(d =>
        new Date(d.created_at) > latestModel.lastTrained
      )

      const shouldRetrain = newData.length >= this.retrainingThreshold

      return {
        shouldRetrain,
        reason: shouldRetrain
          ? `${newData.length} new trades since last training (threshold: ${this.retrainingThreshold})`
          : `Only ${newData.length} new trades since last training`,
        newDataCount: newData.length,
        lastTrainingDate: latestModel.lastTrained
      }

    } catch (error) {
      console.error('Error checking retrain status:', error)
      return {
        shouldRetrain: false,
        reason: 'Error checking retrain status',
        newDataCount: 0
      }
    }
  }

  async getPrediction(features: FeatureEngineering, symbol?: string): Promise<{
    direction: 'UP' | 'DOWN' | 'HOLD'
    confidence: number
    expectedReturn: number
    riskScore: number
    modelUsed: string
  }> {
    try {
      const model = this.getBestModel(symbol)

      if (!model) {
        return {
          direction: 'HOLD',
          confidence: 0.5,
          expectedReturn: 0,
          riskScore: 0.5,
          modelUsed: 'DEFAULT'
        }
      }

      const featureVector = this.featuresToVector(features, model.features)
      const prediction = this.predict(model, featureVector)

      return {
        direction: this.classifyDirection(prediction),
        confidence: this.calculatePredictionConfidence(prediction, model),
        expectedReturn: prediction,
        riskScore: this.calculateRiskScore(features, model),
        modelUsed: model.name
      }

    } catch (error) {
      console.error('Error getting ML prediction:', error)
      return {
        direction: 'HOLD',
        confidence: 0.5,
        expectedReturn: 0,
        riskScore: 0.5,
        modelUsed: 'ERROR'
      }
    }
  }

  private async prepareTrainingData(userId: string, symbol?: string): Promise<TrainingData[]> {
    const learningData = await supabaseService.getAILearningData(userId, symbol)
    const trainingData: TrainingData[] = []

    for (const data of learningData) {
      try {
        const features = this.extractFeatures(data)
        const target = this.calculateTarget(data)

        trainingData.push({
          features,
          target,
          metadata: {
            symbol: data.symbol,
            timestamp: new Date(data.created_at),
            regime: this.inferRegime(data.market_conditions),
            outcome: data.outcome as 'profit' | 'loss' | 'breakeven'
          }
        })
      } catch (error) {
        console.error('Error processing training data point:', error)
      }
    }

    return trainingData
  }

  private extractFeatures(data: any): number[] {
    const features: number[] = []

    // Technical indicators
    const technical = data.technical_indicators || {}
    features.push(
      technical.rsi || 50,
      technical.macd || 0,
      technical.bollinger_position || 0.5,
      technical.volume_sma_ratio || 1,
      technical.price_sma_ratio || 1
    )

    // Market conditions
    const conditions = data.market_conditions.entry || {}
    features.push(
      conditions.price_momentum || 0,
      conditions.volatility || 0.2,
      conditions.volume_trend || 0,
      conditions.sentiment_at_entry?.sentimentScore || 0
    )

    // Sentiment features
    features.push(data.sentiment_score || 0)

    // Confidence and strategy features
    features.push(
      data.confidence_score || 0.5,
      this.encodeStrategy(data.strategy_used || 'DEFAULT')
    )

    // Temporal features
    const timestamp = new Date(data.created_at)
    features.push(
      timestamp.getHours() / 24,
      timestamp.getDay() / 7,
      timestamp.getMonth() / 12
    )

    return features
  }

  private calculateTarget(data: any): number {
    // For regression: return the actual profit/loss ratio
    return data.profit_loss / Math.max(1, Math.abs(data.profit_loss)) // Normalize to [-1, 1]
  }

  private inferRegime(marketConditions: any): MarketRegime {
    const conditions = marketConditions.entry || {}
    const momentum = conditions.price_momentum || 0
    const volatility = conditions.volatility || 0.2

    if (volatility > 0.4) return 'VOLATILE'
    if (momentum > 0.03) return 'BULL'
    if (momentum < -0.03) return 'BEAR'
    return 'SIDEWAYS'
  }

  private splitTrainingData(data: TrainingData[]): {
    trainSet: TrainingData[]
    validationSet: TrainingData[]
    testSet: TrainingData[]
  } {
    // Sort by timestamp to maintain temporal order
    const sortedData = data.sort((a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime())

    const trainSize = Math.floor(sortedData.length * 0.7)
    const validSize = Math.floor(sortedData.length * 0.15)

    return {
      trainSet: sortedData.slice(0, trainSize),
      validationSet: sortedData.slice(trainSize, trainSize + validSize),
      testSet: sortedData.slice(trainSize + validSize)
    }
  }

  private async trainDirectionClassifier(
    trainSet: TrainingData[],
    validationSet: TrainingData[],
    testSet: TrainingData[],
    symbol?: string
  ): Promise<TrainedModel | null> {
    try {
      // Simplified linear classifier
      const weights = this.trainLinearClassifier(trainSet)
      const metrics = this.evaluateModel(weights, testSet, 'CLASSIFICATION')

      return {
        id: `direction_classifier_${symbol || 'global'}_${Date.now()}`,
        name: 'Price Direction Classifier',
        type: 'CLASSIFICATION',
        version: 1,
        metrics,
        weights,
        features: this.getFeatureNames(),
        trainingData: {
          size: trainSet.length,
          dateRange: {
            start: trainSet[0].metadata.timestamp,
            end: trainSet[trainSet.length - 1].metadata.timestamp
          },
          regimes: [...new Set(trainSet.map(d => d.metadata.regime))]
        },
        lastTrained: new Date(),
        isActive: true
      }
    } catch (error) {
      console.error('Error training direction classifier:', error)
      return null
    }
  }

  private async trainMagnitudeRegressor(
    trainSet: TrainingData[],
    validationSet: TrainingData[],
    testSet: TrainingData[],
    symbol?: string
  ): Promise<TrainedModel | null> {
    try {
      // Simplified linear regressor
      const weights = this.trainLinearRegressor(trainSet)
      const metrics = this.evaluateModel(weights, testSet, 'REGRESSION')

      return {
        id: `magnitude_regressor_${symbol || 'global'}_${Date.now()}`,
        name: 'Return Magnitude Regressor',
        type: 'REGRESSION',
        version: 1,
        metrics,
        weights,
        features: this.getFeatureNames(),
        trainingData: {
          size: trainSet.length,
          dateRange: {
            start: trainSet[0].metadata.timestamp,
            end: trainSet[trainSet.length - 1].metadata.timestamp
          },
          regimes: [...new Set(trainSet.map(d => d.metadata.regime))]
        },
        lastTrained: new Date(),
        isActive: true
      }
    } catch (error) {
      console.error('Error training magnitude regressor:', error)
      return null
    }
  }

  private async trainRegimeSpecificModels(
    trainSet: TrainingData[],
    validationSet: TrainingData[],
    testSet: TrainingData[],
    symbol?: string
  ): Promise<TrainedModel[]> {
    const models: TrainedModel[] = []
    const regimes: MarketRegime[] = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE']

    for (const regime of regimes) {
      const regimeTrainData = trainSet.filter(d => d.metadata.regime === regime)
      const regimeTestData = testSet.filter(d => d.metadata.regime === regime)

      if (regimeTrainData.length < 50) continue // Not enough data for this regime

      try {
        const weights = this.trainLinearRegressor(regimeTrainData)
        const metrics = this.evaluateModel(weights, regimeTestData, 'REGRESSION')

        models.push({
          id: `regime_${regime.toLowerCase()}_${symbol || 'global'}_${Date.now()}`,
          name: `${regime} Regime Model`,
          type: 'REGRESSION',
          version: 1,
          metrics,
          weights,
          features: this.getFeatureNames(),
          trainingData: {
            size: regimeTrainData.length,
            dateRange: {
              start: regimeTrainData[0].metadata.timestamp,
              end: regimeTrainData[regimeTrainData.length - 1].metadata.timestamp
            },
            regimes: [regime]
          },
          lastTrained: new Date(),
          isActive: true
        })
      } catch (error) {
        console.error(`Error training ${regime} regime model:`, error)
      }
    }

    return models
  }

  private async trainEnsembleModel(
    baseModels: TrainedModel[],
    validationSet: TrainingData[],
    testSet: TrainingData[],
    symbol?: string
  ): Promise<TrainedModel | null> {
    try {
      // Simple ensemble: weighted average based on individual model performance
      const ensembleWeights = baseModels.map(model => model.metrics.accuracy || 0.5)
      const normalizedWeights = this.normalizeWeights(ensembleWeights)

      // Evaluate ensemble on test set
      const ensemblePredictions = this.evaluateEnsemble(baseModels, normalizedWeights, testSet)
      const metrics = this.calculateEnsembleMetrics(ensemblePredictions, testSet)

      return {
        id: `ensemble_${symbol || 'global'}_${Date.now()}`,
        name: 'Ensemble Model',
        type: 'ENSEMBLE',
        version: 1,
        metrics,
        weights: normalizedWeights,
        features: this.getFeatureNames(),
        trainingData: {
          size: testSet.length,
          dateRange: {
            start: testSet[0].metadata.timestamp,
            end: testSet[testSet.length - 1].metadata.timestamp
          },
          regimes: [...new Set(testSet.map(d => d.metadata.regime))]
        },
        lastTrained: new Date(),
        isActive: true
      }
    } catch (error) {
      console.error('Error training ensemble model:', error)
      return null
    }
  }

  private trainLinearClassifier(trainData: TrainingData[]): number[] {
    const featureCount = trainData[0].features.length
    const weights = new Array(featureCount + 1).fill(0) // +1 for bias

    // Simple gradient descent
    const learningRate = 0.01
    const epochs = 100

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of trainData) {
        const prediction = this.sigmoid(this.dotProduct(weights, [...sample.features, 1]))
        const target = sample.target > 0 ? 1 : 0
        const error = target - prediction

        // Update weights
        for (let i = 0; i < weights.length - 1; i++) {
          weights[i] += learningRate * error * sample.features[i]
        }
        weights[weights.length - 1] += learningRate * error // bias
      }
    }

    return weights
  }

  private trainLinearRegressor(trainData: TrainingData[]): number[] {
    const featureCount = trainData[0].features.length
    const weights = new Array(featureCount + 1).fill(0)

    // Simple gradient descent for regression
    const learningRate = 0.001
    const epochs = 200

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of trainData) {
        const prediction = this.dotProduct(weights, [...sample.features, 1])
        const error = sample.target - prediction

        // Update weights
        for (let i = 0; i < weights.length - 1; i++) {
          weights[i] += learningRate * error * sample.features[i]
        }
        weights[weights.length - 1] += learningRate * error // bias
      }
    }

    return weights
  }

  private evaluateModel(weights: number[], testData: TrainingData[], type: 'CLASSIFICATION' | 'REGRESSION'): ModelMetrics {
    let correct = 0
    let totalReturn = 0
    let maxDrawdown = 0
    let peak = 0
    let wins = 0

    const predictions: number[] = []
    const targets: number[] = []

    for (const sample of testData) {
      const prediction = type === 'CLASSIFICATION'
        ? this.sigmoid(this.dotProduct(weights, [...sample.features, 1]))
        : this.dotProduct(weights, [...sample.features, 1])

      predictions.push(prediction)
      targets.push(sample.target)

      // Classification accuracy
      if (type === 'CLASSIFICATION') {
        const predictedClass = prediction > 0.5 ? 1 : 0
        const actualClass = sample.target > 0 ? 1 : 0
        if (predictedClass === actualClass) correct++
      }

      // Trading metrics
      const tradeReturn = prediction * sample.target
      totalReturn += tradeReturn

      if (totalReturn > peak) peak = totalReturn
      const drawdown = peak - totalReturn
      if (drawdown > maxDrawdown) maxDrawdown = drawdown

      if (tradeReturn > 0) wins++
    }

    const accuracy = type === 'CLASSIFICATION' ? correct / testData.length : this.calculateR2(predictions, targets)
    const winRate = wins / testData.length
    const avgReturn = totalReturn / testData.length
    const returns = predictions.map((p, i) => p * targets[i])
    const sharpeRatio = this.calculateSharpeRatio(returns)

    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy,    // Simplified
      f1Score: accuracy,   // Simplified
      sharpeRatio,
      maxDrawdown,
      totalReturn,
      winRate
    }
  }

  private generateTrainingRecommendations(models: TrainedModel[], metrics: Record<string, ModelMetrics>): string[] {
    const recommendations: string[] = []

    // Find best performing model
    const bestModel = models.reduce((best, current) =>
      current.metrics.sharpeRatio > best.metrics.sharpeRatio ? current : best
    )

    recommendations.push(`Best performing model: ${bestModel.name} (Sharpe: ${bestModel.metrics.sharpeRatio.toFixed(2)})`)

    // Check for overfitting
    const avgAccuracy = Object.values(metrics).reduce((sum, m) => sum + m.accuracy, 0) / Object.keys(metrics).length
    if (avgAccuracy > 0.9) {
      recommendations.push('Warning: Models may be overfitting. Consider regularization.')
    }

    // Check data quality
    if (models.length === 0) {
      recommendations.push('No models trained successfully. Check data quality.')
    } else if (models.length < 3) {
      recommendations.push('Limited model diversity. Collect more diverse trading data.')
    }

    // Performance recommendations
    if (bestModel.metrics.winRate < 0.5) {
      recommendations.push('Low win rate detected. Consider adjusting entry criteria.')
    }

    if (bestModel.metrics.maxDrawdown > 0.2) {
      recommendations.push('High maximum drawdown. Implement better risk management.')
    }

    return recommendations
  }

  // Helper methods
  private getFeatureNames(): string[] {
    return [
      'rsi', 'macd', 'bollinger_position', 'volume_sma_ratio', 'price_sma_ratio',
      'price_momentum', 'volatility', 'volume_trend', 'sentiment_entry',
      'sentiment_score', 'confidence_score', 'strategy_encoded',
      'hour_of_day', 'day_of_week', 'month_of_year'
    ]
  }

  private encodeStrategy(strategy: string): number {
    const strategies = ['DEFAULT', 'MOMENTUM', 'MEAN_REVERSION', 'BREAKOUT', 'SCALPING']
    return strategies.indexOf(strategy) / strategies.length
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0)
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  private calculateR2(predictions: number[], targets: number[]): number {
    const meanTarget = targets.reduce((a, b) => a + b, 0) / targets.length
    const ssRes = predictions.reduce((sum, pred, i) => sum + Math.pow(targets[i] - pred, 2), 0)
    const ssTot = targets.reduce((sum, target) => sum + Math.pow(target - meanTarget, 2), 0)
    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    return stdDev > 0 ? mean / stdDev : 0
  }

  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0)
    return sum > 0 ? weights.map(w => w / sum) : weights.map(() => 1 / weights.length)
  }

  private evaluateEnsemble(models: TrainedModel[], weights: number[], testData: TrainingData[]): number[] {
    return testData.map(sample => {
      const featureVector = [...sample.features, 1]
      const predictions = models.map(model => this.predict(model, featureVector))
      return predictions.reduce((sum, pred, i) => sum + pred * weights[i], 0)
    })
  }

  private calculateEnsembleMetrics(predictions: number[], testData: TrainingData[]): ModelMetrics {
    const targets = testData.map(d => d.target)
    return this.evaluateModel([], testData.map((d, i) => ({ ...d, target: targets[i] })), 'REGRESSION')
  }

  private predict(model: TrainedModel, features: number[]): number {
    if (model.type === 'CLASSIFICATION') {
      return this.sigmoid(this.dotProduct(model.weights, features))
    } else {
      return this.dotProduct(model.weights, features)
    }
  }

  private featuresToVector(features: FeatureEngineering, featureNames: string[]): number[] {
    // Convert FeatureEngineering to feature vector based on feature names
    const vector: number[] = []

    // This would map the structured features to the expected vector format
    // For now, return a simplified version
    vector.push(
      features.technicalIndicators.rsi || 50,
      features.technicalIndicators.macd || 0,
      features.priceFeatures.momentum || 0,
      features.volumeFeatures.trend || 0,
      features.sentimentFeatures.score || 0
    )

    return vector
  }

  private classifyDirection(prediction: number): 'UP' | 'DOWN' | 'HOLD' {
    if (prediction > 0.02) return 'UP'
    if (prediction < -0.02) return 'DOWN'
    return 'HOLD'
  }

  private calculatePredictionConfidence(prediction: number, model: TrainedModel): number {
    return Math.min(0.95, Math.abs(prediction) * 2 + model.metrics.accuracy * 0.5)
  }

  private calculateRiskScore(features: FeatureEngineering, model: TrainedModel): number {
    const volatility = features.technicalIndicators.volatility || 0.2
    const confidence = model.metrics.accuracy || 0.5
    return Math.max(0.1, Math.min(0.9, volatility * (1 - confidence)))
  }

  private getLatestModel(symbol?: string): TrainedModel | null {
    const symbolModels = Array.from(this.models.values())
      .filter(model => symbol ? model.id.includes(symbol) : true)
      .sort((a, b) => b.lastTrained.getTime() - a.lastTrained.getTime())

    return symbolModels[0] || null
  }

  private getBestModel(symbol?: string): TrainedModel | null {
    const symbolModels = Array.from(this.models.values())
      .filter(model => model.isActive && (symbol ? model.id.includes(symbol) : true))
      .sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio)

    return symbolModels[0] || null
  }

  // Public methods for model management
  getActiveModels(): TrainedModel[] {
    return Array.from(this.models.values()).filter(model => model.isActive)
  }

  async getModelPerformance(): Promise<Record<string, ModelMetrics>> {
    const performance: Record<string, ModelMetrics> = {}
    for (const model of this.getActiveModels()) {
      performance[model.name] = model.metrics
    }
    return performance
  }
}

export const mlTrainingPipeline = new MLTrainingPipeline()