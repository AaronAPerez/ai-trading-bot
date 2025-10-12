# Set your project path
$projectPath = "C:\path\to\ai-trading-bot\supabase"
cd $projectPath

# Log start
Write-Host "🚀 Starting Supabase hedge fund engine automation..." -ForegroundColor Cyan

# Step 1: Sync database (push SQL views and function)
Write-Host "🔄 Pushing database changes..." -ForegroundColor Yellow
supabase db push

# Step 2: Deploy scheduled function
Write-Host "📦 Deploying scheduled function: evaluate_engine..." -ForegroundColor Yellow
supabase functions deploy evaluate_engine

# Step 3: Schedule function to run daily at 2 AM
Write-Host "🕒 Scheduling function to run at 2 AM daily..." -ForegroundColor Yellow
supabase functions schedule evaluate_engine --cron "0 2 * * *"

# Log completion
Write-Host "✅ Supabase automation complete." -ForegroundColor Green