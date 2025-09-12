export class PolygonProvider {
  private apiKey: string
  
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY!
  }
  
  async getMarketData(symbol: string) {
    // Free tier: 5 API calls per minute
    // Paid: Real-time data, unlimited calls
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/hour/2023-01-01/2023-12-31?apikey=${this.apiKey}`
    )
    return response.json()
  }
}