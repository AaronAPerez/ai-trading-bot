/**
 * Accessible Bot Control Panel Component
 *
 * Features:
 * - Form validation with inline error messages
 * - Keyboard navigation through controls
 * - Screen reader friendly labels and descriptions
 * - Touch-optimized sliders and inputs
 * - Loading states with accessible feedback
 * - Success/error announcements
 */

import React, { useState, useCallback } from 'react'

interface BotConfig {
  mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  minimumConfidence: number;
  autoExecute: boolean;
}

interface BotControlPanelProps {
  status: 'stopped' | 'running' | 'paused';
  config: BotConfig;
  onStart: (config: BotConfig) => Promise<void>;
  onStop: () => Promise<void>;
  onConfigChange: (config: BotConfig) => void;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  status,
  config,
  onStart,
  onStop,
  onConfigChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Announce to screen reader
  const announce = (message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 100);
  };

  // Validate configuration
  const validateConfig = (cfg: BotConfig): boolean => {
    const errors: Record<string, string> = {};

    if (cfg.maxPositionSize < 1 || cfg.maxPositionSize > 100) {
      errors.maxPositionSize = 'Position size must be between 1 and 100';
    }
    if (cfg.stopLossPercent < 1 || cfg.stopLossPercent > 50) {
      errors.stopLossPercent = 'Stop loss must be between 1% and 50%';
    }
    if (cfg.takeProfitPercent < 1 || cfg.takeProfitPercent > 100) {
      errors.takeProfitPercent = 'Take profit must be between 1% and 100%';
    }
    if (cfg.minimumConfidence < 50 || cfg.minimumConfidence > 100) {
      errors.minimumConfidence = 'Confidence must be between 50% and 100%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle start bot
  const handleStart = async () => {
    if (!validateConfig(config)) {
      announce('Configuration validation failed. Please fix errors before starting.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onStart(config);
      announce('Bot started successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start bot';
      setError(errorMsg);
      announce(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle stop bot
  const handleStop = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await onStop();
      announce('Bot stopped successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop bot';
      setError(errorMsg);
      announce(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle config change with validation
  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    onConfigChange(newConfig);
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border-2 border-gray-700 overflow-hidden">
      {/* Live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-6 py-4 border-b-2 border-gray-700">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center">
          <span className="text-2xl mr-3" aria-hidden="true">🎮</span>
          Bot Control Panel
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Configure and control your AI trading bot
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4 flex items-start space-x-3"
          >
            <span className="text-2xl flex-shrink-0" aria-hidden="true">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-200">Error</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Bot Status Display */}
        <div
          className={`rounded-lg p-4 border-2 ${
            status === 'running'
              ? 'bg-green-900/30 border-green-500'
              : status === 'paused'
              ? 'bg-yellow-900/30 border-yellow-500'
              : 'bg-gray-700/50 border-gray-600'
          }`}
          role="status"
          aria-label={`Bot is currently ${status}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  status === 'running'
                    ? 'bg-green-400 animate-pulse'
                    : status === 'paused'
                    ? 'bg-yellow-400'
                    : 'bg-gray-400'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="font-semibold text-white">
                  Status:{' '}
                  <span
                    className={
                      status === 'running'
                        ? 'text-green-300'
                        : status === 'paused'
                        ? 'text-yellow-300'
                        : 'text-gray-300'
                    }
                  >
                    {status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {status === 'running' && 'Bot is actively monitoring markets'}
                  {status === 'paused' && 'Bot is paused and not trading'}
                  {status === 'stopped' && 'Bot is not running'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <fieldset className="space-y-6" disabled={isLoading}>
          <legend className="text-lg font-semibold text-white mb-4">
            Configuration
          </legend>

          {/* Trading Mode */}
          <div>
            <label
              htmlFor="trading-mode"
              className="block text-sm font-medium text-gray-300 mb-3"
            >
              Trading Mode
              <span className="text-red-400 ml-1" aria-label="required">*</span>
            </label>
            <div
              role="radiogroup"
              aria-labelledby="trading-mode"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 min-h-[56px] touch-manipulation ${
                    config.mode === mode
                      ? 'bg-blue-900/50 border-blue-500 ring-2 ring-blue-400'
                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={mode}
                    checked={config.mode === mode}
                    onChange={(e) => handleConfigChange('mode', e.target.value)}
                    className="sr-only"
                    aria-label={`${mode} trading mode`}
                  />
                  <span className="font-semibold text-white">{mode}</span>
                  {config.mode === mode && (
                    <span className="absolute top-2 right-2 text-blue-400" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Max Position Size Slider */}
          <div>
            <label
              htmlFor="max-position-size"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Maximum Position Size: ${config.maxPositionSize.toFixed(0)}
              <span className="text-red-400 ml-1" aria-label="required">*</span>
            </label>
            <input
              type="range"
              id="max-position-size"
              min="1"
              max="100"
              step="1"
              value={config.maxPositionSize}
              onChange={(e) =>
                handleConfigChange('maxPositionSize', parseInt(e.target.value))
              }
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-describedby={validationErrors.maxPositionSize ? 'max-position-error' : 'max-position-desc'}
              aria-invalid={!!validationErrors.maxPositionSize}
            />
            {validationErrors.maxPositionSize ? (
              <p id="max-position-error" role="alert" className="mt-2 text-sm text-red-400">
                {validationErrors.maxPositionSize}
              </p>
            ) : (
              <p id="max-position-desc" className="mt-2 text-sm text-gray-400">
                Maximum dollar amount per position
              </p>
            )}
          </div>

          {/* Stop Loss Percentage */}
          <div>
            <label
              htmlFor="stop-loss"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Stop Loss: {config.stopLossPercent}%
              <span className="text-red-400 ml-1" aria-label="required">*</span>
            </label>
            <input
              type="range"
              id="stop-loss"
              min="1"
              max="50"
              step="0.5"
              value={config.stopLossPercent}
              onChange={(e) =>
                handleConfigChange('stopLossPercent', parseFloat(e.target.value))
              }
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-describedby={validationErrors.stopLossPercent ? 'stop-loss-error' : 'stop-loss-desc'}
              aria-invalid={!!validationErrors.stopLossPercent}
            />
            {validationErrors.stopLossPercent ? (
              <p id="stop-loss-error" role="alert" className="mt-2 text-sm text-red-400">
                {validationErrors.stopLossPercent}
              </p>
            ) : (
              <p id="stop-loss-desc" className="mt-2 text-sm text-gray-400">
                Automatically sell when position loses this percentage
              </p>
            )}
          </div>

          {/* Take Profit Percentage */}
          <div>
            <label
              htmlFor="take-profit"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Take Profit: {config.takeProfitPercent}%
              <span className="text-red-400 ml-1" aria-label="required">*</span>
            </label>
            <input
              type="range"
              id="take-profit"
              min="1"
              max="100"
              step="1"
              value={config.takeProfitPercent}
              onChange={(e) =>
                handleConfigChange('takeProfitPercent', parseFloat(e.target.value))
              }
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-describedby={validationErrors.takeProfitPercent ? 'take-profit-error' : 'take-profit-desc'}
              aria-invalid={!!validationErrors.takeProfitPercent}
            />
            {validationErrors.takeProfitPercent ? (
              <p id="take-profit-error" role="alert" className="mt-2 text-sm text-red-400">
                {validationErrors.takeProfitPercent}
              </p>
            ) : (
              <p id="take-profit-desc" className="mt-2 text-sm text-gray-400">
                Automatically sell when position gains this percentage
              </p>
            )}
          </div>

          {/* Minimum Confidence */}
          <div>
            <label
              htmlFor="min-confidence"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Minimum AI Confidence: {config.minimumConfidence}%
              <span className="text-red-400 ml-1" aria-label="required">*</span>
            </label>
            <input
              type="range"
              id="min-confidence"
              min="50"
              max="100"
              step="1"
              value={config.minimumConfidence}
              onChange={(e) =>
                handleConfigChange('minimumConfidence', parseInt(e.target.value))
              }
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-describedby={validationErrors.minimumConfidence ? 'min-confidence-error' : 'min-confidence-desc'}
              aria-invalid={!!validationErrors.minimumConfidence}
            />
            {validationErrors.minimumConfidence ? (
              <p id="min-confidence-error" role="alert" className="mt-2 text-sm text-red-400">
                {validationErrors.minimumConfidence}
              </p>
            ) : (
              <p id="min-confidence-desc" className="mt-2 text-sm text-gray-400">
                Only execute trades with AI confidence above this threshold
              </p>
            )}
          </div>

          {/* Auto Execute Toggle */}
          <div className="flex items-start space-x-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <input
              type="checkbox"
              id="auto-execute"
              checked={config.autoExecute}
              onChange={(e) => handleConfigChange('autoExecute', e.target.checked)}
              className="w-5 h-5 mt-0.5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer touch-manipulation"
              aria-describedby="auto-execute-desc"
            />
            <label htmlFor="auto-execute" className="flex-1 cursor-pointer">
              <div className="font-medium text-white">Auto-Execute Trades</div>
              <p id="auto-execute-desc" className="text-sm text-gray-400 mt-1">
                Automatically execute trades when AI recommendations meet confidence threshold.
                When disabled, recommendations require manual approval.
              </p>
            </label>
          </div>
        </fieldset>

        {/* Action Buttons - Touch optimized */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-gray-700">
          {status === 'stopped' ? (
            <button
              onClick={handleStart}
              disabled={isLoading || Object.keys(validationErrors).length > 0}
              className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 min-h-[56px] shadow-lg touch-manipulation"
              aria-label="Start trading bot"
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-xl" aria-hidden="true">⏳</span>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span className="text-xl" aria-hidden="true">▶️</span>
                  <span>Start Bot</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 min-h-[56px] shadow-lg touch-manipulation"
              aria-label="Stop trading bot"
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-xl" aria-hidden="true">⏳</span>
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <span className="text-xl" aria-hidden="true">⏹️</span>
                  <span>Stop Bot</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
