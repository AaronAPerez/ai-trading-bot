#!/bin/bash

# Setup Environment Validation System
# This script sets up all the files for the enhanced validation system

echo "🚀 Setting up AI Trading Bot Environment Validation System..."
echo "============================================================="

# Create directories if they don't exist
echo "📁 Creating directories..."
mkdir -p lib/config
mkdir -p hooks
mkdir -p components
mkdir -p scripts
mkdir -p __tests__/unit

# Copy enhanced ConfigValidator
echo "🔧 Setting up Enhanced ConfigValidator..."
cat > lib/config/ConfigValidator.ts << 'EOF'
# The enhanced ConfigValidator code goes here
# (Use the content from the enhanced_config_validator artifact)
EOF

echo "✅ Enhanced ConfigValidator created at lib/config/ConfigValidator.ts"

# Create the environment checker hook
echo "🪝 Setting up useEnvironmentChecker hook..."
cat > hooks/useEnvironmentChecker.ts << 'EOF'
# The useEnvironmentChecker hook code goes here
# (Use the content from the runtime_env_checker artifact)
EOF

echo "✅ Environment checker hook created at hooks/useEnvironmentChecker.ts"

# Create the dashboard component
echo "🖥️ Setting up Environment Dashboard component..."
cat > components/EnvironmentDashboard.tsx << 'EOF'
# The EnvironmentDashboard component code goes here
# (Use the content from the environment_dashboard_component artifact)
EOF

echo "✅ Environment dashboard created at components/EnvironmentDashboard.tsx"

# Create startup validation script
echo "🏃 Setting up startup validation script..."
cat > scripts/startup-validation.js << 'EOF'
# The startup validation script code goes here
# (Use the content from the startup_validation_script artifact)
EOF

chmod +x scripts/startup-validation.js
echo "✅ Startup validation script created at scripts/startup-validation.js"

# Create enhanced test suite
echo "🧪 Setting up test suite..."
cat > __tests__/unit/enhanced-config-validator.test.ts << 'EOF'
# The enhanced test suite code goes here
# (Use the content from the enhanced_config_validator_test artifact)
EOF

echo "✅ Test suite created at __tests__/unit/enhanced-config-validator.test.ts"

# Update package.json scripts
echo "📦 Updating package.json scripts..."

# Backup original package.json
cp package.json package.json.backup

# Add new scripts to package.json
cat > temp_scripts.json << 'EOF'
{
  "validate:env": "node scripts/startup-validation.js",
  "validate:env:quick": "node scripts/startup-validation.js --quick",
  "validate:env:template": "node scripts/startup-validation.js --template",
  "predev": "npm run validate:env:quick",
  "prestart": "npm run validate:env:quick",
  "health:check": "npm run validate:env && npm run supabase:test && npm run alpaca:test",
  "health:quick": "npm run validate:env:quick",
  "setup:env": "npm run validate:env:template > .env.template && echo 'Template created: .env.template'",
  "setup:complete": "npm run setup:env && npm run validate:env && npm run supabase:setup",
  "prod:check": "npm run validate:env && npm run test:ci && npm run build",
  "prod:validate": "NODE_ENV=production npm run validate:env",
  "test:env": "jest --testPathPattern=enhanced-config-validator.test.ts"
}
EOF

# Merge with existing package.json (you'll need to do this manually)
echo "⚠️  Please manually add these scripts to your package.json:"
cat temp_scripts.json
rm temp_scripts.json

# Install required dependencies if not present
echo "📦 Checking dependencies..."

# Check if required packages are installed
MISSING_DEPS=""

if ! npm list @supabase/supabase-js > /dev/null 2>&1; then
  MISSING_DEPS="$MISSING_DEPS @supabase/supabase-js"
fi

if ! npm list @tanstack/react-query > /dev/null 2>&1; then
  MISSING_DEPS="$MISSING_DEPS @tanstack/react-query"
fi

if ! npm list lucide-react > /dev/null 2>&1; then
  MISSING_DEPS="$MISSING_DEPS lucide-react"
fi

if [ ! -z "$MISSING_DEPS" ]; then
  echo "📦 Installing missing dependencies..."
  npm install $MISSING_DEPS
  echo "✅ Dependencies installed"
else
  echo "✅ All dependencies are already installed"
fi

# Create environment template
echo "📝 Creating environment template..."
cat > .env.template << 'EOF'
# ===========================================
# AI Trading Bot Environment Configuration
# ===========================================

# Alpaca API Configuration (REQUIRED)
# Get these from: https://app.alpaca.markets/paper/dashboard/overview
APCA_API_KEY_ID=your_paper_api_key_here
APCA_API_SECRET_KEY=your_paper_secret_key_here
NEXT_PUBLIC_TRADING_MODE=paper
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Supabase Configuration (REQUIRED)
# Get these from: https://supabase.com/dashboard/project/[project-id]/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration (OPTIONAL)
DATABASE_URL=postgresql://user:password@host:port/database

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_32_character_string

# Development Configuration
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
EOF

echo "✅ Environment template created at .env.template"

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from template..."
  cp .env.template .env.local
  echo "⚠️  Please edit .env.local and add your actual API keys and credentials"
else
  echo "ℹ️  .env.local already exists - please compare with .env.template for any missing variables"
fi

# Set up TypeScript paths (if tsconfig.json exists)
if [ -f tsconfig.json ]; then
  echo "🔧 Checking TypeScript configuration..."
  
  # Check if paths are configured
  if ! grep -q '"@/lib/*"' tsconfig.json; then
    echo "⚠️  Please ensure your tsconfig.json includes path mappings:"
    echo '  "paths": {'
    echo '    "@/*": ["./*"],'
    echo '    "@/lib/*": ["./lib/*"],'
    echo '    "@/hooks/*": ["./hooks/*"],'
    echo '    "@/components/*": ["./components/*"]'
    echo '  }'
  else
    echo "✅ TypeScript paths are configured"
  fi
fi

# Final instructions
echo ""
echo "🎉 Environment Validation System Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env.local and add your actual API keys"
echo "2. Add the new scripts to your package.json (see above)"
echo "3. Run validation: npm run validate:env"
echo "4. If validation passes, start development: npm run dev"
echo ""
echo "🔧 Available Commands:"
echo "• npm run validate:env          - Full validation"
echo "• npm run validate:env:quick    - Quick validation"
echo "• npm run validate:env:template - Show environment template"
echo "• npm run health:check          - Check all services"
echo "• npm run setup:complete        - Complete setup wizard"
echo ""
echo "📚 Documentation:"
echo "• Check the README.md file for detailed setup instructions"
echo "• Run tests: npm run test:env"
echo ""
echo "⚠️  Important:"
echo "• Only use paper trading for development"
echo "• Never commit .env.local to version control"
echo "• Run validation before starting the application"

echo ""
echo "Happy Trading! 🚀📈"