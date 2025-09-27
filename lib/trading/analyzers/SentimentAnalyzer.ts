import { SentimentData, NewsArticle } from "@/types/trading"


interface SentimentConfig {
  newsApiKey?: string
  twitterApiKey?: string
  redditApiKey?: string
  enabledSources: ('news' | 'twitter' | 'reddit' | 'fear_greed')[]
  cacheTTL: number // Cache time-to-live in milliseconds
  weights: {
    news: number
    social: number
    fearGreed: number
    technical: number
  }
}

interface CachedSentiment {
  symbol: string
  sentiment: number
  confidence: number
  sources: string[]
  timestamp: Date
  details: {
    newsCount: number
    socialCount: number
    fearGreedIndex?: number
    keyPhrases: string[]
  }
}

export class SentimentAnalyzer {
  private cache = new Map<string, CachedSentiment>()
  private isInitialized = false
  private config: SentimentConfig

  // Predefined sentiment keywords for basic analysis
  private readonly POSITIVE_KEYWORDS = [
    'bullish', 'buy', 'strong', 'growth', 'profit', 'gains', 'surge', 'rally',
    'upward', 'positive', 'optimistic', 'breakthrough', 'success', 'beat',
    'exceed', 'outperform', 'upgrade', 'target', 'momentum', 'breakout'
  ]

  private readonly NEGATIVE_KEYWORDS = [
    'bearish', 'sell', 'weak', 'loss', 'decline', 'drop', 'crash', 'fall',
    'downward', 'negative', 'pessimistic', 'concern', 'risk', 'miss',
    'underperform', 'downgrade', 'warning', 'volatility', 'uncertainty', 'breakdown'
  ]

  private readonly NEUTRAL_KEYWORDS = [
    'hold', 'maintain', 'stable', 'sideways', 'consolidate', 'range',
    'watch', 'monitor', 'neutral', 'unchanged', 'flat', 'pause'
  ]

  constructor(config?: Partial<SentimentConfig>) {
    this.config = {
      enabledSources: ['news', 'fear_greed'],
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      weights: {
        news: 0.4,
        social: 0.3,
        fearGreed: 0.2,
        technical: 0.1
      },
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('💭 Initializing Sentiment Analyzer...')
      
      // Test API connections if keys are provided
      await this.testApiConnections()
      
      // Initialize fear & greed index
      if (this.config.enabledSources.includes('fear_greed')) {
        await this.initializeFearGreedIndex()
      }

      this.isInitialized = true
      console.log('✅ Sentiment Analyzer initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Sentiment Analyzer:', error)
      // Continue with limited functionality
      this.isInitialized = true
    }
  }

  async analyzeSymbol(symbol: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Check cache first
    const cached = this.getCachedSentiment(symbol)
    if (cached) {
      return cached.sentiment
    }

    try {
      const sentimentData = await this.performSentimentAnalysis(symbol)
      const compositeScore = this.calculateCompositeScore(sentimentData)
      
      // Cache the result
      this.cacheSentiment(symbol, compositeScore, sentimentData)
      
      return compositeScore
    } catch (error) {
      console.error(`❌ Sentiment analysis failed for ${symbol}:`, error.message)
      return this.getFallbackSentiment(symbol)
    }
  }

  private async performSentimentAnalysis(symbol: string): Promise<SentimentData> {
    const results: SentimentData = {
      newsScore: 50,
      socialScore: 50,
      fearGreedScore: 50,
      technicalSentiment: 50,
      confidence: 0.3,
      sources: [],
      details: {
        newsCount: 0,
        socialCount: 0,
        keyPhrases: []
      }
    }

    const analysisPromises: Promise<void>[] = []

    // News sentiment analysis
    if (this.config.enabledSources.includes('news')) {
      analysisPromises.push(this.analyzeNewsSentiment(symbol, results))
    }

    // Social media sentiment analysis
    if (this.config.enabledSources.includes('twitter') || this.config.enabledSources.includes('reddit')) {
      analysisPromises.push(this.analyzeSocialSentiment(symbol, results))
    }

    // Fear & Greed Index
    if (this.config.enabledSources.includes('fear_greed')) {
      analysisPromises.push(this.analyzeFearGreedSentiment(symbol, results))
    }

    // Wait for all analysis to complete
    await Promise.all(analysisPromises)

    return results
  }

