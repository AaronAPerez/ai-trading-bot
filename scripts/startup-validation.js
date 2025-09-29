#!/usr/bin/env node

/**
 * Simple startup validation script
 */

const path = require('path')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') })

/**
 * Quick validation function
 */
function quickValidation() {
  console.log('🔍 Quick validation check...')

  const issues = []

  // Check Alpaca API keys
  if (!process.env.APCA_API_KEY_ID) {
    issues.push('❌ APCA_API_KEY_ID is missing')
  }

  if (!process.env.APCA_API_SECRET_KEY) {
    issues.push('❌ APCA_API_SECRET_KEY is missing')
  }

  // Check Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push('❌ NEXT_PUBLIC_SUPABASE_URL is missing')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  }

  if (issues.length > 0) {
    console.log('❌ Quick validation failed:')
    issues.forEach(issue => console.log(`  • ${issue}`))
    return false
  }

  console.log('✅ Quick validation passed')
  return true
}

/**
 * Full validation function
 */
function fullValidation() {
  console.log('🔍 Full validation check...')

  // For now, just run quick validation
  // This can be expanded later
  return quickValidation()
}

/**
 * Show environment template
 */
function showTemplate() {
  console.log(`
📝 Environment Template (.env.local):

# Alpaca API Configuration (REQUIRED)
APCA_API_KEY_ID=your_paper_api_key_here
APCA_API_SECRET_KEY=your_paper_secret_key_here
NEXT_PUBLIC_TRADING_MODE=paper
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
`)
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  try {
    if (args.includes('--quick')) {
      const isValid = quickValidation()
      process.exit(isValid ? 0 : 1)
    } else if (args.includes('--template')) {
      showTemplate()
      process.exit(0)
    } else {
      const isValid = fullValidation()
      process.exit(isValid ? 0 : 1)
    }
  } catch (error) {
    console.error('❌ Validation error:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}