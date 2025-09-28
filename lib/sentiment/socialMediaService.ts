import { tradingStorage } from '@/lib/database/tradingStorage'

interface SocialPost {
  id: string
  platform: 'twitter' | 'reddit' | 'discord' | 'telegram'
  author: string
  content: string
  timestamp: Date
  engagement: {
    likes: number
    shares: number
    comments: number
    views?: number
  }
  sentiment?: {
    score: number
    magnitude: number
    confidence: number
  }
  metadata: {
    hashtags: string[]
    mentions: string[]
    urls: string[]
    influencerScore?: number
  }
}

interface SocialSentimentAnalysis {
  symbol: string
  overall: {
    sentiment: number
    confidence: number
    postCount: number
    engagementScore: number
  }
  platforms: Record<string, {
    sentiment: number
    postCount: number
    avgEngagement: number
    topInfluencers: string[]
  }>
  trending: {
    hashtags: Array<{ tag: string; count: number; sentiment: number }>
    keywords: Array<{ word: string; frequency: number; sentiment: number }>
  }
  temporal: {
    hourlyTrend: Array<{ hour: number; sentiment: number; volume: number }>
    momentum: number
  }
}

interface InfluencerMetrics {
  username: string
  platform: string
  followerCount: number
  engagementRate: number
  accuracyScore: number
  sentimentHistory: Array<{ timestamp: Date; sentiment: number; outcome?: number }>
}

export class SocialMediaService {
  private influencers: Map<string, InfluencerMetrics> = new Map()
  private sentimentCache: Map<string, { data: SocialSentimentAnalysis; timestamp: Date }> = new Map()

  constructor() {
    this.initializeInfluencerList()
  }

