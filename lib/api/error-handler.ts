import { NextResponse } from 'next/server'

/**
 * Standardized API error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Common API error types
 */
export const APIErrors = {
  // Authentication errors
  Unauthorized: (message = 'Unauthorized access') =>
    new APIError(message, 401, 'UNAUTHORIZED'),
  
  InvalidToken: (message = 'Invalid or expired token') =>
    new APIError(message, 401, 'INVALID_TOKEN'),

  // Authorization errors
  Forbidden: (message = 'Insufficient permissions') =>
    new APIError(message, 403, 'FORBIDDEN'),

  // Validation errors
  ValidationError: (message: string, details?: any) =>
    new APIError(message, 400, 'VALIDATION_ERROR', details),
  
  InvalidInput: (field: string, message?: string) =>
    new APIError(
      message || `Invalid input: ${field}`,
      400,
      'INVALID_INPUT',
      { field }
    ),

  // Resource errors
  NotFound: (resource = 'Resource') =>
    new APIError(`${resource} not found`, 404, 'NOT_FOUND'),

  // Rate limiting
  RateLimitExceeded: (retryAfter?: number) =>
    new APIError(
      'Rate limit exceeded. Please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    ),

  // External API errors
  AlpacaAPIError: (message: string, statusCode?: number) =>
    new APIError(
      `Alpaca API error: ${message}`,
      statusCode || 502,
      'ALPACA_API_ERROR'
    ),

  DatabaseError: (message = 'Database operation failed') =>
    new APIError(message, 500, 'DATABASE_ERROR'),

  // Trading errors
  InsufficientFunds: (required: number, available: number) =>
    new APIError(
      'Insufficient buying power',
      400,
      'INSUFFICIENT_FUNDS',
      { required, available }
    ),

  InvalidOrder: (reason: string) =>
    new APIError(`Invalid order: ${reason}`, 400, 'INVALID_ORDER'),

  MarketClosed: () =>
    new APIError('Market is currently closed', 400, 'MARKET_CLOSED'),
}

/**
 * Standardized error response handler
 * Use this in all API routes for consistent error responses
 */
export function handleAPIError(error: unknown): NextResponse {
  // Log error for monitoring
  console.error('API Error:', error)

  // Handle known API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      { 
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return NextResponse.json(
      {
        success: false,
        error: 'External service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: isDevelopment && error instanceof Error ? error.message : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}

/**
 * Wrapper for async API route handlers with error handling
 */
export function withErrorHandling<T>(
  handler: (request: Request, context?: T) => Promise<NextResponse>
) {
  return async (request: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
