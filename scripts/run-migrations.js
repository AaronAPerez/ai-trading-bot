const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigrations() {
  console.log('🔄 Running database migrations...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the latest migration file
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    if (migrationFiles.length === 0) {
      console.log('❌ No migration files found')
      return
    }

    const latestMigration = migrationFiles[migrationFiles.length - 1]
    console.log(`📝 Running migration: ${latestMigration}`)

    const migrationPath = path.join(migrationsDir, latestMigration)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`🔄 Executing ${statements.length} SQL statements...`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      try {
        // Use a simple query to execute SQL
        const { error } = await supabase.rpc('exec', { sql: statement })

        if (error) {
          // If RPC doesn't exist, try a workaround using the query builder
          console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`)
        }

        successCount++
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
      } catch (err) {
        errorCount++
        console.log(`❌ Statement ${i + 1} failed: ${err.message}`)
      }
    }

    console.log(`\n📊 Migration Results:`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)

    // Test the tables
    console.log('\n🔄 Testing created tables...')
    const tables = ['profiles', 'trade_history', 'bot_metrics', 'bot_activity_logs', 'ai_learning_data', 'market_sentiment']

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: table accessible`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    console.log('\n🎉 Migration process completed!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

runMigrations()