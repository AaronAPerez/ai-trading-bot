
import { alpacaClient } from '@/lib/alpaca/unified-client'

describe('Alpaca API Integration', () => {
  describe('Account Endpoints', () => {
    it('should fetch account information', async () => {
      const account = await alpacaClient.getAccount()
      
      expect(account).toBeDefined()
      expect(account).toHaveProperty('buying_power')
      expect(account).toHaveProperty('cash')
      expect(account).toHaveProperty('portfolio_value')
    })

    it('should fetch account activities', async () => {
      const activities = await alpacaClient.getActivities({
        activity_types: 'FILL',
        page_size: 10,
      })
      
      expect(Array.isArray(activities)).toBe(true)
    })
  })

  describe('Order Endpoints', () => {
    it('should fetch orders', async () => {
      const orders = await alpacaClient.getOrders({
        status: 'all',
        limit: 10,
      })
      
      expect(Array.isArray(orders)).toBe(true)
    })

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
      ).rejects.toThrow()
    })
  })

  describe('Position Endpoints', () => {
    it('should fetch all positions', async () => {
      const positions = await alpacaClient.getPositions()
      
      expect(Array.isArray(positions)).toBe(true)
    })
  })

  describe('Market Data Endpoints', () => {
    it('should fetch market clock', async () => {
      const clock = await alpacaClient.getClock()
      
      expect(clock).toHaveProperty('is_open')
      expect(clock).toHaveProperty('next_open')
      expect(clock).toHaveProperty('next_close')
    })

    it('should fetch latest quote', async () => {
      const quote = await alpacaClient.getLatestQuote('AAPL')
      
      expect(quote).toBeDefined()
      expect(quote.quote).toHaveProperty('ap') // Ask price
      expect(quote.quote).toHaveProperty('bp') // Bid price
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid symbol', async () => {
      await expect(
        alpacaClient.getLatestQuote('INVALID_SYMBOL_12345')
      ).rejects.toThrow()
    })

    it('should handle network errors gracefully', async () => {
      // Test with invalid endpoint
      await expect(
        alpacaClient.getPosition('NONEXISTENT')
      ).rejects.toThrow()
    })
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
    })
  })
})
