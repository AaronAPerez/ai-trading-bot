# ===============================================
# AI Trading Bot - Phase 1 Setup Script (Windows)
# setup-phase1.ps1
# ===============================================

Write-Host "🚀 AI Trading Bot - Phase 1 Enhanced Architecture Setup" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "✓ Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "✓ Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow

# Create store directories
$directories = @(
    "store\slices",
    "hooks\api",
    "lib\services",
    "__tests__\unit\store",
    "__tests__\integration\hooks",
    "__mocks__"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ℹ Already exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📝 Creating mock files..." -ForegroundColor Yellow

# Create styleMock.js
$styleMockContent = "module.exports = {}"
Set-Content -Path "__mocks__\styleMock.js" -Value $styleMockContent
Write-Host "  ✓ Created: __mocks__\styleMock.js" -ForegroundColor Green

# Create fileMock.js
$fileMockContent = "module.exports = 'test-file-stub'"
Set-Content -Path "__mocks__\fileMock.js" -Value $fileMockContent
Write-Host "  ✓ Created: __mocks__\fileMock.js" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Verifying dependencies..." -ForegroundColor Yellow

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "  ❌ package.json not found. Please run this script from project root." -ForegroundColor Red
    exit 1
}

# Required dependencies
$requiredDeps = @(
    "zustand",
    "@tanstack/react-query",
    "@tanstack/react-query-devtools",
    "immer",
    "@supabase/supabase-js",
    "@alpacahq/alpaca-trade-api"
)

Write-Host "  Checking required dependencies..." -ForegroundColor Gray
$missingDeps = @()

foreach ($dep in $requiredDeps) {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.$dep) {
        Write-Host "  ✓ $dep" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $dep" -ForegroundColor Red
        $missingDeps += $dep
    }
}

if ($missingDeps.Count -gt 0) {
    Write-Host ""
    Write-Host "  Installing missing dependencies..." -ForegroundColor Yellow
    npm install $missingDeps.Join(" ")
}

Write-Host ""
Write-Host "🔧 Verifying environment configuration..." -ForegroundColor Yellow

if (Test-Path ".env.local") {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Green
    
    # Check critical env vars
    $envContent = Get-Content ".env.local" -Raw
    $criticalVars = @(
        "APCA_API_KEY_ID",
        "APCA_API_SECRET_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    
    foreach ($var in $criticalVars) {
        if ($envContent -match $var) {
            Write-Host "  ✓ $var configured" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ $var not found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⚠ .env.local not found. Please create it from .env.template" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Phase 1 directory structure is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Copy artifact code to respective files:" -ForegroundColor White
Write-Host "     - store\slices\portfolioSlice.ts" -ForegroundColor Gray
Write-Host "     - store\slices\aiSlice.ts" -ForegroundColor Gray
Write-Host "     - store\slices\marketSlice.ts" -ForegroundColor Gray
Write-Host "     - store\unifiedTradingStore.ts" -ForegroundColor Gray
Write-Host "     - hooks\api\useEnhancedTradingQueries.ts" -ForegroundColor Gray
Write-Host "     - lib\services\websocketService.ts" -ForegroundColor Gray
Write-Host "     - jest.config.js" -ForegroundColor Gray
Write-Host "     - jest.setup.js" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run tests to verify setup:" -ForegroundColor White
Write-Host "     npm test" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start development server:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Open Redux DevTools in browser to inspect state" -ForegroundColor White
Write-Host ""
Write-Host "📖 See IMPLEMENTATION_GUIDE.md for detailed usage examples" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Setup complete! Happy coding!" -ForegroundColor Green