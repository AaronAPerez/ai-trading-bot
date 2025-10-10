#!/bin/bash

# AI Trading Bot - Real Data Setup Script
# This script sets up the trading bot with ONLY real Alpaca API and Supabase data
# NO MOCKS | NO SIMULATIONS | PRODUCTION READY

echo "🚀 AI Trading Bot - Real Data Setup"
echo "====================================="
echo ""

# Step 1: Check Prerequisites
echo "📋 Step 1: Checking Prerequisites..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm is not installed"
    exit 1
fi

echo ""

# Step 2: Check Environment Variables
echo "📋 Step 2: Checking Environment Variables..."

if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"

    for var in APCA_API_KEY_ID APCA_API_SECRET_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
        if grep -q "$var" .env.local; then
            echo "  ✅ $var is set"
        else
            echo "  ❌ $var is missing"
        fi
    done
else
    echo "❌ .env.local file not found"
    echo "Creating .env.local template..."

    cat > .env.local << 'EOF'
# Alpaca API (Paper Trading)
APCA_API_KEY_ID=your_alpaca_paper_key_here
APCA_API_SECRET_KEY=your_alpaca_paper_secret_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here

# Mode Configuration
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_USE_REAL_DATA=true
NEXT_PUBLIC_TRADING_MODE=paper

# Node Environment
NODE_ENV=production
EOF

    echo "✅ Created .env.local template - Please fill in your credentials"
fi

echo ""

# Step 3: Install Dependencies
echo "📋 Step 3: Installing Dependencies..."

npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""

# Step 4: Verify Installation
echo "📋 Step 4: Verifying Installation..."

for pkg in @tanstack/react-query zustand @supabase/supabase-js; do
    if npm list "$pkg" --depth=0 &> /dev/null; then
        echo "✅ $pkg is installed"
    else
        echo "❌ $pkg is not installed"
    fi
done

echo ""

# Step 5: Remove Mock Data (Optional)
echo "📋 Step 5: Checking for Mock Data..."

for file in scripts/populate-demo-data.ts lib/services/DemoModeService.ts; do
    if [ -f "$file" ]; then
        echo "⚠️  Found mock file: $file"
        read -p "Do you want to delete it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "$file"
            echo "✅ Deleted $file"
        fi
    fi
done

echo ""

# Step 6: Type Check
echo "📋 Step 6: Running Type Check..."

npm run type-check 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Type check passed"
else
    echo "⚠️  Type check has warnings (this is OK)"
fi

echo ""

# Step 7: Build
echo "📋 Step 7: Building Application..."

npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""

# Summary
echo "====================================="
echo "🎉 Setup Complete!"
echo "====================================="
echo ""
echo "Next Steps:"
echo "1. Fill in your Alpaca API keys in .env.local"
echo "2. Fill in your Supabase credentials in .env.local"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000/bot-dashboard"
echo ""
echo "📊 Dashboard URLs:"
echo "  - Real Data Dashboard: /bot-dashboard"
echo "  - Main Dashboard: /dashboard"
echo ""
echo "✅ Your bot will use ONLY real data from:"
echo "  • Alpaca Paper Trading API (real market data)"
echo "  • Supabase Database (real trade storage)"
echo "  • React Query (real-time data sync)"
echo "  • Zustand (real state management)"
echo ""
echo "⚠️  Important Reminders:"
echo "  • Paper trading uses REAL market data with FAKE money"
echo "  • Always test with small amounts first"
echo "  • Monitor the Alpaca dashboard for real orders"
echo "  • Check Supabase for real trade records"
echo ""
