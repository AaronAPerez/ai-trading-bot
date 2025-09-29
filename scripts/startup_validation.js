#!/usr/bin/env node

/**
 * Startup Environment Validation Script
 * Validates all environment variables and API connections before starting the application
 * @fileoverview Pre-flight checks for AI Trading Bot
 */

const path = ('path')
const fs = ('fs')

// Load environment variables
('dotenv').config({ path: path.join(process.cwd(), '.env.local') })

// Dynamic import for ES modules
let ConfigValidator

async function loadConfigValidator() {
  try {
    // Try to load the TypeScript module if running in development
    if (process.env.NODE_ENV === 'development' && fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
      const { register } = ('ts-node')
      register({
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      })
      ConfigValidator = ('../lib/config/ConfigValidator').ConfigValidator
    } else {
      // Try to load compiled JavaScript version
      ConfigValidator = ('../lib/config/ConfigValidator').ConfigValidator
    }
  } catch (error) {
    console.error('❌ Failed to load ConfigValidator:', error.message)
    console.log('💡 Make sure to build the project first: npm run build')
    process.exit(1)
  }
}

/**
 * Main validation function
 */
async function runStartupValidation() {
  console.log('🚀 AI Trading Bot - Startup Validation')
  console.log('=====================================\n')

  try {
    // Load the config validator
    await loadConfigValidator()

    // Run comprehensive validation
    console.log('🔍 Running comprehensive environment validation...')
    const validationResult = await ConfigValidator.validateEnvironment()

    // Log detailed results
    ConfigValidator.logValidationResult(validationResult)

    // Determine if we can proceed
    if (validationResult.valid) {
      console.log('\n🎉 All validations passed! Application ready to start.')
      
      // Additional startup checks
      await performAdditionalStartupChecks(validationResult)
      
      process.exit(0)
    } else {
      console.log('\n❌ Validation failed. Please fix the issues above before starting the application.')
      
      // Provide helpful suggestions
      await provideSuggestions(validationResult)
      
      process.exit(1)
    }

  } catch (error) {
    console.error('💥 Startup validation failed with error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Perform additional startup checks
 */
async function performAdditionalStartupChecks(validationResult) {
  console.log('\n🔧 Running additional startup checks...')

  // Check for required directories
  const requiredDirs = [
    'public',
    'styles', 
    'components',
    'pages',
    'lib',
    'hooks'
  ]

  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(process.cwd(), dir)))
  
  if (missingDirs.length > 0) {
    console.log('⚠️ Missing directories:', missingDirs.join(', '))
  } else {
    console.log('✅ All required directories present')
  }

  // Check if we're in paper trading mode
  if (validationResult.config.alpaca.tradingMode === 'paper') {
    console.log('✅ Running in PAPER TRADING mode - no real money at risk')
  } else if (validationResult.config.alpaca.tradingMode === 'live') {
    console.log('⚠️ WARNING: Running in LIVE TRADING mode - REAL MONEY AT RISK!')
    console.log('   Please ensure you understand the risks before proceeding.')
  }

  // Check service response times
  const slowServices = validationResult.services.filter(s => s.responseTime && s.responseTime > 5000)
  if (slowServices.length > 0) {
    console.log('⚠️ Slow service response detected:')
    slowServices.forEach(service => {
      console.log(`   ${service.name}: ${service.responseTime}ms`)
    })
  }

  console.log('✅ Additional startup checks completed')
}

/**
 * Provide helpful suggestions for fixing issues
 */
async function provideSuggestions(validationResult) {
  console.log('\n💡 Suggestions to fix validation issues:')
  console.log('=====================================')

  // Group issues by type
  const alpacaIssues = validationResult.issues.filter(i => i.field.includes('APCA'))
  const supabaseIssues = validationResult.issues.filter(i => i.field.includes('SUPABASE'))
  const appIssues = validationResult.issues.filter(i => !i.field.includes('APCA') && !i.field.includes('SUPABASE'))

  if (alpacaIssues.length > 0) {
    console.log('\n🔑 Alpaca API Issues:')
    console.log('1. Sign up for a free paper trading account at: https://alpaca.markets/')
    console.log('2. Navigate to: https://app.alpaca.markets/paper/dashboard/overview')
    console.log('3. Go to "API Keys" section and generate new keys')
    console.log('4. Add the keys to your .env.local file:')
    console.log('   APCA_API_KEY_ID=your_paper_key_here')
    console.log('   APCA_API_SECRET_KEY=your_paper_secret_here')
  }

  if (supabaseIssues.length > 0) {
    console.log('\n🗄️ Supabase Issues:')
    console.log('1. Create a free Supabase project at: https://supabase.com/dashboard')
    console.log('2. Go to Project Settings > API')
    console.log('3. Copy your Project URL and API keys')
    console.log('4. Add them to your .env.local file:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here')
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
    console.log('5. Run the database migration:')
    console.log('   npm run supabase:migration:apply')
  }

  if (appIssues.length > 0) {
    console.log('\n⚙️ Application Configuration Issues:')
    console.log('1. Ensure NODE_ENV is set correctly')
    console.log('2. For production, set NEXTAUTH_SECRET to a secure random string')
    console.log('3. Review your .env.local file for any typos')
  }

  // Show template if no .env.local exists
  if (!fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    console.log('\n📋 No .env.local file found. Create one with this template:')
    console.log(ConfigValidator.getRecommendedEnvironmentVariables())
  }

  console.log('\n🔧 After making changes:')
  console.log('1. Restart this validation: npm run validate:env')
  console.log('2. If validation passes, start the app: npm run dev')
}

/**
 * Check if running as a pre-start script
 */
function isPreStartScript() {
  return process.argv.includes('--pre-start') || process.env.npm_lifecycle_event === 'predev'
}

/**
 * Handle different execution modes
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }

  if (args.includes('--quick')) {
    await runQuickValidation()
    return
  }

  if (args.includes('--template')) {
    showEnvTemplate()
    return
  }

  // Default: run full validation
  await runStartupValidation()
}

/**
 * Quick validation for CI/CD pipelines
 */
async function runQuickValidation() {
  console.log('🔍 Quick validation check...')
  
  try {
    await loadConfigValidator()
    const isValid = await ConfigValidator.quickValidation()
    
    if (isValid) {
      console.log('✅ Quick validation passed')
      process.exit(0)
    } else {
      console.log('❌ Quick validation failed')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Quick validation error:', error.message)
    process.exit(1)
  }
}

/**
 * Show environment template
 */
function showEnvTemplate() {
  console.log('📋 Environment Variables Template:')
  console.log(ConfigValidator?.getRecommendedEnvironmentVariables() || 
    'ConfigValidator not loaded. Run npm run build first.')
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 AI Trading Bot - Startup Validation Script

Usage:
  node scripts/startup-validation.js [options]

Options:
  --help, -h      Show this help message
  --quick         Run quick validation (for CI/CD)
  --template      Show environment variables template
  --pre-start     Run as pre-start script (silent mode)

Examples:
  npm run validate:env              # Full validation
  npm run validate:env -- --quick   # Quick check
  npm run validate:env -- --template # Show template

The script will:
✅ Validate all environment variables
✅ Test API connections to Alpaca and Supabase  
✅ Check database table accessibility
✅ Verify application configuration
✅ Provide detailed error messages and suggestions
`)
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script execution failed:', error.message)
    process.exit(1)
  })
}

module.exports = {
  runStartupValidation,
  runQuickValidation
}