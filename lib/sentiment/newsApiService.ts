import { supabaseService } from '@/lib/database/supabase-utils'

interface NewsArticle {
  title: string
  description: string
  content: string
  publishedAt: string
  source: {
    name: string
  }
  url: string
}

interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsArticle[]
}

export class NewsApiService {
  private apiKey: string
  private baseUrl = 'https://newsapi.org/v2'

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || ''
  }

  async fetchNewsForSymbol(symbol: string, pageSize: number = 50): Promise<NewsArticle[]> {
    try {
      const companyName = this.getCompanyName(symbol)
      const query = `${symbol} OR "${companyName}" stock trading market`

      const url = `${this.baseUrl}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${this.apiKey}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`)
      }

      const data: NewsApiResponse = await response.json()

      if (data.status !== 'ok') {
        throw new Error(`News API returned status: ${data.status}`)
      }

      return data.articles || []
    } catch (error) {
      console.error('Error fetching news:', error)
      return []
    }
  }

  async analyzeSentiment(articles: NewsArticle[]): Promise<{
    overallScore: number
    label: 'positive' | 'negative' | 'neutral'
    articleScores: Array<{ title: string; score: number; sentiment: string }>
  }> {
    try {
      const articleScores = articles.map(article => {
        const score = this.calculateSentimentScore(article.title + ' ' + (article.description || ''))
        return {
          title: article.title,
          score,
          sentiment: this.getSentimentLabel(score)
        }
      })

      const overallScore = articleScores.length > 0
        ? articleScores.reduce((sum, item) => sum + item.score, 0) / articleScores.length
        : 0

      const label = this.getSentimentLabel(overallScore) as 'positive' | 'negative' | 'neutral'

      return {
        overallScore,
        label,
        articleScores
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error)
      return {
        overallScore: 0,
        label: 'neutral',
        articleScores: []
      }
    }
  }

  private calculateSentimentScore(text: string): number {
    const positiveWords = [
      'bullish', 'bull', 'up', 'rise', 'rises', 'rising', 'gain', 'gains', 'profit', 'profits',
      'growth', 'strong', 'buy', 'positive', 'optimistic', 'surge', 'rally', 'boost',
      'outperform', 'beat', 'exceed', 'upgrade', 'recommend', 'target', 'upside'
    ]

    const negativeWords = [
      'bearish', 'bear', 'down', 'fall', 'falls', 'falling', 'loss', 'losses', 'decline',
      'weak', 'sell', 'negative', 'pessimistic', 'crash', 'drop', 'plunge', 'concern',
      'underperform', 'miss', 'downgrade', 'warning', 'risk', 'uncertainty', 'volatile'
    ]

    const words = text.toLowerCase().split(/\s+/)
    let score = 0

    words.forEach(word => {
      if (positiveWords.includes(word)) {
        score += 1
      } else if (negativeWords.includes(word)) {
        score -= 1
      }
    })

    // Normalize score to -1 to 1 range
    const maxWords = Math.max(positiveWords.length, negativeWords.length)
    return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)))
  }

  private getSentimentLabel(score: number): string {
    if (score > 0.1) return 'positive'
    if (score < -0.1) return 'negative'
    return 'neutral'
  }

  private getCompanyName(symbol: string): string {
    const companyMap: Record<string, string> = {
      'AAPL': 'Apple',
      'GOOGL': 'Google',
      'MSFT': 'Microsoft',
      'AMZN': 'Amazon',
      'TSLA': 'Tesla',
      'META': 'Meta',
      'NVDA': 'NVIDIA',
      'NFLX': 'Netflix',
      'AMD': 'AMD',
      'INTC': 'Intel'
    }

    return companyMap[symbol] || symbol
  }

  async getAndStoreSentiment(symbol: string): Promise<{
    sentimentScore: number
    sentimentLabel: 'positive' | 'negative' | 'neutral'
    newsCount: number
  } | null> {
    try {
      const articles = await this.fetchNewsForSymbol(symbol)

      if (articles.length === 0) {
        return null
      }

      const sentiment = await this.analyzeSentiment(articles)

      // Store in database
      await supabaseService.saveMarketSentiment({
        symbol,
        sentiment_score: sentiment.overallScore,
        sentiment_label: sentiment.label,
        news_count: articles.length,
        source: 'news_api',
        data_points: {
          articles: sentiment.articleScores.slice(0, 10), // Store top 10 for reference
          totalArticles: articles.length,
          analysisTimestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })

      return {
        sentimentScore: sentiment.overallScore,
        sentimentLabel: sentiment.label,
        newsCount: articles.length
      }
    } catch (error) {
      console.error('Error getting and storing sentiment:', error)
      return null
    }
  }

  async getCachedSentiment(symbol: string, maxAgeMinutes: number = 30) {
    try {
      const cached = await supabaseService.getLatestMarketSentiment(symbol)

      if (!cached) {
        return await this.getAndStoreSentiment(symbol)
      }

      const ageMinutes = (Date.now() - new Date(cached.timestamp).getTime()) / (1000 * 60)

      if (ageMinutes > maxAgeMinutes) {
        return await this.getAndStoreSentiment(symbol)
      }

      return {
        sentimentScore: cached.sentiment_score,
        sentimentLabel: cached.sentiment_label,
        newsCount: cached.news_count
      }
    } catch (error) {
      console.error('Error getting cached sentiment:', error)
      return null
    }
  }
}

export const newsApiService = new NewsApiService()