  async analyzeSocialSentiment(symbol: string, hours: number = 24): Promise<SocialSentimentAnalysis> {
    try {
      // Check cache first
      const cacheKey = `${symbol}_${hours}`
      const cached = this.sentimentCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp.getTime() < 30 * 60 * 1000) { // 30-minute cache
        return cached.data
      }

      const posts = await this.fetchSocialPosts(symbol, hours)
      const analysis = this.processSocialData(symbol, posts)

      // Cache the result
      this.sentimentCache.set(cacheKey, {
        data: analysis,
        timestamp: new Date()
      })

      // Store in database
      await this.storeSocialSentiment(analysis)

      return analysis

    } catch (error) {
      console.error('Error analyzing social sentiment:', error)
      return this.getDefaultAnalysis(symbol)
    }
  }

  async getInfluencerSentiment(symbol: string): Promise<{
    influencerSentiment: number
    influencerCount: number
    topInfluencerPosts: Array<{
      author: string
      content: string
      sentiment: number
      engagement: number
      accuracy: number
    }>
  }> {
    try {
      const posts = await this.fetchInfluencerPosts(symbol)

      if (posts.length === 0) {
        return {
          influencerSentiment: 0,
          influencerCount: 0,
          topInfluencerPosts: []
        }
      }

      // Weight sentiment by influencer accuracy and engagement
      let weightedSentiment = 0
      let totalWeight = 0

      const influencerPosts = posts.map(post => {
        const influencer = this.influencers.get(post.author)
        const accuracy = influencer?.accuracyScore || 0.5
        const engagement = this.calculateEngagementScore(post.engagement)
        const weight = accuracy * engagement

        if (post.sentiment) {
          weightedSentiment += post.sentiment.score * weight
          totalWeight += weight
        }

        return {
          author: post.author,
          content: post.content.substring(0, 200) + '...',
          sentiment: post.sentiment?.score || 0,
          engagement,
          accuracy
        }
      })

      const finalSentiment = totalWeight > 0 ? weightedSentiment / totalWeight : 0

      return {
        influencerSentiment: finalSentiment,
        influencerCount: new Set(posts.map(p => p.author)).size,
        topInfluencerPosts: influencerPosts
          .sort((a, b) => (b.accuracy * b.engagement) - (a.accuracy * a.engagement))
          .slice(0, 5)
      }

    } catch (error) {
      console.error('Error getting influencer sentiment:', error)
      return {
        influencerSentiment: 0,
        influencerCount: 0,
        topInfluencerPosts: []
      }
    }
  }

  async trackSocialMomentum(symbol: string): Promise<{
    currentMomentum: number
    hourlyChange: number
    peakHour: number
    anomalyDetected: boolean
    momentumSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  }> {
    try {
      const analysis = await this.analyzeSocialSentiment(symbol, 24)
      const hourlyData = analysis.temporal.hourlyTrend

      if (hourlyData.length < 2) {
        return {
          currentMomentum: 0,
          hourlyChange: 0,
          peakHour: 0,
          anomalyDetected: false,
          momentumSignal: 'NEUTRAL'
        }
      }

      // Calculate momentum
      const currentHour = hourlyData[hourlyData.length - 1]
      const previousHour = hourlyData[hourlyData.length - 2]
      const hourlyChange = currentHour.sentiment - previousHour.sentiment

      // Find peak sentiment hour
      const peakHour = hourlyData.reduce((peak, current) =>
        current.sentiment > peak.sentiment ? current : peak
      ).hour

      // Detect anomalies (sudden volume or sentiment spikes)
      const avgVolume = hourlyData.reduce((sum, h) => sum + h.volume, 0) / hourlyData.length
      const avgSentiment = hourlyData.reduce((sum, h) => sum + h.sentiment, 0) / hourlyData.length

      const volumeThreshold = avgVolume * 2
      const sentimentThreshold = Math.abs(avgSentiment) + 0.3

      const anomalyDetected = currentHour.volume > volumeThreshold ||
                              Math.abs(currentHour.sentiment) > sentimentThreshold

      // Determine momentum signal
      let momentumSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
      if (analysis.temporal.momentum > 0.1 && hourlyChange > 0.05) {
        momentumSignal = 'BULLISH'
      } else if (analysis.temporal.momentum < -0.1 && hourlyChange < -0.05) {
        momentumSignal = 'BEARISH'
      }

      return {
        currentMomentum: analysis.temporal.momentum,
        hourlyChange,
        peakHour,
        anomalyDetected,
        momentumSignal
      }

    } catch (error) {
      console.error('Error tracking social momentum:', error)
      return {
        currentMomentum: 0,
        hourlyChange: 0,
        peakHour: 0,
        anomalyDetected: false,
        momentumSignal: 'NEUTRAL'
      }
    }
  }

  async updateInfluencerAccuracy(): Promise<void> {
    try {
      // Get recent trade outcomes to validate influencer predictions
      const recentTrades = await tradingStorage.getTradeHistory('system', 100) // System trades

      for (const [username, influencer] of this.influencers) {
        const recentPredictions = influencer.sentimentHistory
          .filter(h => Date.now() - h.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000) // Last 7 days

        if (recentPredictions.length === 0) continue

        let correctPredictions = 0
        let totalPredictions = 0

        for (const prediction of recentPredictions) {
          // Find corresponding trades within 24 hours of prediction
          const relevantTrades = recentTrades.filter(trade =>
            Math.abs(new Date(trade.timestamp).getTime() - prediction.timestamp.getTime()) < 24 * 60 * 60 * 1000
          )

          if (relevantTrades.length > 0) {
            const avgPnL = relevantTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / relevantTrades.length
            const predictedDirection = prediction.sentiment > 0 ? 1 : -1
            const actualDirection = avgPnL > 0 ? 1 : -1

            if (predictedDirection === actualDirection) {
              correctPredictions++
            }
            totalPredictions++
          }
        }

        if (totalPredictions > 0) {
          const newAccuracy = correctPredictions / totalPredictions
          // Exponential moving average for accuracy
          influencer.accuracyScore = (influencer.accuracyScore * 0.7) + (newAccuracy * 0.3)
        }
      }

    } catch (error) {
      console.error('Error updating influencer accuracy:', error)
    }
  }

  private async fetchSocialPosts(symbol: string, hours: number): Promise<SocialPost[]> {
    // This would integrate with real social media APIs
    // For now, return simulated data
    return this.generateSimulatedSocialData(symbol, hours)
  }

  private async fetchInfluencerPosts(symbol: string): Promise<SocialPost[]> {
    const allPosts = await this.fetchSocialPosts(symbol, 6) // Last 6 hours
    return allPosts.filter(post => this.influencers.has(post.author))
  }

  private processSocialData(symbol: string, posts: SocialPost[]): SocialSentimentAnalysis {
    const platformData: Record<string, any> = {}
    const hourlyData: Array<{ hour: number; sentiment: number; volume: number }> = []
    const hashtags: Map<string, { count: number; sentiment: number }> = new Map()
    const keywords: Map<string, { frequency: number; sentiment: number }> = new Map()

    // Process posts by platform
    const platforms = [...new Set(posts.map(p => p.platform))]

    for (const platform of platforms) {
      const platformPosts = posts.filter(p => p.platform === platform)

      if (platformPosts.length === 0) continue

      const avgSentiment = platformPosts.reduce((sum, p) =>
        sum + (p.sentiment?.score || 0), 0) / platformPosts.length

      const avgEngagement = platformPosts.reduce((sum, p) =>
        sum + this.calculateEngagementScore(p.engagement), 0) / platformPosts.length

      const topInfluencers = platformPosts
        .filter(p => this.influencers.has(p.author))
        .map(p => p.author)
        .slice(0, 3)

      platformData[platform] = {
        sentiment: avgSentiment,
        postCount: platformPosts.length,
        avgEngagement,
        topInfluencers
      }
    }

    // Process temporal data
    const hourBuckets: Map<number, { sentiment: number; count: number }> = new Map()

    for (const post of posts) {
      const hour = post.timestamp.getHours()
      const bucket = hourBuckets.get(hour) || { sentiment: 0, count: 0 }

      bucket.sentiment += post.sentiment?.score || 0
      bucket.count++

      hourBuckets.set(hour, bucket)
    }

    for (const [hour, bucket] of hourBuckets) {
      hourlyData.push({
        hour,
        sentiment: bucket.count > 0 ? bucket.sentiment / bucket.count : 0,
        volume: bucket.count
      })
    }

    // Process hashtags and keywords
    for (const post of posts) {
      // Hashtags
      for (const hashtag of post.metadata.hashtags) {
        const current = hashtags.get(hashtag) || { count: 0, sentiment: 0 }
        current.count++
        current.sentiment += post.sentiment?.score || 0
        hashtags.set(hashtag, current)
      }

      // Keywords from content
      const words = this.extractKeywords(post.content)
      for (const word of words) {
        const current = keywords.get(word) || { frequency: 0, sentiment: 0 }
        current.frequency++
        current.sentiment += post.sentiment?.score || 0
        keywords.set(word, current)
      }
    }

    // Calculate overall metrics
    const totalEngagement = posts.reduce((sum, p) =>
      sum + this.calculateEngagementScore(p.engagement), 0)

    const overallSentiment = posts.length > 0 ?
      posts.reduce((sum, p) => sum + (p.sentiment?.score || 0), 0) / posts.length : 0

    const sentimentConfidence = this.calculateSentimentConfidence(posts)

    // Calculate momentum
    const momentum = this.calculateMomentum(hourlyData)

    return {
      symbol,
      overall: {
        sentiment: overallSentiment,
        confidence: sentimentConfidence,
        postCount: posts.length,
        engagementScore: totalEngagement
      },
      platforms: platformData,
      trending: {
        hashtags: Array.from(hashtags.entries())
          .map(([tag, data]) => ({
            tag,
            count: data.count,
            sentiment: data.count > 0 ? data.sentiment / data.count : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        keywords: Array.from(keywords.entries())
          .map(([word, data]) => ({
            word,
            frequency: data.frequency,
            sentiment: data.frequency > 0 ? data.sentiment / data.frequency : 0
          }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10)
      },
      temporal: {
        hourlyTrend: hourlyData.sort((a, b) => a.hour - b.hour),
        momentum
      }
    }
  }

  private generateSimulatedSocialData(symbol: string, hours: number): SocialPost[] {
    const posts: SocialPost[] = []
    const platforms = ['twitter', 'reddit', 'discord'] as const
    const baseTime = new Date()

    // Generate posts for the time period
    const postsPerHour = 10 + Math.floor(Math.random() * 20)

    for (let h = 0; h < hours; h++) {
      for (let i = 0; i < postsPerHour; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)]
        const timestamp = new Date(baseTime.getTime() - (h * 60 * 60 * 1000) + (i * 6 * 60 * 1000))

        const sentimentScore = (Math.random() - 0.5) * 2 // -1 to 1
        const content = this.generateRealisticContent(symbol, sentimentScore)

        posts.push({
          id: `${platform}_${timestamp.getTime()}_${i}`,
          platform,
          author: this.generateAuthorName(platform),
          content,
          timestamp,
          engagement: {
            likes: Math.floor(Math.random() * 100),
            shares: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 30),
            views: Math.floor(Math.random() * 1000)
          },
          sentiment: {
            score: sentimentScore,
            magnitude: Math.abs(sentimentScore),
            confidence: 0.6 + Math.random() * 0.3
          },
          metadata: {
            hashtags: this.generateHashtags(symbol, sentimentScore),
            mentions: [],
            urls: [],
            influencerScore: Math.random() < 0.1 ? Math.random() : undefined
          }
        })
      }
    }

    return posts
  }

  private generateRealisticContent(symbol: string, sentiment: number): string {
    const positiveTemplates = [
      `$${symbol} looking strong! 🚀 Great fundamentals and momentum`,
      `Bullish on ${symbol}. This could be the breakout we've been waiting for`,
      `${symbol} earnings beat expectations. Time to load up! 💰`,
      `Technical analysis on ${symbol} shows clear uptrend. Moon soon? 🌙`
    ]

    const negativeTemplates = [
      `${symbol} struggling with resistance. Might see a pullback here`,
      `Not feeling confident about ${symbol} right now. Market conditions tough`,
      `${symbol} disappointing results. Time to take profits and run`,
      `Bearish pattern forming on ${symbol}. Consider exit strategy`
    ]

    const neutralTemplates = [
      `Watching ${symbol} closely. Could go either way from here`,
      `${symbol} in consolidation phase. Waiting for clear direction`,
      `Mixed signals on ${symbol}. Need more data before making move`
    ]

    let templates = neutralTemplates
    if (sentiment > 0.3) templates = positiveTemplates
    else if (sentiment < -0.3) templates = negativeTemplates

    return templates[Math.floor(Math.random() * templates.length)]
  }

  private generateAuthorName(platform: string): string {
    const names = [
      'CryptoTrader123', 'WallStreetWolf', 'TechAnalyst', 'MarketGuru',
      'StockPicker99', 'InvestorPro', 'TradingAlpha', 'FinanceExpert'
    ]
    return names[Math.floor(Math.random() * names.length)] + '_' + platform
  }

  private generateHashtags(symbol: string, sentiment: number): string[] {
    const baseHashtags = [symbol.toLowerCase(), 'stocks', 'trading', 'investing']

    if (sentiment > 0.3) {
      baseHashtags.push('bullish', 'moon', 'buy', 'growth')
    } else if (sentiment < -0.3) {
      baseHashtags.push('bearish', 'sell', 'crash', 'warning')
    } else {
      baseHashtags.push('analysis', 'watchlist', 'neutral')
    }

    return baseHashtags.slice(0, 3 + Math.floor(Math.random() * 2))
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const tradingKeywords = [
      'bullish', 'bearish', 'moon', 'crash', 'buy', 'sell', 'hold',
      'breakout', 'support', 'resistance', 'volume', 'momentum'
    ]

    return words.filter(word => tradingKeywords.includes(word))
  }

  private calculateEngagementScore(engagement: any): number {
    const { likes = 0, shares = 0, comments = 0, views = 0 } = engagement
    return (likes * 1 + shares * 2 + comments * 3) / Math.max(1, views / 10)
  }

  private calculateSentimentConfidence(posts: SocialPost[]): number {
    if (posts.length === 0) return 0

    const avgConfidence = posts.reduce((sum, p) =>
      sum + (p.sentiment?.confidence || 0), 0) / posts.length

    const volumeConfidence = Math.min(1, posts.length / 100) // More posts = higher confidence

    return (avgConfidence + volumeConfidence) / 2
  }

  private calculateMomentum(hourlyData: Array<{ hour: number; sentiment: number; volume: number }>): number {
    if (hourlyData.length < 3) return 0

    const recent = hourlyData.slice(-3)
    const older = hourlyData.slice(-6, -3)

    if (older.length === 0) return 0

    const recentAvg = recent.reduce((sum, h) => sum + h.sentiment, 0) / recent.length
    const olderAvg = older.reduce((sum, h) => sum + h.sentiment, 0) / older.length

    return recentAvg - olderAvg
  }

  private initializeInfluencerList(): void {
    // Initialize with some example influential accounts
    const influencerList = [
      { username: 'MarketGuru_twitter', platform: 'twitter', followers: 100000, engagement: 0.05 },
      { username: 'CryptoExpert_reddit', platform: 'reddit', followers: 50000, engagement: 0.08 },
      { username: 'TechAnalyst_discord', platform: 'discord', followers: 25000, engagement: 0.12 },
      { username: 'WallStreetPro_twitter', platform: 'twitter', followers: 200000, engagement: 0.03 },
      { username: 'StockWhisperer_reddit', platform: 'reddit', followers: 75000, engagement: 0.06 }
    ]

    for (const influencer of influencerList) {
      this.influencers.set(influencer.username, {
        username: influencer.username,
        platform: influencer.platform,
        followerCount: influencer.followers,
        engagementRate: influencer.engagement,
        accuracyScore: 0.6, // Start with neutral accuracy
        sentimentHistory: []
      })
    }
  }

  private async storeSocialSentiment(analysis: SocialSentimentAnalysis): Promise<void> {
    try {
      await tradingStorage.saveMarketSentiment({
        symbol: analysis.symbol,
        sentiment_score: analysis.overall.sentiment,
        sentiment_label: analysis.overall.sentiment > 0.1 ? 'positive' :
                        analysis.overall.sentiment < -0.1 ? 'negative' : 'neutral',
        news_count: 0,
        social_mentions: analysis.overall.postCount,
        source: 'social_media',
        data_points: {
          platforms: analysis.platforms,
          trending: analysis.trending,
          momentum: analysis.temporal.momentum,
          confidence: analysis.overall.confidence
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error storing social sentiment:', error)
    }
  }

  private getDefaultAnalysis(symbol: string): SocialSentimentAnalysis {
    return {
      symbol,
      overall: {
        sentiment: 0,
        confidence: 0.3,
        postCount: 0,
        engagementScore: 0
      },
      platforms: {},
      trending: {
        hashtags: [],
        keywords: []
      },
      temporal: {
        hourlyTrend: [],
        momentum: 0
      }
    }
  }

  // Public API methods
  async getCombinedSentiment(symbol: string): Promise<{
    newsSentiment: number
    socialSentiment: number
    combinedSentiment: number
    confidence: number
    recommendation: string
  }> {
    try {
      // Get news sentiment from database
      const newsData = await tradingStorage.getLatestMarketSentiment(symbol)
      const newsSentiment = newsData?.sentiment_score || 0

      // Get social sentiment
      const socialAnalysis = await this.analyzeSocialSentiment(symbol)
      const socialSentiment = socialAnalysis.overall.sentiment

      // Weight: 60% news, 40% social (news typically more reliable)
      const combinedSentiment = (newsSentiment * 0.6) + (socialSentiment * 0.4)

      const confidence = Math.min(0.9,
        (newsData ? 0.6 : 0) +
        (socialAnalysis.overall.confidence * 0.4)
      )

      let recommendation = 'NEUTRAL'
      if (combinedSentiment > 0.2 && confidence > 0.6) {
        recommendation = 'BULLISH'
      } else if (combinedSentiment < -0.2 && confidence > 0.6) {
        recommendation = 'BEARISH'
      }

      return {
        newsSentiment,
        socialSentiment,
        combinedSentiment,
        confidence,
        recommendation
      }

    } catch (error) {
      console.error('Error getting combined sentiment:', error)
      return {
        newsSentiment: 0,
        socialSentiment: 0,
        combinedSentiment: 0,
        confidence: 0.3,
        recommendation: 'NEUTRAL'
      }
    }
  }
}

export const socialMediaService = new SocialMediaService()