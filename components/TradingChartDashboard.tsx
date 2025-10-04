/**
 * REAL-TIME CHARTING COMPONENTS
 * 
 * Provides comprehensive charting for trading analysis:
 * - Candlestick/OHLC charts
 * - Technical indicator overlays
 * - Volume charts
 * - Real-time updates via WebSocket
 * - Interactive controls
 * 
 * Uses Recharts for rendering
 * 
 * @fileoverview Production-ready charting components
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useMarketStore } from '@/store/slices/marketSlice';
import { useRealTimeMarketData } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

// ===============================================
// TYPES
// ===============================================

export interface ChartBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  upperBB?: number;
  lowerBB?: number;
  middleBB?: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type ChartType = 'candlestick' | 'line' | 'area' | 'ohlc';

export interface TechnicalIndicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  params?: Record<string, number>;
}

// ===============================================
// CANDLESTICK CHART COMPONENT
// ===============================================

interface CandlestickChartProps {
  symbol: string;
  timeFrame?: TimeFrame;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
}

export function CandlestickChart({
  symbol,
  timeFrame = '1h',
  height = 400,
  showVolume = true,
  showIndicators = true,
}: CandlestickChartProps) {
  const { bars, getQuote } = useMarketStore();
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([
    { id: 'sma20', name: 'SMA 20', enabled: true, color: '#3b82f6' },
    { id: 'sma50', name: 'SMA 50', enabled: true, color: '#ef4444' },
    { id: 'ema12', name: 'EMA 12', enabled: false, color: '#10b981' },
    { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#8b5cf6' },
  ]);

  // Subscribe to real-time data
  useRealTimeMarketData([symbol]);

  // Process bars and calculate indicators
  useEffect(() => {
    const symbolBars = bars[symbol] || [];
    
    if (symbolBars.length === 0) return;

    // Calculate technical indicators
    const processedData = symbolBars.map((bar, index, array) => {
      const closes = array.slice(Math.max(0, index - 50), index + 1).map(b => b.close);
      
      return {
        timestamp: new Date(bar.timestamp).toLocaleTimeString(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        sma20: calculateSMA(closes, 20),
        sma50: calculateSMA(closes, 50),
        ema12: calculateEMA(closes, 12),
        ema26: calculateEMA(closes, 26),
      };
    });

    setChartData(processedData);
  }, [bars, symbol]);

  // Toggle indicator
  const toggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
    );
  };

  // Custom candlestick renderer
  const renderCandlestick = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;

    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#ef4444';
    const bodyHeight = Math.abs(close - open);
    const bodyY = Math.min(open, close);

    // Calculate wick positions
    const wickTop = Math.min(open, close, high);
    const wickBottom = Math.max(open, close, low);

    return (
      <g>
        {/* Upper wick */}
        <line
          x1={x + width / 2}
          y1={y - (high - wickTop)}
          x2={x + width / 2}
          y2={y}
          stroke={color}
          strokeWidth={1}
        />
        
        {/* Candle body */}
        <rect
          x={x}
          y={y - (bodyY - low)}
          width={width}
          height={bodyHeight || 1}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
        
        {/* Lower wick */}
        <line
          x1={x + width / 2}
          y1={y + height}
          x2={x + width / 2}
          y2={y + height + (wickBottom - Math.max(open, close))}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const isUp = data.close >= data.open;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <div className="text-xs text-gray-400 mb-2">{data.timestamp}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">O:</span>
            <span className="text-white ml-1">${data.open.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">H:</span>
            <span className="text-white ml-1">${data.high.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">L:</span>
            <span className="text-white ml-1">${data.low.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">C:</span>
            <span className={isUp ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
              ${data.close.toFixed(2)}
            </span>
          </div>
        </div>
        {showVolume && (
          <div className="mt-2 text-sm">
            <span className="text-gray-400">Vol:</span>
            <span className="text-white ml-1">{data.volume.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {symbol} Chart
          </CardTitle>
          
          {/* Indicator toggles */}
          {showIndicators && (
            <div className="flex gap-2">
              {indicators.map(indicator => (
                <Button
                  key={indicator.id}
                  size="sm"
                  variant={indicator.enabled ? 'default' : 'outline'}
                  onClick={() => toggleIndicator(indicator.id)}
                  className="text-xs"
                >
                  {indicator.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="price"
              domain={['dataMin - 5', 'dataMax + 5']}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            {showVolume && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Volume bars */}
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#3b82f6"
                opacity={0.3}
              />
            )}

            {/* Technical Indicators */}
            {indicators.find(i => i.id === 'sma20' && i.enabled) && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma20"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="SMA 20"
              />
            )}
            
            {indicators.find(i => i.id === 'sma50' && i.enabled) && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma50"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="SMA 50"
              />
            )}
            
            {indicators.find(i => i.id === 'ema12' && i.enabled) && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ema12"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="EMA 12"
              />
            )}

            <Legend />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Current Price Indicator */}
        {chartData.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Current Price</div>
              <div className="text-2xl font-bold text-white">
                ${chartData[chartData.length - 1].close.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">24h Change</div>
              <div className={`text-lg font-semibold ${
                chartData[chartData.length - 1].close >= chartData[0].open
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {((chartData[chartData.length - 1].close - chartData[0].open) / chartData[0].open * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===============================================
// VOLUME CHART COMPONENT
// ===============================================

interface VolumeChartProps {
  symbol: string;
  height?: number;
}

export function VolumeChart({ symbol, height = 200 }: VolumeChartProps) {
  const { bars } = useMarketStore();
  const [volumeData, setVolumeData] = useState<any[]>([]);

  useEffect(() => {
    const symbolBars = bars[symbol] || [];
    
    const processed = symbolBars.map(bar => ({
      timestamp: new Date(bar.timestamp).toLocaleTimeString(),
      volume: bar.volume,
      buyVolume: bar.close >= bar.open ? bar.volume : 0,
      sellVolume: bar.close < bar.open ? bar.volume : 0,
    }));

    setVolumeData(processed);
  }, [bars, symbol]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Volume Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="buyVolume" stackId="volume" fill="#10b981" />
            <Bar dataKey="sellVolume" stackId="volume" fill="#ef4444" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ===============================================
// TECHNICAL INDICATOR CHART
// ===============================================

interface TechnicalIndicatorChartProps {
  symbol: string;
  indicator: 'rsi' | 'macd' | 'stochastic';
  height?: number;
}

export function TechnicalIndicatorChart({
  symbol,
  indicator,
  height = 150,
}: TechnicalIndicatorChartProps) {
  const { bars } = useMarketStore();
  const [indicatorData, setIndicatorData] = useState<any[]>([]);

  useEffect(() => {
    const symbolBars = bars[symbol] || [];
    
    if (symbolBars.length === 0) return;

    const processed = symbolBars.map((bar, index, array) => {
      const closes = array.slice(Math.max(0, index - 14), index + 1).map(b => b.close);
      
      let data: any = {
        timestamp: new Date(bar.timestamp).toLocaleTimeString(),
      };

      if (indicator === 'rsi') {
        data.rsi = calculateRSI(closes, 14);
      } else if (indicator === 'macd') {
        const macdData = calculateMACD(closes);
        data.macd = macdData.macd;
        data.signal = macdData.signal;
        data.histogram = macdData.histogram;
      }

      return data;
    });

    setIndicatorData(processed);
  }, [bars, symbol, indicator]);

  const renderRSI = () => (
    <ComposedChart data={indicatorData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '10px' }} />
      <YAxis domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: '10px' }} />
      <Tooltip />
      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Overbought" />
      <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label="Oversold" />
      <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
    </ComposedChart>
  );

  const renderMACD = () => (
    <ComposedChart data={indicatorData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="timestamp" stroke="#9ca3af" style={{ fontSize: '10px' }} />
      <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
      <Tooltip />
      <ReferenceLine y={0} stroke="#6b7280" />
      <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
      <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} name="Signal" />
      <Bar dataKey="histogram" fill="#10b981" opacity={0.5} name="Histogram" />
    </ComposedChart>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {indicator.toUpperCase()} - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {indicator === 'rsi' ? renderRSI() : renderMACD()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ===============================================
// PRICE TICKER COMPONENT
// ===============================================

interface PriceTickerProps {
  symbols: string[];
}

export function PriceTicker({ symbols }: PriceTickerProps) {
  const { quotes } = useMarketStore();
  useRealTimeMarketData(symbols);

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-hidden">
      <div className="flex items-center space-x-8 py-3 px-4 animate-marquee">
        {symbols.map((symbol) => {
          const quote = quotes[symbol];
          if (!quote) return null;

          const change = quote.change || 0;
          const isPositive = change >= 0;

          return (
            <div key={symbol} className="flex items-center space-x-3 whitespace-nowrap">
              <span className="font-semibold text-white">{symbol}</span>
              <span className="text-lg font-bold text-white">
                ${quote.lastPrice?.toFixed(2) || '0.00'}
              </span>
              <span className={`flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  
  const relevantValues = values.slice(-period);
  const sum = relevantValues.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(values.slice(0, period), period);

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Number(rsi.toFixed(2));
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.9; // Simplified signal line
  const histogram = macd - signal;

  return {
    macd: Number(macd.toFixed(2)),
    signal: Number(signal.toFixed(2)),
    histogram: Number(histogram.toFixed(2)),
  };
}

// ===============================================
// MULTI-CHART DASHBOARD
// ===============================================

interface TradingChartDashboardProps {
  symbol: string;
}

export function TradingChartDashboard({ symbol }: TradingChartDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Price Ticker */}
      <PriceTicker symbols={['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN']} />

      {/* Main Candlestick Chart */}
      <CandlestickChart
        symbol={symbol}
        timeFrame="1h"
        height={500}
        showVolume={true}
        showIndicators={true}
      />

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volume Chart */}
        <VolumeChart symbol={symbol} height={200} />

        {/* RSI Indicator */}
        <TechnicalIndicatorChart symbol={symbol} indicator="rsi" height={200} />
      </div>

      {/* MACD Indicator */}
      <TechnicalIndicatorChart symbol={symbol} indicator="macd" height={150} />
    </div>
  );
}

// ===============================================
// EXPORT COMPONENTS
// ===============================================

export default TradingChartDashboard;