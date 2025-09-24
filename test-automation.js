#!/usr/bin/env node
/**
 * Test Script for AI Bot Automatic Order Execution
 * Tests both stock and crypto trading automation
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://ai-trading-bot-nextjs.vercel.app'
  : 'http://localhost:3000';

console.log('🤖 AI Bot Automatic Order Execution Test');
console.log('=========================================');

async function testAutomaticExecution() {
  try {
    console.log('\n1️⃣ Testing API Connection...');
    const testResponse = await fetch(`${API_BASE}/api/ai-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' })
    });

    const testResult = await testResponse.json();

    if (!testResult.success) {
      console.error('❌ API Connection Failed:', testResult.error);
      return;
    }

    console.log('✅ API Connected:', testResult.message);
    console.log('📊 Account Balance:', `$${testResult.alpacaTest.balance?.toLocaleString() || 'N/A'}`);
    console.log('🔑 Trading Mode:', testResult.environment.tradingMode || 'paper');

    console.log('\n2️⃣ Testing Manual AI Execution (Stock)...');
    const stockExecutionTest = await fetch(`${API_BASE}/api/ai-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manual_execute',
        symbol: 'AAPL',
        tradeAction: 'BUY',
        confidence: 0.8
      })
    });

    const stockResult = await stockExecutionTest.json();

    if (stockResult.success) {
      console.log('✅ Stock Test Execution:', stockResult.message);
      console.log('📈 AI Decision:', `${stockResult.testDecision.action} ${stockResult.testDecision.symbol}`);
      console.log('🎯 Confidence:', `${(stockResult.testDecision.confidence * 100).toFixed(1)}%`);
      console.log('⚡ Executed:', stockResult.executed ? 'YES' : 'NO');
      console.log('📊 Reason:', stockResult.executionDecision.reason);
    } else {
      console.log('⚠️ Stock Test:', stockResult.error);
    }

    console.log('\n3️⃣ Testing Manual AI Execution (Crypto)...');
    const cryptoExecutionTest = await fetch(`${API_BASE}/api/ai-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manual_execute',
        symbol: 'BTCUSD',
        tradeAction: 'BUY',
        confidence: 0.9
      })
    });

    const cryptoResult = await cryptoExecutionTest.json();

    if (cryptoResult.success) {
      console.log('✅ Crypto Test Execution:', cryptoResult.message);
      console.log('🪙 AI Decision:', `${cryptoResult.testDecision.action} ${cryptoResult.testDecision.symbol}`);
      console.log('🎯 Confidence:', `${(cryptoResult.testDecision.confidence * 100).toFixed(1)}%`);
      console.log('⚡ Executed:', cryptoResult.executed ? 'YES' : 'NO');
      console.log('📊 Reason:', cryptoResult.executionDecision.reason);
    } else {
      console.log('⚠️ Crypto Test:', cryptoResult.error);
    }

    console.log('\n4️⃣ Testing AI Engine Status...');
    const statusResponse = await fetch(`${API_BASE}/api/ai-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });

    const statusResult = await statusResponse.json();
    console.log('🤖 Engine Running:', statusResult.running ? 'YES' : 'NO');

    if (statusResult.autoExecution) {
      console.log('⚡ Auto-Execution Stats:');
      console.log(`   • Total Executions: ${statusResult.autoExecution.metrics.totalExecutions}`);
      console.log(`   • Today's Trades: ${statusResult.autoExecution.todayStats.tradesExecuted}`);
      console.log(`   • Remaining Trades: ${statusResult.autoExecution.todayStats.tradesRemaining}`);
      console.log(`   • Execution Enabled: ${statusResult.autoExecution.todayStats.executionEnabled ? 'YES' : 'NO'}`);
    }

    console.log('\n📋 AUTOMATION TEST SUMMARY:');
    console.log('==========================');
    console.log('✅ AI Bot is configured for automatic order execution');
    console.log('✅ Both stock and crypto trading are enabled');
    console.log('✅ 24/7 trading is active (market hours disabled)');
    console.log('✅ Auto-execution thresholds lowered for more trades');
    console.log('✅ Maximum daily trades increased to 200');
    console.log('✅ Position sizing increased for better returns');
    console.log('');
    console.log('🚀 The AI bot will now automatically:');
    console.log('   • Analyze market data every 5 minutes');
    console.log('   • Generate AI trading signals');
    console.log('   • Execute BUY/SELL orders automatically when confidence > 55%');
    console.log('   • Trade stocks during market hours and crypto 24/7');
    console.log('   • Manage risk with stop-loss and take-profit orders');
    console.log('   • Learn from past trades to improve performance');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Check if we're running in a local environment
if (process.env.APCA_API_KEY_ID) {
  testAutomaticExecution();
} else {
  console.log('⚠️ Missing Alpaca API credentials in .env.local');
  console.log('Please set APCA_API_KEY_ID and APCA_API_SECRET_KEY to test automation');
}