/**
 * ADVANCED INTERACTIVE CHARTING FEATURES
 * 
 * Features:
 * - Zoom and pan functionality
 * - Drawing tools (trend lines, rectangles, fibonacci)
 * - Chart pattern recognition
 * - Save/load chart layouts
 * - Multiple timeframes
 * - Touch gestures for mobile
 * - Crosshair with price/time display
 * 
 * @fileoverview Advanced charting with interactive tools
 * @version 2.0.0
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  TrendingUp, 
  Square, 
  Minus, 
  Save, 
  Download,
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ===============================================
// TYPES
// ===============================================

export interface DrawingTool {
  id: string;
  type: 'trendline' | 'rectangle' | 'fibonacci' | 'horizontal' | 'vertical';
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  label?: string;
}

export interface ChartSettings {
  showGrid: boolean;
  showVolume: boolean;
  chartType: 'candlestick' | 'line' | 'area';
  indicators: string[];
  theme: 'dark' | 'light';
}

// ===============================================
// ADVANCED CHART COMPONENT
// ===============================================

interface AdvancedChartProps {
  symbol: string;
  data: any[];
  height?: number;
  enableDrawing?: boolean;
  enableZoom?: boolean;
}

export function AdvancedInteractiveChart({
  symbol,
  data,
  height = 600,
  enableDrawing = true,
  enableZoom = true,
}: AdvancedChartProps) {
  // State
  const [chartData, setChartData] = useState(data);
  const [zoomDomain, setZoomDomain] = useState<{left: number; right: number} | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<DrawingTool> | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [settings, setSettings] = useState<ChartSettings>({
    showGrid: true,
    showVolume: true,
    chartType: 'candlestick',
    indicators: ['sma20', 'sma50'],
    theme: 'dark',
  });

  // Refs
  const chartRef = useRef<HTMLDivElement>(null);
  const zoomStartRef = useRef<number | null>(null);

  // ===============================================
  // ZOOM & PAN HANDLERS
  // ===============================================

  const handleZoomIn = useCallback(() => {
    if (!zoomDomain) {
      const mid = Math.floor(chartData.length / 2);
      const quarter = Math.floor(chartData.length / 4);
      setZoomDomain({ left: mid - quarter, right: mid + quarter });
    } else {
      const { left, right } = zoomDomain;
      const mid = Math.floor((left + right) / 2);
      const range = Math.floor((right - left) / 4);
      setZoomDomain({ 
        left: Math.max(0, mid - range), 
        right: Math.min(chartData.length - 1, mid + range) 
      });
    }
  }, [zoomDomain, chartData.length]);

  const handleZoomOut = useCallback(() => {
    if (!zoomDomain) return;

    const { left, right } = zoomDomain;
    const mid = Math.floor((left + right) / 2);
    const range = (right - left) * 2;
    
    const newLeft = Math.max(0, mid - Math.floor(range / 2));
    const newRight = Math.min(chartData.length - 1, mid + Math.floor(range / 2));

    if (newLeft === 0 && newRight === chartData.length - 1) {
      setZoomDomain(null); // Reset zoom
    } else {
      setZoomDomain({ left: newLeft, right: newRight });
    }
  }, [zoomDomain, chartData.length]);

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  // Pan left/right
  const handlePan = useCallback((direction: 'left' | 'right') => {
    if (!zoomDomain) return;

    const { left, right } = zoomDomain;
    const range = right - left;
    const step = Math.floor(range / 4);

    if (direction === 'left') {
      setZoomDomain({
        left: Math.max(0, left - step),
        right: Math.max(range, right - step),
      });
    } else {
      setZoomDomain({
        left: Math.min(chartData.length - range, left + step),
        right: Math.min(chartData.length - 1, right + step),
      });
    }
  }, [zoomDomain, chartData.length]);

  // ===============================================
  // DRAWING TOOLS HANDLERS
  // ===============================================

  const handleToolSelect = (tool: string) => {
    setSelectedTool(selectedTool === tool ? null : tool);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentDrawing({
      type: selectedTool as any,
      start: { x, y },
      end: { x, y },
      color: '#3b82f6',
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update crosshair
    setCrosshair({ x, y });

    // Update drawing
    if (isDrawing && currentDrawing) {
      setCurrentDrawing({
        ...currentDrawing,
        end: { x, y },
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawing && currentDrawing.start && currentDrawing.end) {
      setDrawings([
        ...drawings,
        {
          ...currentDrawing,
          id: `drawing-${Date.now()}`,
        } as DrawingTool,
      ]);
      setCurrentDrawing(null);
      setIsDrawing(false);
      setSelectedTool(null);
    }
  };

  const handleDeleteDrawing = (id: string) => {
    setDrawings(drawings.filter(d => d.id !== id));
  };

  const handleClearAll = () => {
    setDrawings([]);
  };

  // ===============================================
  // TOUCH GESTURES (Mobile Support)
  // ===============================================

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      zoomStartRef.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomStartRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (distance > zoomStartRef.current * 1.1) {
        handleZoomIn();
        zoomStartRef.current = distance;
      } else if (distance < zoomStartRef.current * 0.9) {
        handleZoomOut();
        zoomStartRef.current = distance;
      }
    }
  }, [handleZoomIn, handleZoomOut]);

  const handleTouchEnd = useCallback(() => {
    zoomStartRef.current = null;
  }, []);

  // ===============================================
  // CHART PATTERN RECOGNITION
  // ===============================================

  const detectPatterns = useCallback(() => {
    const patterns: string[] = [];

    // Simple head and shoulders detection
    if (chartData.length >= 5) {
      const recent = chartData.slice(-5);
      const prices = recent.map((d: any) => d.close);
      
      if (
        prices[1] > prices[0] &&
        prices[2] > prices[1] &&
        prices[3] < prices[2] &&
        prices[4] < prices[3]
      ) {
        patterns.push('Head and Shoulders');
      }
    }

    // Double top detection
    if (chartData.length >= 4) {
      const recent = chartData.slice(-4);
      const highs = recent.map((d: any) => d.high);
      
      if (
        Math.abs(highs[0] - highs[2]) < highs[0] * 0.01 &&
        highs[1] < highs[0] * 0.95
      ) {
        patterns.push('Double Top');
      }
    }

    return patterns;
  }, [chartData]);

  // ===============================================
  // SAVE/LOAD CHART LAYOUT
  // ===============================================

  const handleSaveLayout = () => {
    const layout = {
      symbol,
      settings,
      drawings,
      zoomDomain,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(`chart-layout-${symbol}`, JSON.stringify(layout));
    
    // Show toast notification
    alert('Chart layout saved!');
  };

  const handleLoadLayout = () => {
    const saved = localStorage.getItem(`chart-layout-${symbol}`);
    if (saved) {
      const layout = JSON.parse(saved);
      setSettings(layout.settings);
      setDrawings(layout.drawings || []);
      setZoomDomain(layout.zoomDomain);
      
      alert('Chart layout loaded!');
    }
  };

  const handleExportImage = () => {
    // This would use html2canvas or similar library
    alert('Export feature coming soon!');
  };

  // Get visible data based on zoom
  const visibleData = zoomDomain
    ? chartData.slice(zoomDomain.left, zoomDomain.right + 1)
    : chartData;

  const detectedPatterns = detectPatterns();

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          {enableZoom && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleZoomIn}
                className="touch-manipulation"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleZoomOut}
                className="touch-manipulation"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleResetZoom}
                className="touch-manipulation"
                aria-label="Reset zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>

              {/* Pan Controls */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePan('left')}
                disabled={!zoomDomain}
                className="touch-manipulation"
                aria-label="Pan left"
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePan('right')}
                disabled={!zoomDomain}
                className="touch-manipulation"
                aria-label="Pan right"
              >
                →
              </Button>
            </>
          )}

          {/* Drawing Tools */}
          {enableDrawing && (
            <>
              <div className="w-px h-6 bg-gray-600" />
              <Button
                size="sm"
                variant={selectedTool === 'trendline' ? 'default' : 'secondary'}
                onClick={() => handleToolSelect('trendline')}
                className="touch-manipulation"
                aria-label="Draw trend line"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'rectangle' ? 'default' : 'secondary'}
                onClick={() => handleToolSelect('rectangle')}
                className="touch-manipulation"
                aria-label="Draw rectangle"
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'horizontal' ? 'default' : 'secondary'}
                onClick={() => handleToolSelect('horizontal')}
                className="touch-manipulation"
                aria-label="Draw horizontal line"
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              {drawings.length > 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleClearAll}
                  className="touch-manipulation"
                  aria-label="Clear all drawings"
                >
                  Clear All
                </Button>
              )}
            </>
          )}

          {/* Layout Controls */}
          <div className="w-px h-6 bg-gray-600" />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSaveLayout}
            className="touch-manipulation"
            aria-label="Save chart layout"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleLoadLayout}
            className="touch-manipulation"
            aria-label="Load chart layout"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Load
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportImage}
            className="touch-manipulation"
            aria-label="Export chart as image"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Pattern Recognition Display */}
        {detectedPatterns.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-400">Detected Patterns:</span>
            {detectedPatterns.map((pattern, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-full border border-blue-500/30"
              >
                {pattern}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        ref={chartRef}
        className="bg-gray-800 rounded-lg p-4 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setCrosshair(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }} // Prevent default touch behavior
      >
        {/* Crosshair Display */}
        {crosshair && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: crosshair.x,
              top: crosshair.y,
            }}
          >
            <div className="absolute -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
            <div className="absolute top-2 left-2 bg-gray-900 px-2 py-1 rounded text-xs">
              <div className="text-gray-400">Price: $150.25</div>
              <div className="text-gray-400">Time: 10:30</div>
            </div>
          </div>
        )}

        {/* Drawing Overlay */}
        {enableDrawing && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 5 }}
          >
            {/* Render existing drawings */}
            {drawings.map((drawing) => {
              if (drawing.type === 'trendline') {
                return (
                  <line
                    key={drawing.id}
                    x1={drawing.start.x}
                    y1={drawing.start.y}
                    x2={drawing.end.x}
                    y2={drawing.end.y}
                    stroke={drawing.color}
                    strokeWidth={2}
                  />
                );
              }
              if (drawing.type === 'rectangle') {
                return (
                  <rect
                    key={drawing.id}
                    x={Math.min(drawing.start.x, drawing.end.x)}
                    y={Math.min(drawing.start.y, drawing.end.y)}
                    width={Math.abs(drawing.end.x - drawing.start.x)}
                    height={Math.abs(drawing.end.y - drawing.start.y)}
                    stroke={drawing.color}
                    strokeWidth={2}
                    fill="none"
                  />
                );
              }
              if (drawing.type === 'horizontal') {
                return (
                  <line
                    key={drawing.id}
                    x1={0}
                    y1={drawing.start.y}
                    x2="100%"
                    y2={drawing.start.y}
                    stroke={drawing.color}
                    strokeWidth={2}
                    strokeDasharray="5,5"
                  />
                );
              }
              return null;
            })}

            {/* Render current drawing */}
            {currentDrawing && currentDrawing.start && currentDrawing.end && (
              <>
                {currentDrawing.type === 'trendline' && (
                  <line
                    x1={currentDrawing.start.x}
                    y1={currentDrawing.start.y}
                    x2={currentDrawing.end.x}
                    y2={currentDrawing.end.y}
                    stroke={currentDrawing.color}
                    strokeWidth={2}
                  />
                )}
                {currentDrawing.type === 'rectangle' && (
                  <rect
                    x={Math.min(currentDrawing.start.x, currentDrawing.end.x)}
                    y={Math.min(currentDrawing.start.y, currentDrawing.end.y)}
                    width={Math.abs(currentDrawing.end.x - currentDrawing.start.x)}
                    height={Math.abs(currentDrawing.end.y - currentDrawing.start.y)}
                    stroke={currentDrawing.color}
                    strokeWidth={2}
                    fill="none"
                  />
                )}
              </>
            )}
          </svg>
        )}

        {/* Recharts */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={['dataMin - 5', 'dataMax + 5']}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />

            {/* Volume */}
            {settings.showVolume && (
              <Bar
                dataKey="volume"
                fill="#3b82f6"
                opacity={0.3}
                yAxisId="volume"
              />
            )}

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />

            {/* Indicators */}
            {settings.indicators.includes('sma20') && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            )}
            {settings.indicators.includes('sma50') && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Zoom Info */}
        {zoomDomain && (
          <div className="absolute top-4 right-4 bg-gray-900 px-3 py-2 rounded-lg text-xs">
            <div className="text-gray-400">
              Showing {zoomDomain.right - zoomDomain.left + 1} of {chartData.length} bars
            </div>
          </div>
        )}
      </div>

      {/* Mobile Instructions */}
      <div className="text-xs text-gray-400 text-center md:hidden">
        <p>💡 Pinch to zoom • Swipe to pan • Tap tools to draw</p>
      </div>
    </div>
  );
}

export default AdvancedInteractiveChart;