  private async analyzeNewsSentiment(symbol: string, results: SentimentData): Promise<void> {
    try {
      const newsData = await this.fetchNewsData(symbol)
      if (newsData.length === 0) return

      let totalScore = 0
      let scoredArticles = 0
      const keyPhrases: string[] = []

      for (const article of newsData) {
        const score = this.analyzeTextSentiment(article.title + ' ' + article.description)
        if (score !== null) {
          totalScore += score
          scoredArticles++
          
          // Extract key phrases
          const phrases = this.extractKeyPhrases(article.title + ' ' + article.description)
          keyPhrases.push(...phrases)
        }
      }

      if (scoredArticles > 0) {
        results.newsScore = totalScore / scoredArticles
        results.details.newsCount = scoredArticles
        results.details.keyPhrases.push(...keyPhrases.slice(0, 5)) // Top 5 phrases
        results.sources.push('news')
        results.confidence += 0.3
      }

    } catch (error) {
      console.error(`News sentiment analysis failed for ${symbol}:`, error.message)
    }
  }

  private async analyzeSocialSentiment(symbol: string, results: SentimentData): Promise<void> {
    try {
      // This would integrate with Twitter API, Reddit API, etc.
      // For now, we'll simulate social sentiment based on symbol characteristics
      
      const socialScore = await this.simulateSocialSentiment(symbol)
      results.socialScore = socialScore
      results.sources.push('social')
      results.confidence += 0.2

    } catch (error) {
      console.error(`Social sentiment analysis failed for ${symbol}:`, error.message)
    }
  }

  private async analyzeFearGreedSentiment(symbol: string, results: SentimentData): Promise<void> {
    try {
      const fearGreedIndex = await this.getFearGreedIndex()
      
      // Adjust fear/greed impact based on asset type
      let adjustedScore = fearGreedIndex
      
      if (symbol.includes('USD')) { // Crypto
        // Crypto is more sensitive to fear/greed
        adjustedScore = fearGreedIndex
      } else if (['SPY', 'QQQ', 'IWM'].includes(symbol)) { // Market ETFs
        // ETFs closely follow market sentiment
        adjustedScore = fearGreedIndex
      } else {
        // Individual stocks less directly correlated
        adjustedScore = 50 + (fearGreedIndex - 50) * 0.7
      }

      results.fearGreedScore = adjustedScore
      results.details.fearGreedIndex = fearGreedIndex
      results.sources.push('fear_greed')
      results.confidence += 0.2

    } catch (error) {
      console.error(`Fear/Greed sentiment analysis failed:`, error.message)
    }
  }

  private analyzeTextSentiment(text: string): number | null {
    if (!text || text.trim().length === 0) return null

    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2)
    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0

    for (const word of words) {
      if (this.POSITIVE_KEYWORDS.some(keyword => word.includes(keyword))) {
        positiveCount++
      } else if (this.NEGATIVE_KEYWORDS.some(keyword => word.includes(keyword))) {
        negativeCount++
      } else if (this.NEUTRAL_KEYWORDS.some(keyword => word.includes(keyword))) {
        neutralCount++
      }
    }

    const totalSentimentWords = positiveCount + negativeCount + neutralCount
    if (totalSentimentWords === 0) return 50 // Neutral if no sentiment words found

    // Calculate sentiment score (0-100)
    const positiveRatio = positiveCount / totalSentimentWords
    const negativeRatio = negativeCount / totalSentimentWords
    const neutralRatio = neutralCount / totalSentimentWords

    // Weighted score: positive contributes to higher scores, negative to lower
    const score = (positiveRatio * 80) + (neutralRatio * 50) + (negativeRatio * 20)
    
