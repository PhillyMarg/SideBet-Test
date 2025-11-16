"use client";

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/utils/performance';

/**
 * Performance Monitor Component
 * Initializes performance monitoring when the app loads
 * Should be included in the root layout
 */
export function PerformanceMonitor() {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return null; // This component doesn't render anything
}
