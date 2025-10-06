// import * as Sentry from '@sentry/nextjs';

// // ===============================================
// // CUSTOM LOGGER SERVICE
// // lib/monitoring/logger.ts
// // ===============================================

// export enum LogLevel {
//   DEBUG = 'debug',
//   INFO = 'info',
//   WARN = 'warn',
//   ERROR = 'error',
//   CRITICAL = 'critical',
// }

// export interface LogEntry {
//   level: LogLevel;
//   message: string;
//   timestamp: Date;
//   context?: Record<string, any>;
//   userId?: string;
//   sessionId?: string;
//   traceId?: string;
// }

// class Logger {
//   private queue: LogEntry[] = [];
//   private flushInterval: NodeJS.Timeout | null = null;
//   private readonly MAX_QUEUE_SIZE = 100;
//   private readonly FLUSH_INTERVAL = 30000; // 30 seconds

//   constructor() {
//     if (typeof window !== 'undefined') {
//       this.startFlushInterval();
//     }
//   }

//   private startFlushInterval() {
//     this.flushInterval = setInterval(() => {
//       this.flush();
//     }, this.FLUSH_INTERVAL);
//   }

//   private async flush() {
//     if (this.queue.length === 0) return;

//     const logsToSend = [...this.queue];
//     this.queue = [];

//     try {
//       await fetch('/api/logs', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ logs: logsToSend }),
//       });
//     } catch (error) {
//       console.error('Failed to send logs:', error);
//       // Re-queue if send failed
//       this.queue.unshift(...logsToSend);
//     }
//   }

//   private log(level: LogLevel, message: string, context?: Record<string, any>) {
//     const entry: LogEntry = {
//       level,
//       message,
//       timestamp: new Date(),
//       context,
//       userId: this.getUserId(),
//       sessionId: this.getSessionId(),
//       traceId: this.getTraceId(),
//     };

//     // Console output in development
//     if (process.env.NODE_ENV === 'development') {
//       const consoleMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL
//         ? console.error
//         : level === LogLevel.WARN
//         ? console.warn
//         : console.log;

//       consoleMethod(`[${level.toUpperCase()}] ${message}`, context || '');
//     }

//     // Add to queue
//     this.queue.push(entry);

//     // Flush immediately for critical errors
//     if (level === LogLevel.CRITICAL || level === LogLevel.ERROR) {
//       this.flush();
//     }

//     // Flush if queue is full
//     if (this.queue.length >= this.MAX_QUEUE_SIZE) {
//       this.flush();
//     }

//     // Send to Sentry for errors
//     if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
//       Sentry.captureMessage(message, {
//         level: level === LogLevel.CRITICAL ? 'fatal' : 'error',
//         extra: context,
//       });
//     }
//   }

//   debug(message: string, context?: Record<string, any>) {
//     this.log(LogLevel.DEBUG, message, context);
//   }

//   info(message: string, context?: Record<string, any>) {
//     this.log(LogLevel.INFO, message, context);
//   }

//   warn(message: string, context?: Record<string, any>) {
//     this.log(LogLevel.WARN, message, context);
//   }

//   error(message: string, context?: Record<string, any>) {
//     this.log(LogLevel.ERROR, message, context);
//   }

//   critical(message: string, context?: Record<string, any>) {
//     this.log(LogLevel.CRITICAL, message, context);
//   }

//   // Trading-specific logging
//   logTrade(tradeData: {
//     symbol: string;
//     side: 'buy' | 'sell';
//     quantity: number;
//     price: number;
//     status: string;
//   }) {
//     this.info('Trade executed', {
//       category: 'trading',
//       ...tradeData,
//     });
//   }

//   logRecommendation(recommendation: {
//     symbol: string;
//     action: string;
//     confidence: number;
//   }) {
//     this.info('AI recommendation generated', {
//       category: 'ai',
//       ...recommendation,
//     });
//   }

//   logRiskEvent(event: {
//     type: string;
//     severity: string;
//     details: any;
//   }) {
//     this.warn('Risk event detected', {
//       category: 'risk',
//       ...event,
//     });
//   }

//   private getUserId(): string | undefined {
//     // Get from auth context or localStorage
//     return typeof window !== 'undefined'
//       ? localStorage.getItem('userId') || undefined
//       : undefined;
//   }

//   private getSessionId(): string | undefined {
//     // Get or create session ID
//     if (typeof window !== 'undefined') {
//       let sessionId = sessionStorage.getItem('sessionId');
//       if (!sessionId) {
//         sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//         sessionStorage.setItem('sessionId', sessionId);
//       }
//       return sessionId;
//     }
//     return undefined;
//   }

//   private getTraceId(): string {
//     return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//   }
// }

// export const logger = new Logger();
