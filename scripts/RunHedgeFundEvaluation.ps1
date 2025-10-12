# Navigate to project root
cd "C:\path\to\ai-trading-bot"

# Pull latest strategy metrics from Supabase
$metrics = Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/hedge-fund"

# Evaluate mode
$mode = if ($metrics.winRate.win_rate -gt 0.7 -and $metrics.drawdown.drawdown -lt 0.1) {
  "live"
} elseif ($metrics.winRate.win_rate -gt 0.6) {
  "paper"
} else {
  "simulation"
}

# Log mode decision
Write-Output "Engine Mode: $mode"

# Save to Supabase (optional)
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/engine/mode" -Body @{ mode = $mode }

# Trigger retraining if needed
if ($metrics.winRate.win_rate -lt 0.4) {
  Write-Output "⚠️ Retraining triggered due to low win rate"
  Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/engine/retrain"
}

# Rotate strategies if drawdown breached
foreach ($strategy in $metrics.strategies) {
  if ($strategy.drawdown -gt 0.15) {
    Write-Output "⛔ Strategy $($strategy.strategy) halted due to drawdown"
    Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/strategy/halt" -Body @{ strategy = $strategy.strategy }
  }
}