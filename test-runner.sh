# Corrected Windows PowerShell Test Runner for AI Trading Bot
# Save as: test-runner.ps1

param(
    [string]$TestType = "all"
)

Write-Host "🧪 AI Trading Bot Test Runner (Windows)" -ForegroundColor Cyan
Write-Host "======================================="

# Set environment variables for Windows
$env:NODE_ENV = "test"
$env:JEST_WORKER_ID = "1"

# Function to run tests with proper environment
function Run-Tests {
    param(
        [string]$TestName,
        [string]$TestPattern
    )
    
    Write-Host "🔄 Running $TestName tests..." -ForegroundColor Yellow
    Write-Host "Pattern: $TestPattern"
    Write-Host ""
    
    # Set Node environment and run tests
    $env:NODE_ENV = "test"
    
    try {
        if ($TestPattern -eq "all") {
            npm run test -- --testEnvironment=node --detectOpenHandles --forceExit --maxWorkers=1 --testTimeout=30000 --verbose
        } else {
            # Fixed: Use --testPathPatterns instead of --testPathPattern
            npm run test -- --testEnvironment=node --testPathPatterns="$TestPattern" --detectOpenHandles --forceExit --maxWorkers=1 --testTimeout=30000 --verbose
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $TestName tests passed" -ForegroundColor Green
        } else {
            Write-Host "❌ $TestName tests failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        Write-Host "💥 Error running $TestName tests: $_" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    return ($LASTEXITCODE -eq 0)
}

# Function to check if test files exist
function Test-TestFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ Test file not found: $FilePath" -ForegroundColor Red
        return $false
    }
    return $true
}

# Function to install cross-env if needed
function Install-CrossEnv {
    Write-Host "📦 Checking for cross-env..." -ForegroundColor Yellow
    
    try {
        npm list cross-env *>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Installing cross-env for Windows compatibility..." -ForegroundColor Yellow
            npm install --save-dev cross-env
        } else {
            Write-Host "✅ cross-env is already installed" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Could not check/install cross-env. Using fallback commands." -ForegroundColor Yellow
    }
}

# Function to check Jest version and provide guidance
function Check-JestVersion {
    Write-Host "🔍 Checking Jest version..." -ForegroundColor Yellow
    
    try {
        $jestVersion = npm list jest --depth=0 2>$null | Select-String "jest@"
        if ($jestVersion) {
            Write-Host "✅ Jest found: $jestVersion" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Jest not found. Installing..." -ForegroundColor Yellow
            npm install --save-dev jest
        }
    } catch {
        Write-Host "⚠️ Could not check Jest version" -ForegroundColor Yellow
    }
}

# Main execution
try {
    # Install dependencies if needed
    Install-CrossEnv
    Check-JestVersion
    
    Write-Host "🔍 Checking test files..." -ForegroundColor Yellow
    
    # Check test files
    $testFiles = @(
        "__tests__/unit/enhanced-config-validator.test.ts",
        "__tests__/integration/alpaca-api.test.ts"
    )
    
    foreach ($file in $testFiles) {
        if (-not (Test-TestFile $file)) {
            Write-Host "Some test files are missing. Please ensure all test files are created." -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "✅ Test files found" -ForegroundColor Green
    Write-Host ""
    
    # Execute based on test type
    switch ($TestType.ToLower()) {
        "unit" {
            Write-Host "Running unit tests only..." -ForegroundColor Cyan
            Run-Tests "Unit" "__tests__/unit"
        }
        "integration" {
            Write-Host "Running integration tests only..." -ForegroundColor Cyan
            Run-Tests "Integration" "__tests__/integration"
        }
        "config" {
            Write-Host "Running config validator tests only..." -ForegroundColor Cyan
            Run-Tests "Config Validator" "enhanced-config-validator.test.ts"
        }
        "alpaca" {
            Write-Host "Running Alpaca API tests only..." -ForegroundColor Cyan
            Run-Tests "Alpaca API" "alpaca-api.test.ts"
        }
        "env" {
            Write-Host "Running environment validation tests..." -ForegroundColor Cyan
            Run-Tests "Environment" "enhanced-config-validator.test.ts"
        }
        "environment-check" {
            Write-Host "Running environment check tests..." -ForegroundColor Cyan
            Run-Tests "Environment Check" "environment-check.test.ts"
        }
        "all" {
            Write-Host "Running all tests..." -ForegroundColor Cyan
            
            # Run unit tests first
            $unitResult = Run-Tests "Unit" "__tests__/unit"
            
            # Run integration tests
            $integrationResult = Run-Tests "Integration" "__tests__/integration"
            
            # Summary
            Write-Host "📋 Test Summary:" -ForegroundColor Cyan
            Write-Host "==============="
            if ($unitResult) {
                Write-Host "✅ Unit tests: PASSED" -ForegroundColor Green
            } else {
                Write-Host "❌ Unit tests: FAILED" -ForegroundColor Red
            }
            
            if ($integrationResult) {
                Write-Host "✅ Integration tests: PASSED" -ForegroundColor Green
            } else {
                Write-Host "❌ Integration tests: FAILED" -ForegroundColor Red
            }
            
            # Overall result
            if ($unitResult -and $integrationResult) {
                Write-Host ""
                Write-Host "🎉 All tests passed!" -ForegroundColor Green
                exit 0
            } else {
                Write-Host ""
                Write-Host "💥 Some tests failed" -ForegroundColor Red
                exit 1
            }
        }
        "clean" {
            Write-Host "🧹 Cleaning test artifacts..." -ForegroundColor Yellow
            
            # Kill Jest processes
            Get-Process | Where-Object {$_.ProcessName -like "*jest*"} | Stop-Process -Force -ErrorAction SilentlyContinue
            
            # Clear Jest cache
            npm run test:clean
            
            # Remove coverage directory
            if (Test-Path "coverage") {
                Remove-Item -Recurse -Force "coverage"
            }
            
            Write-Host "✅ Cleanup completed" -ForegroundColor Green
        }
        "debug" {
            Write-Host "🐛 Running tests in debug mode..." -ForegroundColor Yellow
            
            $env:NODE_ENV = "test"
            npm run test -- --testEnvironment=node --detectOpenHandles --verbose --runInBand --no-cache --forceExit
        }
        default {
            Write-Host "Usage: .\test-runner.ps1 [unit|integration|config|alpaca|env|environment-check|all|clean|debug]" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Options:" -ForegroundColor Cyan
            Write-Host "  unit              - Run unit tests only"
            Write-Host "  integration       - Run integration tests only"
            Write-Host "  config            - Run config validator tests only"
            Write-Host "  alpaca            - Run Alpaca API tests only"
            Write-Host "  env               - Run environment validation tests"
            Write-Host "  environment-check - Run environment check tests"
            Write-Host "  all               - Run all tests (default)"
            Write-Host "  clean             - Clean test artifacts and kill hanging processes"
            Write-Host "  debug             - Run tests with maximum debugging info"
            Write-Host ""
            Write-Host "Examples:" -ForegroundColor Green
            Write-Host "  .\test-runner.ps1 alpaca"
            Write-Host "  .\test-runner.ps1 environment-check"
            Write-Host "  .\test-runner.ps1 debug"
            exit 1
        }
    }
} catch {
    Write-Host "💥 Script execution failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    Write-Host ""
    Write-Host "🧹 Performing cleanup..." -ForegroundColor Yellow
    
    # Kill any hanging Jest processes
    Get-Process | Where-Object {$_.ProcessName -like "*jest*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}