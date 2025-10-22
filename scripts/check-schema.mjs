#!/usr/bin/env node
/**
 * Check Supabase schema for trading_strategies table
 *
 * Usage:
 *   node scripts/check-schema.mjs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking Supabase schema for trading_strategies table...\n')

// Test 1: Check if table exists
console.log('📋 Test 1: Check if trading_strategies table exists')
try {
  const { data, error } = await supabase
    .from('trading_strategies')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
  } else {
    console.log('✅ Table exists and is accessible')
    if (data && data.length > 0) {
      console.log('✅ Found', data.length, 'row(s)')
      console.log('   Columns:', Object.keys(data[0]).join(', '))
    } else {
      console.log('⚠️  Table is empty')
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message)
}

console.log('\n' + '='.repeat(80) + '\n')

// Test 2: Try to insert a test strategy
console.log('📋 Test 2: Try to insert test strategy with all columns')
try {
  const testData = {
    user_id: '00000000-0000-0000-0000-000000000000',
    strategy_type: 'test_strategy',
    name: 'Test Strategy',
    // total_signals: 10, // Column doesn't exist - omitting
    successful_signals: 5,
    total_return: 100.50,
    win_rate: 50.0
  }

  console.log('   Inserting:', JSON.stringify(testData, null, 2))

  const { data, error } = await supabase
    .from('trading_strategies')
    .upsert(testData, {
      onConflict: 'user_id,strategy_type'
    })
    .select()

  if (error) {
    console.error('❌ Error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)

    // Check which specific field is causing the issue
    if (error.code === 'PGRST204') {
      console.error('\n💡 PGRST204 = Column not found in PostgREST schema cache')
      console.error('   This means the column exists in the database but PostgREST cannot see it.')
      console.error('   Solution: Run NOTIFY pgrst, \'reload schema\'; in Supabase SQL Editor')
    }
  } else {
    console.log('✅ Insert successful!')
    console.log('   Data:', JSON.stringify(data, null, 2))

    // Clean up test data
    await supabase
      .from('trading_strategies')
      .delete()
      .eq('strategy_type', 'test_strategy')

    console.log('✅ Test data cleaned up')
  }
} catch (err) {
  console.error('❌ Exception:', err.message)
}

console.log('\n' + '='.repeat(80) + '\n')

// Test 3: Check column accessibility
console.log('📋 Test 3: Test individual column selects')
const columnsToTest = ['total_signals', 'successful_signals', 'name', 'strategy_type', 'win_rate', 'total_return']

for (const col of columnsToTest) {
  try {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select(col)
      .limit(1)

    if (error) {
      console.error(`❌ Column '${col}': ${error.message} (${error.code})`)
    } else {
      console.log(`✅ Column '${col}': accessible`)
    }
  } catch (err) {
    console.error(`❌ Column '${col}': ${err.message}`)
  }
}

console.log('\n' + '='.repeat(80) + '\n')
console.log('✅ Schema check complete!\n')
