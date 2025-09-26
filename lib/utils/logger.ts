/**
 * Logger Utility
 */

export interface LogLevel {
  DEBUG: 0
  INFO: 1
  WARN: 2
  ERROR: 3
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

export interface LogEntry {
  level: keyof LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private logLevel: number = LOG_LEVELS.INFO
  private logs: LogEntry[] = []
  private maxLogs: number = 1000

  constructor(level?: keyof LogLevel) {
    if (level) {
      this.logLevel = LOG_LEVELS[level]
    }

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL as keyof LogLevel
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      this.logLevel = LOG_LEVELS[envLevel]
    }
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return LOG_LEVELS[level] >= this.logLevel
  }

  private addLog(level: keyof LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error
    }

    this.logs.push(logEntry)

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Output to console in development
    if (process.env.NODE_ENV !== 'production' || this.shouldLog(level)) {
      this.outputToConsole(logEntry)
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    const fullMessage = `[${timestamp}] ${entry.level}: ${entry.message}${contextStr}`

    switch (entry.level) {
      case 'DEBUG':
        console.debug(fullMessage)
        break
      case 'INFO':
        console.info(fullMessage)
        break
      case 'WARN':
        console.warn(fullMessage)
        if (entry.error) console.warn(entry.error)
        break
      case 'ERROR':
        console.error(fullMessage)
        if (entry.error) console.error(entry.error)
        break
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.addLog('DEBUG', message, context)
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('INFO')) {
      this.addLog('INFO', message, context)
    }
  }

  warn(message: string, context?: Record<string, any>, error?: Error): void {
    if (this.shouldLog('WARN')) {
      this.addLog('WARN', message, context, error)
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    if (this.shouldLog('ERROR')) {
      this.addLog('ERROR', message, context, error)
    }
  }

  getLogs(level?: keyof LogLevel): LogEntry[] {
    if (!level) return this.logs

    return this.logs.filter(log => log.level === level)
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count)
  }

  clearLogs(): void {
    this.logs = []
  }

  setLogLevel(level: keyof LogLevel): void {
    this.logLevel = LOG_LEVELS[level]
  }

  getLogLevel(): string {
    const entries = Object.entries(LOG_LEVELS)
    const current = entries.find(([, value]) => value === this.logLevel)
    return current ? current[0] : 'UNKNOWN'
  }

  // Trading-specific logging methods
  trade(message: string, context?: Record<string, any>): void {
    this.info(`[TRADE] ${message}`, context)
  }

  strategy(message: string, context?: Record<string, any>): void {
    this.info(`[STRATEGY] ${message}`, context)
  }

  websocket(message: string, context?: Record<string, any>): void {
    this.debug(`[WEBSOCKET] ${message}`, context)
  }

  api(message: string, context?: Record<string, any>): void {
    this.debug(`[API] ${message}`, context)
  }

  market(message: string, context?: Record<string, any>): void {
    this.debug(`[MARKET] ${message}`, context)
  }

  ai(message: string, context?: Record<string, any>): void {
    this.info(`[AI] ${message}`, context)
  }

  performance(message: string, context?: Record<string, any>): void {
    this.info(`[PERFORMANCE] ${message}`, context)
  }

  security(message: string, context?: Record<string, any>): void {
    this.warn(`[SECURITY] ${message}`, context)
  }
}

// Create singleton instance
export const logger = new Logger()

// Export logger instance as default
export default logger

// Export utility functions for structured logging
export const createLogger = (level?: keyof LogLevel): Logger => {
  return new Logger(level)
}

export const withContext = (baseContext: Record<string, any>) => {
  return {
    debug: (message: string, context?: Record<string, any>) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: Record<string, any>) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: Record<string, any>, error?: Error) =>
      logger.warn(message, { ...baseContext, ...context }, error),
    error: (message: string, context?: Record<string, any>, error?: Error) =>
      logger.error(message, { ...baseContext, ...context }, error)
  }
}

// Performance timing utility
export class Timer {
  private startTime: number
  private label: string

  constructor(label: string) {
    this.label = label
    this.startTime = Date.now()
    logger.debug(`Timer started: ${label}`)
  }

  end(context?: Record<string, any>): number {
    const duration = Date.now() - this.startTime
    logger.performance(`Timer ended: ${this.label} (${duration}ms)`, {
      duration,
      ...context
    })
    return duration
  }

  static time<T>(label: string, fn: () => T): T {
    const timer = new Timer(label)
    try {
      const result = fn()
      timer.end()
      return result
    } catch (error) {
      timer.end({ error: (error as Error).message })
      throw error
    }
  }

  static async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const timer = new Timer(label)
    try {
      const result = await fn()
      timer.end()
      return result
    } catch (error) {
      timer.end({ error: (error as Error).message })
      throw error
    }
  }
}