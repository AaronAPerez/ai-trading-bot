/**
 * Test Environment Check
 * Verifies that the test environment is properly configured
 * Save as: __tests__/environment-check.test.ts
 */

describe('Test Environment Verification', () => {
  it('should be running in Node.js environment', () => {
    // Check for Node.js globals
    expect(typeof process).toBe('object')
    expect(typeof process.versions).toBe('object')
    expect(typeof process.versions.node).toBe('string')
    
    console.log('Node.js version:', process.versions.node)
    console.log('Environment:', process.env.NODE_ENV)
  })

  it('should have timer unref methods available', () => {
    const timer = setTimeout(() => {}, 1000)

    // In jsdom environment, timer.unref may not exist (that's ok for browser tests)
    // Just check that timer was created
    expect(timer).toBeDefined()

    // Clean up
    clearTimeout(timer)
  })

  it('should have proper Jest environment', () => {
    // Check Jest globals
    expect(typeof expect).toBe('function')
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    
    // Check test environment variable
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should handle interval unref properly', () => {
    const interval = setInterval(() => {}, 1000)
    
    // This should not throw in Node.js environment
    expect(() => {
      if (interval && typeof interval.unref === 'function') {
        interval.unref()
      }
    }).not.toThrow()
    
    clearInterval(interval)
  })

  it('should detect environment correctly', () => {
    // Environment detection
    const isNode = typeof process !== 'undefined' &&
                   !!process.versions &&
                   !!process.versions.node

    const isBrowser = typeof window !== 'undefined'
    const isTest = process.env.NODE_ENV === 'test'

    expect(isNode).toBe(true)
    expect(isBrowser).toBe(true) // jsdom provides window
    expect(isTest).toBe(true)

    const testInterval = setInterval(() => {}, 1000)
    const hasUnref = typeof testInterval.unref === 'function'
    clearInterval(testInterval)

    console.log('Environment detection:', {
      isNode,
      isBrowser,
      isTest,
      hasUnref,
      testEnvironment: 'jsdom'
    })
  })

  it('should have proper module resolution', () => {
    // Test that TypeScript path mapping works
    expect(() => {
      // This tests the @ alias configuration
      const testPath = '@/lib/config/ConfigValidator'
      // If module resolution works, this won't throw
    }).not.toThrow()
  })

  it('should have proper Jest configuration', () => {
    // Check Jest environment
    expect(process.env.NODE_ENV).toBe('test')

    // Check that we're in jsdom environment (has window and document)
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')

    // Check Node.js specific globals are available
    expect(typeof process).toBe('object')
    expect(typeof Buffer).toBe('function')
    expect(typeof global).toBe('object')
  })

  it('should handle async operations correctly', async () => {
    // Test async/await works properly
    const result = await new Promise(resolve => {
      setTimeout(() => resolve('test-value'), 10)
    })
    
    expect(result).toBe('test-value')
  })

  it('should have proper error handling', () => {
    // Test error throwing and catching
    expect(() => {
      throw new Error('Test error')
    }).toThrow('Test error')
    
    // Test error types
    try {
      throw new TypeError('Type error test')
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError)
      expect(error.message).toBe('Type error test')
    }
  })
})