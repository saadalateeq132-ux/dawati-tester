import { Page } from 'playwright';
import { PerformanceMetric } from './types';
import { getCurrentDevice } from './device-manager';
import { createChildLogger } from './logger';

const log = createChildLogger('performance');

let performanceMetrics: PerformanceMetric[] = [];

export function initPerformanceMetrics(): void {
  performanceMetrics = [];
}

export async function measurePageLoad(
  page: Page,
  pageName: string
): Promise<PerformanceMetric> {
  const device = getCurrentDevice();
  const startTime = Date.now();

  try {
    await page.waitForLoadState('networkidle');
  } catch {
    // Continue even if networkidle times out
  }

  const endTime = Date.now();
  const loadTime = endTime - startTime;

  const metric: PerformanceMetric = {
    name: pageName,
    device,
    pageLoadTimeMs: loadTime,
    timestamp: new Date(),
  };

  performanceMetrics.push(metric);

  log.info(
    { page: pageName, device, loadTimeMs: loadTime },
    'Page load time measured'
  );

  return metric;
}

export function recordScrollMetric(
  pageName: string,
  scrollDurationMs: number
): PerformanceMetric {
  const device = getCurrentDevice();

  const metric: PerformanceMetric = {
    name: `${pageName} (scroll)`,
    device,
    pageLoadTimeMs: 0,
    scrollDurationMs,
    timestamp: new Date(),
  };

  performanceMetrics.push(metric);

  log.info(
    { page: pageName, device, scrollDurationMs },
    'Scroll duration recorded'
  );

  return metric;
}

export function getPerformanceMetrics(): PerformanceMetric[] {
  return performanceMetrics;
}

export function getAverageLoadTime(): number {
  const loadMetrics = performanceMetrics.filter((m) => m.pageLoadTimeMs > 0);
  if (loadMetrics.length === 0) return 0;

  const total = loadMetrics.reduce((sum, m) => sum + m.pageLoadTimeMs, 0);
  return total / loadMetrics.length;
}

export function getPerformanceSummary(): {
  avgLoadTimeMs: number;
  maxLoadTimeMs: number;
  minLoadTimeMs: number;
  totalPages: number;
  slowPages: string[];
} {
  const loadMetrics = performanceMetrics.filter((m) => m.pageLoadTimeMs > 0);

  if (loadMetrics.length === 0) {
    return {
      avgLoadTimeMs: 0,
      maxLoadTimeMs: 0,
      minLoadTimeMs: 0,
      totalPages: 0,
      slowPages: [],
    };
  }

  const loadTimes = loadMetrics.map((m) => m.pageLoadTimeMs);
  const avgLoadTimeMs = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
  const maxLoadTimeMs = Math.max(...loadTimes);
  const minLoadTimeMs = Math.min(...loadTimes);

  // Pages taking more than 5 seconds are considered slow
  const slowPages = loadMetrics
    .filter((m) => m.pageLoadTimeMs > 5000)
    .map((m) => `${m.name} (${m.device}): ${(m.pageLoadTimeMs / 1000).toFixed(2)}s`);

  return {
    avgLoadTimeMs,
    maxLoadTimeMs,
    minLoadTimeMs,
    totalPages: loadMetrics.length,
    slowPages,
  };
}

export function getMetricsByDevice(): Record<string, PerformanceMetric[]> {
  const byDevice: Record<string, PerformanceMetric[]> = {};

  for (const metric of performanceMetrics) {
    if (!byDevice[metric.device]) {
      byDevice[metric.device] = [];
    }
    byDevice[metric.device].push(metric);
  }

  return byDevice;
}

export function clearPerformanceMetrics(): void {
  performanceMetrics = [];
}

export class PerformanceTimer {
  private startTime: number = 0;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    const duration = Date.now() - this.startTime;
    log.debug({ name: this.name, durationMs: duration }, 'Timer stopped');
    return duration;
  }

  stopAndRecord(): PerformanceMetric {
    const duration = this.stop();
    return recordScrollMetric(this.name, duration);
  }
}
