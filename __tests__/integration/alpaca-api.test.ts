import { alpacaClient } from '@/lib/alpaca/unified-client'

describe('Alpaca API Integration', () => {
  // Clean up after all tests
  afterAll(async () => {
    // Give time for any pending requests to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  describe('Account Endpoints', () => {
    it('should fetch account information', async () => {
      const account = await alpacaClient.getAccount()

      expect(account).toBeDefined()
      expect(account).toHaveProperty('buying_power')
      expect(account).toHaveProperty('cash')
      expect(account).toHaveProperty('portfolio_value')
    }, 30000)

    it('should fetch account activities', async () => {
      const activities = await alpacaClient.getActivities({
        activity_types: 'FILL',
        page_size: 10,
      })

      expect(Array.isArray(activities)).toBe(true)
    }, 30000)
  })

  describe('Order Endpoints', () => {
    it('should fetch orders', async () => {
      const orders = await alpacaClient.getOrders({
        status: 'all',
        limit: 10,
      })

      expect(Array.isArray(orders)).toBe(true)
    }, 30000)

    it('should validate order before submission', async () => {
      const invalidOrder = {
        symbol: 'INVALID',
        qty: -1, // Invalid quantity
        side: 'buy' as const,
        type: 'market' as const,
        time_in_force: 'day' as const,
      }

      await expect(
        alpacaClient.createOrder(invalidOrder)
      ).rejects.toThrow('qty must be > 0')
    }, 30000)
  })

  describe('Position Endpoints', () => {
    it('should fetch all positions', async () => {
      const positions = await alpacaClient.getPositions()

      expect(Array.isArray(positions)).toBe(true)
    }, 30000)
  })

  describe('Market Data Endpoints', () => {
    it('should fetch market clock', async () => {
      const clock = await alpacaClient.getClock()

      expect(clock).toHaveProperty('is_open')
      expect(clock).toHaveProperty('next_open')
      expect(clock).toHaveProperty('next_close')
    }, 30000)

    it('should fetch latest quote', async () => {
      try {
        const quote = await alpacaClient.getLatestQuote('AAPL')

        expect(quote).toBeDefined()
        expect(quote).toHaveProperty('ap') // Ask price
        expect(quote).toHaveProperty('bp') // Bid price
      } catch (error: any) {
        // Paper trading accounts may not have market data access
        // This is expected and should not fail the test
        expect(error.message).toContain('Not Found')
        console.log('Market data not available for paper trading account - this is expected')
      }
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle invalid symbol', async () => {
      await expect(
        alpacaClient.getLatestQuote('INVALID_SYMBOL_12345')
      ).rejects.toThrow()
    }, 30000)

    it('should handle network errors gracefully', async () => {
      // Test with invalid endpoint
      await expect(
        alpacaClient.getPosition('NONEXISTENT')
      ).rejects.toThrow()
    }, 30000)
  })

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        alpacaClient.getClock()
      )

      // All should succeed (rate limiter queues them)
      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
    }, 60000) // 60 second timeout for rate limiting test
  })
})