import { ConfigValidator } from '@/lib/config/ConfigValidator'

describe('ConfigValidator', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should validate correct environment variables', () => {
    process.env.APCA_API_KEY_ID = 'PKABCDEF1234567890'
    process.env.APCA_API_SECRET_KEY = 'secretkey1234567890abcdef'
    process.env.NEXT_PUBLIC_TRADING_MODE = 'paper'

    const result = ConfigValidator.validateEnvironment()
    
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.config.tradingMode).toBe('paper')
  })

  it('should detect missing API keys', () => {
    delete process.env.APCA_API_KEY_ID
    delete process.env.APCA_API_SECRET_KEY

    const result = ConfigValidator.validateEnvironment()
    
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues).toContain(expect.stringContaining('APCA_API_KEY_ID'))
  })

  it('should warn about live trading mode', () => {
    process.env.APCA_API_KEY_ID = 'PKABCDEF1234567890'
    process.env.APCA_API_SECRET_KEY = 'secretkey1234567890abcdef'
    process.env.NEXT_PUBLIC_TRADING_MODE = 'live'

    const result = ConfigValidator.validateEnvironment()
    
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings).toContain(expect.stringContaining('LIVE TRADING'))
  })

  it('should detect deprecated environment variables', () => {
    process.env.APCA_API_KEY_ID = 'PKABCDEF1234567890'
    process.env.APCA_API_SECRET_KEY = 'secretkey1234567890abcdef'
    process.env.ALPACA_API_KEY = 'deprecated_key'

    const result = ConfigValidator.validateEnvironment()
    
    expect(result.warnings).toContain(expect.stringContaining('Deprecated'))
  })
})