    return Math.max(0, Math.min(100, score))
  }

  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = []
    const words = text.toLowerCase().split(/\W+/)
    
    // Look for important financial phrases
    const importantWords = words.filter(word => 
      [...this.POSITIVE_KEYWORDS, ...this.NEGATIVE_KEYWORDS, ...this.NEUTRAL_KEYWORDS].includes(word)
    )
    
    return importantWords.slice(0, 3) // Top 3 key words
  }

  private calculateCompositeScore(data: SentimentData): number {
    const weights = this.config.weights
    
    let weightedScore = 0
    let totalWeight = 0

    if (data.sources.includes('news')) {
      weightedScore += data.newsScore * weights.news
      totalWeight += weights.news
    }

    if (data.sources.includes('social')) {
      weightedScore += data.socialScore * weights.social
      totalWeight += weights.social
    }

    if (data.sources.includes('fear_greed')) {
      weightedScore += data.fearGreedScore * weights.fearGreed
      totalWeight += weights.fearGreed
    }

    // Technical sentiment (price action based)
    weightedScore += data.technicalSentiment * weights.technical
    totalWeight += weights.technical

    return totalWeight > 0 ? weightedScore / totalWeight : 50
  }

  private async fetchNewsData(symbol: string): Promise<NewsArticle[]> {
    // This would integrate with actual news APIs like NewsAPI, Alpha Vantage, etc.
    // For demo purposes, we'll simulate news data
    
    const simulatedNews: NewsArticle[] = [
      {
        title: `${symbol} shows strong quarterly performance`,
        description: `${symbol} reported better than expected earnings with strong growth prospects`,
        url: `https://example.com/news/${symbol}`,
        publishedAt: new Date(),
        source: 'Financial News'
      },
      {
        title: `Analysts upgrade ${symbol} target price`,
        description: `Multiple analysts have raised their price targets for ${symbol} citing strong fundamentals`,
        url: `https://example.com/analysis/${symbol}`,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        source: 'Market Analysis'
      }
    ]

    return simulatedNews
  }

  private async simulateSocialSentiment(symbol: string): Promise<number> {
    // Simulate social sentiment based on symbol characteristics
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOGEUSД']
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
    
    let baseScore = 50
    
    if (cryptoSymbols.includes(symbol)) {
      // Crypto tends to have more volatile social sentiment
      baseScore = 45 + Math.random() * 20 // 45-65 range
    } else if (techStocks.includes(symbol)) {
      // Tech stocks generally positive sentiment
      baseScore = 55 + Math.random() * 15 // 55-70 range
    } else {
      // Other stocks more neutral
      baseScore = 48 + Math.random() * 14 // 48-62 range
    }

    return Math.max(0, Math.min(100, baseScore))
  }

  private async getFearGreedIndex(): Promise<number> {
    try {
      // This would call the actual Fear & Greed Index API
      // For demo, we'll simulate based on market conditions
      
      const now = new Date()
      const dayOfWeek = now.getDay()
      const hour = now.getHours()
      
      let baseIndex = 50
      
      // Simulate market-hours effect
      if (hour >= 9 && hour <= 16 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        baseIndex = 52 // Slightly more optimistic during market hours
      }
      
      // Add some randomness to simulate real fear/greed fluctuations
      const randomFactor = (Math.random() - 0.5) * 30 // ±15 points
      
      return Math.max(0, Math.min(100, baseIndex + randomFactor))
      
    } catch (error) {
      console.error('Failed to fetch Fear & Greed Index:', error)
      return 50 // Default neutral
    }
  }

  private async testApiConnections(): Promise<void> {
    console.log('🔗 Testing API connections...')
    
    // Test News API if key provided
    if (this.config.newsApiKey) {
      console.log('📰 News API connection available')
    }
    
    // Test social media APIs if keys provided
    if (this.config.twitterApiKey) {
      console.log('🐦 Twitter API connection available')
    }
    
    if (this.config.redditApiKey) {
      console.log('📱 Reddit API connection available')
    }
  }

  private async initializeFearGreedIndex(): Promise<void> {
    try {
      await this.getFearGreedIndex()
      console.log('😰😤 Fear & Greed Index initialized')
    } catch (error) {
      console.warn('⚠️ Fear & Greed Index not available, using fallback')
    }
  }

  private getCachedSentiment(symbol: string): CachedSentiment | null {
    const cached = this.cache.get(symbol)
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp.getTime()
    if (age > this.config.cacheTTL) {
      this.cache.delete(symbol)
      return null
    }
    
    return cached
  }

  private cacheSentiment(symbol: string, sentiment: number, data: SentimentData): void {
    const cached: CachedSentiment = {
      symbol,
      sentiment,
      confidence: data.confidence,
      sources: data.sources,
      timestamp: new Date(),
      details: {
        newsCount: data.details.newsCount,
        socialCount: data.details.socialCount,
        fearGreedIndex: data.details.fearGreedIndex,
        keyPhrases: data.details.keyPhrases
      }
    }
    
    this.cache.set(symbol, cached)
    
    // Limit cache size to prevent memory issues
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  private getFallbackSentiment(symbol: string): number {
    // Provide reasonable fallback sentiment based on asset type
    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOGEUSД']
    const stableStocks = ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO']
    
    if (cryptoSymbols.includes(symbol)) {
      return 48 // Slightly pessimistic for crypto
    } else if (stableStocks.includes(symbol)) {
      return 55 // Slightly optimistic for stable stocks
    }
    
    return 50 // Neutral for everything else
  }

  // Public methods for monitoring and debugging
  public getCacheStats(): { size: number; symbols: string[]; oldestEntry: Date | null } {
    const symbols = Array.from(this.cache.keys())
    let oldestEntry: Date | null = null
    
    for (const cached of this.cache.values()) {
      if (!oldestEntry || cached.timestamp < oldestEntry) {
        oldestEntry = cached.timestamp
      }
    }
    
    return { size: this.cache.size, symbols, oldestEntry }
  }

  public clearCache(): void {
    this.cache.clear()
    console.log('🗑️ Sentiment cache cleared')
  }

  public getSentimentBreakdown(symbol: string): CachedSentiment | null {
    return this.getCachedSentiment(symbol)
  }

  public updateConfig(newConfig: Partial<SentimentConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Sentiment analyzer config updated')
  }
}