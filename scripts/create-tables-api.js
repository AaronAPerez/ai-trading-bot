const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createTablesDirectly() {
  console.log('🔄 Creating database tables via Supabase API...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('✅ Connected to Supabase with service role')

    // Since we can't execute DDL via the client, let's test if tables exist by trying to query them
    // and create sample data to verify the structure

    console.log('🔄 Testing table access and structure...')

    // Test profiles table
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

      if (profileError) {
        console.log('❌ profiles table needs to be created manually via SQL Editor in Dashboard')
        console.log('   Error:', profileError.message)
      } else {
        console.log('✅ profiles table exists and is accessible')
      }
    } catch (err) {
      console.log('❌ profiles table error:', err.message)
    }

    // Test other tables
    const tables = ['trade_history', 'bot_metrics', 'bot_activity_logs', 'ai_learning_data', 'market_sentiment']
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ ${table}: needs to be created (${error.message})`)
        } else {
          console.log(`✅ ${table}: exists and accessible`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    console.log('\n📝 Manual Steps Required:')
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/baycyvjefrgihwivymxb')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the content from: supabase/migrations/20250928044112_initial_trading_bot_schema.sql')
    console.log('4. Run the SQL to create all tables')
    console.log('5. Re-run this script to verify table creation')

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

createTablesDirectly()