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
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_key'

    const result = ConfigValidator.validateEnvironment()

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.config.alpaca.paperMode).toBe(true)
  })

  it('should detect missing API keys', () => {
    delete process.env.APCA_API_KEY_ID
    delete process.env.APCA_API_SECRET_KEY

    const result = ConfigValidator.validateEnvironment()

    expect(result.isValid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues.some(issue => issue.field === 'APCA_API_KEY_ID')).toBe(true)
  })

  it('should validate configuration structure', () => {
    process.env.APCA_API_KEY_ID = 'PKABCDEF1234567890'
    process.env.APCA_API_SECRET_KEY = 'secretkey1234567890abcdef'
    process.env.NEXT_PUBLIC_TRADING_MODE = 'paper'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_key'

    const result = ConfigValidator.validateEnvironment()

    expect(result.config).toBeDefined()
    expect(result.config.alpaca).toBeDefined()
    expect(result.config.supabase).toBeDefined()
    expect(result.config.app).toBeDefined()
  })
})