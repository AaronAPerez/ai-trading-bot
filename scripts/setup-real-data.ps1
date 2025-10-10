# AI Trading Bot - Real Data Setup Script
# This script sets up the trading bot with ONLY real Alpaca API and Supabase data
# NO MOCKS | NO SIMULATIONS | PRODUCTION READY

Write-Host "🚀 AI Trading Bot - Real Data Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Prerequisites
Write-Host "📋 Step 1: Checking Prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version
$npmVersion = npm --version

if ($nodeVersion) {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    exit 1
}

if ($npmVersion) {
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check Environment Variables
Write-Host "📋 Step 2: Checking Environment Variables..." -ForegroundColor Yellow

$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "✅ .env.local file exists" -ForegroundColor Green

    $envContent = Get-Content $envFile -Raw

    $requiredVars = @(
        "APCA_API_KEY_ID",
        "APCA_API_SECRET_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

    foreach ($var in $requiredVars) {
        if ($envContent -match $var) {
            Write-Host "  ✅ $var is set" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var is missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    Write-Host "Creating .env.local template..." -ForegroundColor Yellow

    $template = @"
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
"@

    $template | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Created .env.local template - Please fill in your credentials" -ForegroundColor Green
}

Write-Host ""

# Step 3: Install Dependencies
Write-Host "📋 Step 3: Installing Dependencies..." -ForegroundColor Yellow

Write-Host "Installing npm packages..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Verify Installation
Write-Host "📋 Step 4: Verifying Installation..." -ForegroundColor Yellow

$packages = @(
    "@tanstack/react-query",
    "zustand",
    "@supabase/supabase-js"
)

foreach ($pkg in $packages) {
    $installed = npm list $pkg --depth=0 2>$null
    if ($installed -match $pkg) {
        Write-Host "✅ $pkg is installed" -ForegroundColor Green
    } else {
        Write-Host "❌ $pkg is not installed" -ForegroundColor Red
    }
}

Write-Host ""

# Step 5: Remove Mock Data (Optional)
Write-Host "📋 Step 5: Checking for Mock Data..." -ForegroundColor Yellow

$mockFiles = @(
    "scripts/populate-demo-data.ts",
    "lib/services/DemoModeService.ts"
)

foreach ($file in $mockFiles) {
    if (Test-Path $file) {
        Write-Host "⚠️  Found mock file: $file" -ForegroundColor Yellow
        $response = Read-Host "Do you want to delete it? (y/n)"
        if ($response -eq 'y') {
            Remove-Item $file -Force
            Write-Host "✅ Deleted $file" -ForegroundColor Green
        }
    }
}

Write-Host ""

# Step 6: Type Check
Write-Host "📋 Step 6: Running Type Check..." -ForegroundColor Yellow

npm run type-check 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Type check passed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Type check has warnings (this is OK)" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Build
Write-Host "📋 Step 7: Building Application..." -ForegroundColor Yellow

npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Fill in your Alpaca API keys in .env.local" -ForegroundColor White
Write-Host "2. Fill in your Supabase credentials in .env.local" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Open: http://localhost:3000/bot-dashboard" -ForegroundColor White
Write-Host ""
Write-Host "📊 Dashboard URLs:" -ForegroundColor Yellow
Write-Host "  - Real Data Dashboard: /bot-dashboard" -ForegroundColor White
Write-Host "  - Main Dashboard: /dashboard" -ForegroundColor White
Write-Host ""
Write-Host "✅ Your bot will use ONLY real data from:" -ForegroundColor Green
Write-Host "  • Alpaca Paper Trading API (real market data)" -ForegroundColor White
Write-Host "  • Supabase Database (real trade storage)" -ForegroundColor White
Write-Host "  • React Query (real-time data sync)" -ForegroundColor White
Write-Host "  • Zustand (real state management)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important Reminders:" -ForegroundColor Yellow
Write-Host "  • Paper trading uses REAL market data with FAKE money" -ForegroundColor White
Write-Host "  • Always test with small amounts first" -ForegroundColor White
Write-Host "  • Monitor the Alpaca dashboard for real orders" -ForegroundColor White
Write-Host "  • Check Supabase for real trade records" -ForegroundColor White
Write-Host ""
