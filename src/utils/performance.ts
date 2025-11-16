/**
 * Performance Monitoring Utilities
 * Tracks and logs performance metrics for the application
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

/**
 * Measures and logs page load performance metrics
 * Should be called after page load is complete
 */
export const measurePagePerformance = (): PerformanceMetrics | null => {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const perfData = window.performance.timing;
  const navigationStart = perfData.navigationStart;

  const metrics: PerformanceMetrics = {
    pageLoadTime: perfData.loadEventEnd - navigationStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - navigationStart,
  };

  // Get Web Vitals if available
  if ('PerformanceObserver' in window) {
    try {
      // First Contentful Paint (FCP)
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.firstContentfulPaint = fcpEntry.startTime;
      }

      // Largest Contentful Paint (LCP)
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Error measuring Web Vitals:', error);
    }
  }

  return metrics;
};

/**
 * Logs performance metrics to console (in development) or analytics service (in production)
 */
export const logPerformanceMetrics = (metrics: PerformanceMetrics) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📊 Performance Metrics');
    console.log('Page Load Time:', `${metrics.pageLoadTime}ms`);
    console.log('DOM Content Loaded:', `${metrics.domContentLoaded}ms`);
    if (metrics.firstContentfulPaint) {
      console.log('First Contentful Paint:', `${metrics.firstContentfulPaint.toFixed(2)}ms`);
    }
    if (metrics.largestContentfulPaint) {
      console.log('Largest Contentful Paint:', `${metrics.largestContentfulPaint.toFixed(2)}ms`);
    }
    console.groupEnd();
  } else {
    // In production, you might want to send these metrics to an analytics service
    // Example: sendToAnalytics('performance', metrics);
  }
};

/**
 * Initialize performance monitoring
 * Call this in your main layout or app component
 */
export const initPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return;

  // Measure performance after page load
  window.addEventListener('load', () => {
    // Use setTimeout to ensure all metrics are captured
    setTimeout(() => {
      const metrics = measurePagePerformance();
      if (metrics) {
        logPerformanceMetrics(metrics);
      }
    }, 0);
  });

  // Monitor long tasks (tasks that block the main thread for >50ms)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⚠️ Long Task detected:', {
              duration: `${entry.duration.toFixed(2)}ms`,
              startTime: `${entry.startTime.toFixed(2)}ms`,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // longtask might not be supported in all browsers
    }
  }
};

/**
 * Measures the time taken to execute a function
 * Useful for profiling specific operations
 */
export const measureExecutionTime = async <T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Debounce function for performance optimization
 * Limits the rate at which a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * Ensures a function is only called once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
