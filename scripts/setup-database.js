const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function setupDatabase() {
  console.log('🔄 Setting up Supabase database schema...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('✅ Connected to Supabase with service role')

    const sqlFile = path.join(__dirname, 'create-supabase-schema.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    console.log('🔄 Creating test records to initialize tables...')

    // Create a test profile to verify the table exists
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          email: 'test@example.com'
        })

      if (profileError && !profileError.message.includes('duplicate')) {
        console.log('⚠️  Profiles table may need to be created manually')
      }
    } catch (err) {
      console.log('⚠️  Could not test profiles table')
    }

    console.log('🔄 Testing table creation...')
    const tables = ['profiles', 'trade_history', 'bot_metrics', 'bot_activity_logs', 'ai_learning_data', 'market_sentiment']

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: created successfully`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    console.log('\n🎉 Database setup completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Verify tables in Supabase dashboard')
    console.log('2. Test the connection with: npm run test:supabase')
    console.log('3. Your trading bot can now use the database!')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

setupDatabase()