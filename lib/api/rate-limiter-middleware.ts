
import { NextRequest, NextResponse } from 'next/server'
import { AlpacaRateLimiter } from '../alpaca/rate-limiter'

const rateLimiter = new AlpacaRateLimiter()

/**
 * Rate limiting configuration by endpoint pattern
 */
const RATE_LIMIT_CONFIG: Record<string, { requestsPerMinute: number }> = {
  '/api/alpaca/account': { requestsPerMinute: 60 },
  '/api/alpaca/positions': { requestsPerMinute: 60 },
  '/api/alpaca/orders': { requestsPerMinute: 120 },
  '/api/alpaca/quotes': { requestsPerMinute: 180 },
  '/api/alpaca/trades': { requestsPerMinute: 180 },
  '/api/ai': { requestsPerMinute: 100 },
  '/api/trading': { requestsPerMinute: 120 },
}

/**
 * Apply rate limiting to Alpaca API calls
 */
export async function withRateLimit<T>(
  endpoint: string,
  request: () => Promise<T>,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<T> {
  return rateLimiter.enqueue(endpoint, request, priority)
}

/**
 * Middleware function for Next.js API routes
 */
export function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Find matching rate limit config
  const config = Object.entries(RATE_LIMIT_CONFIG).find(([pattern]) =>
    pathname.startsWith(pattern)
  )?.[1]

  if (!config) {
    // No rate limiting for this endpoint
    return NextResponse.next()
  }

  // Check rate limit (simplified - use Redis in production)
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitKey = `${clientIP}:${pathname}`
  
  // In production, implement proper rate limiting with Redis
  // For now, log the rate limit check
  console.log(`Rate limit check: ${rateLimitKey} - ${config.requestsPerMinute}/min`)
  
  return NextResponse.next()
}