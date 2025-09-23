#!/usr/bin/env node

// Continuous AI Trading Monitor
// Usage: node watch-ai.js

const API_BASE = 'http://localhost:3005/api';
const REFRESH_INTERVAL = 10000; // 10 seconds

// Clear console and show header
function clearAndShowHeader() {
  console.clear();
  console.log('🤖 AI Trading Live Monitor');
  console.log('=' .repeat(60));
  console.log('Press Ctrl+C to exit\n');
}

// Check if market is open
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hour * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM

  return isWeekday && (timeInMinutes >= marketOpen && timeInMinutes < marketClose);
}

// Format time difference
function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Main monitoring loop
async function watchAI() {
  try {
    clearAndShowHeader();

    const now = new Date();
    const marketOpen = isMarketOpen();

    // Market Status
    console.log(`⏰ Time: ${now.toLocaleTimeString()}`);
    console.log(`📈 Market: ${marketOpen ? '🟢 OPEN' : '🔴 CLOSED'}`);

    // AI Status
    const response = await fetch(`${API_BASE}/ai-trading`);
    const aiStatus = await response.json();

    if (aiStatus.running) {
      const session = aiStatus.session;
      const startTime = new Date(session.startTime);
      const runtime = Date.now() - startTime.getTime();

      console.log('\n🧠 AI ENGINE STATUS: 🟢 RUNNING');
      console.log(`📊 Session: ${session.sessionId.split('_')[1]}`);
      console.log(`⏱️  Runtime: ${formatTime(runtime)}`);
      console.log(`💰 P&L: $${session.totalPnL.toFixed(2)}`);
      console.log(`📈 Trades: ${session.tradesExecuted}`);
      console.log(`🎯 Predictions: ${session.aiPredictions}`);

      if (session.aiPredictions > 0) {
        const accuracy = (session.successfulPredictions / session.aiPredictions * 100).toFixed(1);
        console.log(`🎯 Accuracy: ${accuracy}%`);
      }

      // Trading Activity
      console.log('\n⚡ TRADING ACTIVITY');
      if (!marketOpen) {
        console.log('💤 Market closed - AI idle');
        console.log('🔄 Will resume when market opens');
      } else {
        console.log('✅ Active trading enabled');
        console.log('🎯 75% confidence threshold');
        console.log('📊 Monitoring 45 symbols');
      }

      // Quick watchlist status
      if (aiStatus.marketDataStatus) {
        const totalSymbols = aiStatus.marketDataStatus.length;
        const symbolsWithData = aiStatus.marketDataStatus.filter(s => s.dataPoints > 0).length;
        console.log(`📋 Watchlist: ${symbolsWithData}/${totalSymbols} symbols active`);
      }

    } else {
      console.log('\n🧠 AI ENGINE STATUS: 🔴 STOPPED');
      console.log('💡 Start with: curl -X POST http://localhost:3005/api/ai-trading -d \'{"action":"start"}\'');
    }

    // Auto-execution status
    console.log('\n🤖 AUTO-EXECUTION CONFIG');
    console.log('Min Confidence: 75%');
    console.log('Max Daily Trades: 50');
    console.log('Market Hours Only: ✅');
    console.log('Paper Trading: ✅');

    console.log(`\n🔄 Next update in 10 seconds...`);

  } catch (error) {
    console.log(`❌ Connection Error: ${error.message}`);
    console.log('💡 Make sure AI server is running on localhost:3005');
  }
}

// Start monitoring
console.log('🚀 Starting AI Trading Monitor...\n');

// Initial run
watchAI();

// Set up interval
const interval = setInterval(watchAI, REFRESH_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n👋 AI Monitor stopped');
  process.exit(0);
});