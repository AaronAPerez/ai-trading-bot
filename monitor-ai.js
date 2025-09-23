#!/usr/bin/env node

// AI Trading Monitor Script
// Usage: node monitor-ai.js

const API_BASE = 'http://localhost:3005/api';

// Check if market is open (simplified version)
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hour * 60 + minutes;

  // Monday (1) to Friday (5)
  const isWeekday = day >= 1 && day <= 5;

  // Market hours: 9:30 AM - 4:00 PM ET (convert to minutes)
  const marketOpen = 9 * 60 + 30;  // 9:30 AM = 570 minutes
  const marketClose = 16 * 60;     // 4:00 PM = 960 minutes

  const isMarketHours = timeInMinutes >= marketOpen && timeInMinutes < marketClose;

  return isWeekday && isMarketHours;
}

// Get time until next market open
function getTimeUntilMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  // If it's weekend, calculate time until Monday 9:30 AM
  if (day === 0 || day === 6) { // Sunday or Saturday
    const daysUntilMonday = day === 0 ? 1 : 2;
    const mondayMarketOpen = new Date(now);
    mondayMarketOpen.setDate(now.getDate() + daysUntilMonday);
    mondayMarketOpen.setHours(9, 30, 0, 0);
    return mondayMarketOpen - now;
  }

  // If it's before 9:30 AM on weekday
  const timeInMinutes = hour * 60 + minutes;
  const marketOpen = 9 * 60 + 30;

  if (timeInMinutes < marketOpen) {
    const todayMarketOpen = new Date(now);
    todayMarketOpen.setHours(9, 30, 0, 0);
    return todayMarketOpen - now;
  }

  // If it's after market close, next open is tomorrow 9:30 AM (or Monday if Friday)
  const nextDay = day === 5 ? 3 : 1; // If Friday, add 3 days to get Monday
  const nextMarketOpen = new Date(now);
  nextMarketOpen.setDate(now.getDate() + nextDay);
  nextMarketOpen.setHours(9, 30, 0, 0);
  return nextMarketOpen - now;
}

// Format milliseconds to readable time
function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

// Main monitoring function
async function monitorAI() {
  try {
    console.log('\n🤖 AI Trading Monitor');
    console.log('=' .repeat(50));

    // Current time and market status
    const now = new Date();
    const marketOpen = isMarketOpen();

    console.log(`⏰ Current Time: ${now.toLocaleString()}`);
    console.log(`📈 Market Status: ${marketOpen ? '🟢 OPEN' : '🔴 CLOSED'}`);

    if (!marketOpen) {
      const timeUntilOpen = getTimeUntilMarketOpen();
      console.log(`⏳ Next Market Open: ${formatTime(timeUntilOpen)}`);
    }

    // Check AI Trading Status
    const response = await fetch(`${API_BASE}/ai-trading`);
    const aiStatus = await response.json();

    console.log('\n🧠 AI Trading Engine');
    console.log('-' .repeat(30));
    console.log(`Status: ${aiStatus.running ? '🟢 RUNNING' : '🔴 STOPPED'}`);

    if (aiStatus.running && aiStatus.session) {
      const session = aiStatus.session;
      const startTime = new Date(session.startTime);
      const runtime = Date.now() - startTime.getTime();

      console.log(`Session ID: ${session.sessionId}`);
      console.log(`Runtime: ${formatTime(runtime)}`);
      console.log(`Trades Executed: ${session.tradesExecuted}`);
      console.log(`Total P&L: $${session.totalPnL.toFixed(2)}`);
      console.log(`AI Predictions: ${session.aiPredictions}`);
      console.log(`Successful Predictions: ${session.successfulPredictions}`);

      if (session.aiPredictions > 0) {
        const accuracy = (session.successfulPredictions / session.aiPredictions * 100).toFixed(1);
        console.log(`Accuracy: ${accuracy}%`);
      }
    }

    // Trading Activity Status
    console.log('\n⚡ Trading Activity');
    console.log('-' .repeat(30));

    if (!aiStatus.running) {
      console.log('❌ AI Engine not running');
    } else if (!marketOpen) {
      console.log('💤 AI Active but market closed - no trading');
      console.log('🔄 AI will resume trading when market opens');
    } else {
      console.log('✅ AI Active and market open - trading enabled');
      console.log('📊 Monitoring 45 symbols for opportunities');
      console.log('🎯 75% minimum confidence threshold');
    }

    // Watchlist Status
    if (aiStatus.running && aiStatus.marketDataStatus) {
      const symbols = aiStatus.marketDataStatus.slice(0, 5); // Show first 5
      console.log('\n📋 Watchlist Sample');
      console.log('-' .repeat(30));
      symbols.forEach(symbol => {
        console.log(`${symbol.symbol}: ${symbol.dataPoints} data points`);
      });
      console.log(`... and ${aiStatus.marketDataStatus.length - 5} more symbols`);
    }

  } catch (error) {
    console.error('❌ Monitor Error:', error.message);
    console.log('💡 Make sure the AI trading server is running on localhost:3005');
  }
}

// Run the monitor
monitorAI();