
// // ===============================================
// // PERFORMANCE MONITORING
// // lib/monitoring/performance.ts
// // ===============================================

// import { logger } from "./logger";
// import * as Sentry from '@sentry/nextjs';

// export class PerformanceMonitor {
//   private marks: Map<string, number> = new Map();

//   startMeasure(name: string) {
//     this.marks.set(name, performance.now());
//   }

//   endMeasure(name: string, metadata?: Record<string, any>) {
//     const startTime = this.marks.get(name);
//     if (!startTime) {
//       logger.warn(`No start mark found for: ${name}`);
//       return;
//     }

//     const duration = performance.now() - startTime;
//     this.marks.delete(name);

//     // Log performance metrics
//     logger.info(`Performance: ${name}`, {
//       duration,
//       ...metadata,
//     });

//     // Send to Sentry
//     Sentry.addBreadcrumb({
//       category: 'performance',
//       message: name,
//       level: 'info',
//       data: { duration, ...metadata },
//     });

//     // Track slow operations
//     if (duration > 1000) {
//       logger.warn(`Slow operation detected: ${name}`, {
//         duration,
//         threshold: 1000,
//         ...metadata,
//       });
//     }

//     return duration;
//   }

//   // Measure API calls with real Alpaca data
//   async measureApiCall<T>(
//     name: string,
//     apiCall: () => Promise<T>,
//     metadata?: Record<string, any>
//   ): Promise<T> {
//     this.startMeasure(name);
    
//     try {
//       const result = await apiCall();
//       this.endMeasure(name, { ...metadata, status: 'success' });
//       return result;
//     } catch (error) {
//       this.endMeasure(name, { ...metadata, status: 'error' });
//       throw error;
//     }
//   }
// }

// export const performanceMonitor = new PerformanceMonitor();
