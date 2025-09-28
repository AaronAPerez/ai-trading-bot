import { supabaseService } from '../database/supabase-utils'

export interface NewsArticle {
  title: string
  description: string
  content: string
  publishedAt: string
  source: string
  url: string
}

export interface SentimentResult {
  score: number
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
  keywords: string[]
}

export interface MarketSentimentData {
  symbol: string
  sentimentScore: number
  sentimentLabel: 'positive' | 'negative' | 'neutral'
  newsCount: number
  articles: NewsArticle[]
  timestamp: string
}

export class SentimentAnalyzer {
  private newsApiKey: string
  private baseUrl = 'https://newsapi.org/v2'

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY || ''
    if (!this.newsApiKey) {
      console.warn('NEWS_API_KEY not found in environment variables')
    }
  }

  async fetchNewsForSymbol(symbol: string, timeframe: '1d' | '3d' | '7d' = '1d'): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      throw new Error('News API key not configured')
    }

    const days = { '1d': 1, '3d': 3, '7d': 7 }[timeframe]
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const params = new URLSearchParams({
      q: `${symbol} OR "${this.getCompanyName(symbol)}"`,
      language: 'en',
      sortBy: 'relevancy',
      from: fromDate.toISOString().split('T')[0],
      pageSize: '50',
      apiKey: this.newsApiKey
    })

    try {
      const response = await fetch(`${this.baseUrl}/everything?${params}`)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('News API rate limit exceeded')
        }
        throw new Error(`News API error: ${response.status}`)
      }

      const data = await response.json()

      return data.articles?.map((article: any) => ({
        title: article.title || '',
        description: article.description || '',
        content: article.content || '',
        publishedAt: article.publishedAt || '',
        source: article.source?.name || 'Unknown',
        url: article.url || ''
      })) || []

    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error)
      throw error
    }
  }

  analyzeSentiment(text: string): SentimentResult {
    const positiveWords = [
      'bullish', 'positive', 'growth', 'profit', 'gain', 'rise', 'increase', 'strong',
      'excellent', 'outstanding', 'beat', 'exceed', 'surge', 'rally', 'boom',
      'optimistic', 'confident', 'upgrade', 'buy', 'recommend', 'breakthrough',
      'innovation', 'expansion', 'momentum', 'outperform'
    ]

    const negativeWords = [
      'bearish', 'negative', 'loss', 'decline', 'fall', 'drop', 'weak', 'poor',
      'disappointing', 'miss', 'crash', 'plunge', 'recession', 'concern',
      'risk', 'downgrade', 'sell', 'warning', 'volatility', 'uncertainty',
      'challenge', 'struggle', 'underperform', 'bankruptcy', 'debt'
    ]

    const words = text.toLowerCase().split(/\W+/)
    let positiveScore = 0
    let negativeScore = 0
    const foundKeywords: string[] = []

    words.forEach(word => {
      if (positiveWords.includes(word)) {
        positiveScore++
        foundKeywords.push(word)
      } else if (negativeWords.includes(word)) {
        negativeScore++
        foundKeywords.push(word)
      }
    })

    const totalWords = words.length
    const totalSentimentWords = positiveScore + negativeScore

    let score = 0
    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    let confidence = 0

    if (totalSentimentWords > 0) {
      score = (positiveScore - negativeScore) / totalWords
      confidence = Math.min(totalSentimentWords / totalWords * 10, 1)

      if (score > 0.01) {
        label = 'positive'
      } else if (score < -0.01) {
        label = 'negative'
      }
    }

    return {
      score: Math.max(-1, Math.min(1, score * 10)), // Normalize to -1 to 1
      label,
      confidence,
      keywords: foundKeywords
    }
  }

  async analyzeMarketSentiment(symbol: string, timeframe: '1d' | '3d' | '7d' = '1d'): Promise<MarketSentimentData> {
    try {
      const articles = await this.fetchNewsForSymbol(symbol, timeframe)

      if (articles.length === 0) {
        return {
          symbol,
          sentimentScore: 0,
          sentimentLabel: 'neutral',
          newsCount: 0,
          articles: [],
          timestamp: new Date().toISOString()
        }
      }

      let totalScore = 0
      let positiveCount = 0
      let negativeCount = 0

      articles.forEach(article => {
        const text = `${article.title} ${article.description} ${article.content}`.substring(0, 1000)
        const sentiment = this.analyzeSentiment(text)

        totalScore += sentiment.score * sentiment.confidence

        if (sentiment.label === 'positive') positiveCount++
        else if (sentiment.label === 'negative') negativeCount++
      })

      const avgScore = totalScore / articles.length
      let sentimentLabel: 'positive' | 'negative' | 'neutral' = 'neutral'

      if (avgScore > 0.1) sentimentLabel = 'positive'
      else if (avgScore < -0.1) sentimentLabel = 'negative'

      const marketSentiment: MarketSentimentData = {
        symbol,
        sentimentScore: avgScore,
        sentimentLabel,
        newsCount: articles.length,
        articles: articles.slice(0, 10), // Keep top 10 articles
        timestamp: new Date().toISOString()
      }

      // Save to database
      await this.saveSentimentToDatabase(marketSentiment)

      return marketSentiment

    } catch (error) {
      console.error(`Error analyzing sentiment for ${symbol}:`, error)

      // Return neutral sentiment on error
      return {
        symbol,
        sentimentScore: 0,
        sentimentLabel: 'neutral',
        newsCount: 0,
        articles: [],
        timestamp: new Date().toISOString()
      }
    }
  }

  private async saveSentimentToDatabase(sentimentData: MarketSentimentData): Promise<void> {
    try {
      await supabaseService.saveMarketSentiment({
        symbol: sentimentData.symbol,
        sentiment_score: sentimentData.sentimentScore,
        sentiment_label: sentimentData.sentimentLabel,
        news_count: sentimentData.newsCount,
        source: 'news_api',
        data_points: {
          articles: sentimentData.articles,
          analysis_timestamp: sentimentData.timestamp
        },
        timestamp: sentimentData.timestamp
      })
    } catch (error) {
      console.error('Error saving sentiment to database:', error)
    }
  }

  private getCompanyName(symbol: string): string {
    const companyNames: Record<string, string> = {
      'AAPL': 'Apple Inc',
      'GOOGL': 'Google Alphabet',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc',
      'TSLA': 'Tesla Inc',
      'META': 'Meta Platforms Inc',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc',
      'SPY': 'SPDR S&P 500 ETF',
      'QQQ': 'Invesco QQQ ETF'
    }

    return companyNames[symbol] || symbol
  }

  async getSentimentHistory(symbol: string, days: number = 7): Promise<MarketSentimentData[]> {
    try {
      // This would fetch from database in a real implementation
      return []
    } catch (error) {
      console.error('Error fetching sentiment history:', error)
      return []
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer()