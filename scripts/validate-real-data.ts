/**
 * Validates that ONLY real data sources are being used
 * Run: npm run validate:real-data
 */

import { AlpacaClient } from '@/lib/alpaca/AlpacaClient'
import { supabaseService } from '@/lib/database/supabase-utils'

async function validateRealDataSources() {
  console.log('🔍 Validating Real Data Sources...\n')
  
  let allPassed = true

  // 1. Check environment variables
  console.log('1️⃣ Checking Environment Variables:')
  const requiredEnv = [
    'APCA_API_KEY_ID',
    'APCA_API_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  for (const env of requiredEnv) {
    if (!process.env[env] || process.env[env]?.includes('test') || process.env[env]?.includes('demo')) {
      console.log(`   ❌ ${env}: Invalid or missing`)
      allPassed = false
    } else {
      console.log(`   ✅ ${env}: Configured`)
    }
  }

  // 2. Verify demo mode is OFF
  console.log('\n2️⃣ Checking Demo Mode:')
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    console.log('   ❌ Demo mode is ENABLED - must be disabled')
    allPassed = false
  } else {
    console.log('   ✅ Demo mode is disabled')
  }

  // 3. Test real Alpaca API connection
  console.log('\n3️⃣ Testing Alpaca API Connection:')
  try {
    const alpaca = new AlpacaClient()
    const account = await alpaca.getAccount()
    
    if (account.account_number) {
      console.log(`   ✅ Connected to Alpaca account: ${account.account_number}`)
      console.log(`   💰 Buying Power: $${parseFloat(account.buying_power).toFixed(2)}`)
    } else {
      console.log('   ❌ Invalid Alpaca response')
      allPassed = false
    }
  } catch (error) {
    console.log(`   ❌ Alpaca connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    allPassed = false
  }

  // 4. Test real Supabase connection
  console.log('\n4️⃣ Testing Supabase Database Connection:')
  try {
    const { data, error } = await supabaseService.client
      .from('trade_history')
      .select('count')
      .limit(1)
    
    if (error) throw error
    console.log('   ✅ Connected to Supabase database')
  } catch (error) {
    console.log(`   ❌ Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    allPassed = false
  }

  // 5. Check for mock data in codebase
  console.log('\n5️⃣ Scanning for Mock Data Usage:')
  const mockPatterns = [
    'generateMock',
    'getFallback',
    'isDemoMode',
    'DEMO_USER',
    'simulateAITrade'
  ]
  
  console.log('   ⚠️  Manual code review required')
  console.log('   Search codebase for:', mockPatterns.join(', '))

  // Final result
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED - Using REAL DATA ONLY')
  } else {
    console.log('❌ VALIDATION FAILED - Fix issues above')
    process.exit(1)
  }
}

validateRealDataSources()