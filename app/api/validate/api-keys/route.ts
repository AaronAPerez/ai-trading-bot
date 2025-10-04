/**
 * API Key Validation Endpoint
 * Validates Alpaca and Supabase API keys
 *
 * POST /api/validate/api-keys
 */

import { NextRequest, NextResponse } from 'next/server'

interface ValidationRequest {
  alpacaApiKey?: string
  alpacaSecretKey?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  validateAll?: boolean
}

interface ValidationResult {
  valid: boolean
  service: string
  message: string
  details?: any
}

/**
 * Validate Alpaca API keys
 */
async function validateAlpacaKeys(
  apiKey: string,
  secretKey: string
): Promise<ValidationResult> {
  try {
    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'

    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return {
        valid: false,
        service: 'Alpaca',
        message: 'Invalid Alpaca API credentials',
        details: error,
      }
    }

    const account = await response.json()

    return {
      valid: true,
      service: 'Alpaca',
      message: 'Alpaca API keys are valid',
      details: {
        accountId: account.id,
        status: account.status,
        tradingBlocked: account.trading_blocked,
        accountBlocked: account.account_blocked,
      },
    }
  } catch (error) {
    return {
      valid: false,
      service: 'Alpaca',
      message: 'Failed to validate Alpaca API keys',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate Supabase connection
 */
async function validateSupabaseKeys(
  supabaseUrl: string,
  anonKey: string
): Promise<ValidationResult> {
  try {
    // Test connection with a simple query
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    })

    if (!response.ok) {
      return {
        valid: false,
        service: 'Supabase',
        message: 'Invalid Supabase credentials or URL',
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      }
    }

    return {
      valid: true,
      service: 'Supabase',
      message: 'Supabase connection is valid',
      details: {
        url: supabaseUrl,
        status: 'connected',
      },
    }
  } catch (error) {
    return {
      valid: false,
      service: 'Supabase',
      message: 'Failed to validate Supabase connection',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * POST /api/validate/api-keys
 * Validate API keys for various services
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json()

    const results: ValidationResult[] = []

    // Validate all environment keys if requested
    if (body.validateAll) {
      // Validate Alpaca
      const alpacaApiKey = process.env.APCA_API_KEY_ID
      const alpacaSecretKey = process.env.APCA_API_SECRET_KEY

      if (alpacaApiKey && alpacaSecretKey) {
        const alpacaResult = await validateAlpacaKeys(alpacaApiKey, alpacaSecretKey)
        results.push(alpacaResult)
      } else {
        results.push({
          valid: false,
          service: 'Alpaca',
          message: 'Alpaca API keys not found in environment',
        })
      }

      // Validate Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        const supabaseResult = await validateSupabaseKeys(supabaseUrl, supabaseAnonKey)
        results.push(supabaseResult)
      } else {
        results.push({
          valid: false,
          service: 'Supabase',
          message: 'Supabase credentials not found in environment',
        })
      }
    } else {
      // Validate provided keys
      if (body.alpacaApiKey && body.alpacaSecretKey) {
        const alpacaResult = await validateAlpacaKeys(
          body.alpacaApiKey,
          body.alpacaSecretKey
        )
        results.push(alpacaResult)
      }

      if (body.supabaseUrl && body.supabaseAnonKey) {
        const supabaseResult = await validateSupabaseKeys(
          body.supabaseUrl,
          body.supabaseAnonKey
        )
        results.push(supabaseResult)
      }
    }

    const allValid = results.every((r) => r.valid)

    return NextResponse.json(
      {
        success: allValid,
        message: allValid
          ? 'All API keys are valid'
          : 'Some API keys are invalid',
        results,
        timestamp: new Date().toISOString(),
      },
      { status: allValid ? 200 : 400 }
    )
  } catch (error) {
    console.error('API key validation error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to validate API keys',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/validate/api-keys
 * Quick validation of environment keys
 */
export async function GET() {
  try {
    const results: ValidationResult[] = []

    // Check if keys exist
    const alpacaApiKey = process.env.APCA_API_KEY_ID
    const alpacaSecretKey = process.env.APCA_API_SECRET_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    results.push({
      valid: !!(alpacaApiKey && alpacaSecretKey),
      service: 'Alpaca',
      message: alpacaApiKey && alpacaSecretKey
        ? 'Alpaca API keys present'
        : 'Alpaca API keys missing',
    })

    results.push({
      valid: !!(supabaseUrl && supabaseAnonKey),
      service: 'Supabase',
      message: supabaseUrl && supabaseAnonKey
        ? 'Supabase credentials present'
        : 'Supabase credentials missing',
    })

    const allValid = results.every((r) => r.valid)

    return NextResponse.json({
      success: allValid,
      message: allValid
        ? 'All required API keys are present'
        : 'Some API keys are missing',
      results,
      note: 'Use POST to validate key functionality',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check API keys',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
