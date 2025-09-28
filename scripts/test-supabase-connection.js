const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    return
  }

  console.log('✅ Environment variables found')
  console.log('Supabase URL:', supabaseUrl)

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    console.log('🔄 Testing database query...')
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Database query failed:', error.message)
      return
    }

    console.log('✅ Database connection successful!')
    console.log('Query result:', data)

    console.log('\n🔄 Testing table access...')
    const tables = ['profiles', 'trade_history', 'bot_metrics', 'bot_activity_logs', 'ai_learning_data', 'market_sentiment']

    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (tableError) {
          console.log(`❌ ${table}: ${tableError.message}`)
        } else {
          console.log(`✅ ${table}: accessible`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    console.log('\n🎉 Supabase connection test completed!')

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testSupabaseConnection()