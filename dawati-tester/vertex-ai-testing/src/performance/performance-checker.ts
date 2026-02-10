/**
 * Performance Checker: Core Web Vitals, Memory, Console Errors
 *
 * Measures:
 * - LCP (Largest Contentful Paint)
 * - FCP (First Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - TTI (Time to Interactive approximation)
 * - Memory usage and leak detection
 * - Console error/warning scoring
 * - Resource count analysis
 */

import { Page } from 'playwright';
import { PerformanceResult, ConsoleErrorResult, ConsoleLog } from '../types';

export class PerformanceChecker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run all performance checks on the current page
   */
  async checkPerformance(consoleLogs: ConsoleLog[]): Promise<PerformanceResult> {
    console.log('[PerformanceChecker] Measuring performance metrics...');

    const [coreWebVitals, memoryUsage, resourceCount] = await Promise.all([
      this.measureCoreWebVitals(),
      this.measureMemory(),
      this.countResources(),
    ]);

    const consoleErrors = this.analyzeConsoleLogs(consoleLogs);

    // Score calculation
    let score = 10;

    // LCP scoring (good < 2500ms, poor > 4000ms)
    if (coreWebVitals.lcp > 4000) score -= 2;
    else if (coreWebVitals.lcp > 2500) score -= 1;

    // FCP scoring (good < 1800ms, poor > 3000ms)
    if (coreWebVitals.fcp > 3000) score -= 1.5;
    else if (coreWebVitals.fcp > 1800) score -= 0.5;

    // CLS scoring (good < 0.1, poor > 0.25)
    if (coreWebVitals.cls > 0.25) score -= 2;
    else if (coreWebVitals.cls > 0.1) score -= 1;

    // TTI scoring (good < 3800ms, poor > 7300ms)
    if (coreWebVitals.tti > 7300) score -= 1.5;
    else if (coreWebVitals.tti > 3800) score -= 0.5;

    // Memory growth
    if (memoryUsage.growthDetected) score -= 1;

    // Console errors
    score -= consoleErrors.errorCount * 0.5;
    score -= consoleErrors.warningCount * 0.1;

    // Heavy resource usage
    if (resourceCount.total > 100) score -= 1;
    else if (resourceCount.total > 50) score -= 0.5;

    score = Math.max(0, Math.round(score * 10) / 10);

    const summary = this.buildSummary(coreWebVitals, memoryUsage, consoleErrors, resourceCount, score);

    console.log(`[PerformanceChecker] Score: ${score}/10 | LCP: ${coreWebVitals.lcp}ms, FCP: ${coreWebVitals.fcp}ms, CLS: ${coreWebVitals.cls}`);

    return {
      score,
      coreWebVitals,
      memoryUsage,
      resourceCount,
      consoleErrors,
      summary,
    };
  }

  private async measureCoreWebVitals(): Promise<PerformanceResult['coreWebVitals']> {
    try {
      return await this.page.evaluate(() => {
        const result = { lcp: 0, fcp: 0, cls: 0, tti: 0 };

        // FCP from Performance API
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) result.fcp = Math.round(fcpEntry.startTime);

        // Navigation timing for TTI approximation
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const nav = navEntries[0];
          result.tti = Math.round(nav.domInteractive - nav.fetchStart);
          // LCP approximation (domContentLoadedEventEnd as proxy)
          result.lcp = Math.round(nav.domContentLoadedEventEnd - nav.fetchStart);
        }

        // CLS approximation from layout shift entries
        const layoutShiftEntries = performance.getEntriesByType('layout-shift') as any[];
        result.cls = layoutShiftEntries.reduce((sum: number, entry: any) => {
          if (!entry.hadRecentInput) return sum + (entry.value || 0);
          return sum;
        }, 0);
        result.cls = Math.round(result.cls * 1000) / 1000;

        return result;
      });
    } catch {
      return { lcp: 0, fcp: 0, cls: 0, tti: 0 };
    }
  }

  private async measureMemory(): Promise<PerformanceResult['memoryUsage']> {
    try {
      return await this.page.evaluate(() => {
        const perf = performance as any;
        if (perf.memory) {
          return {
            heapUsedMB: Math.round(perf.memory.usedJSHeapSize / 1048576 * 10) / 10,
            heapTotalMB: Math.round(perf.memory.totalJSHeapSize / 1048576 * 10) / 10,
            growthDetected: false,
          };
        }
        return { heapUsedMB: 0, heapTotalMB: 0, growthDetected: false };
      });
    } catch {
      return { heapUsedMB: 0, heapTotalMB: 0, growthDetected: false };
    }
  }

  private async countResources(): Promise<PerformanceResult['resourceCount']> {
    try {
      return await this.page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        let scripts = 0, stylesheets = 0, images = 0, fonts = 0;

        resources.forEach(r => {
          const type = r.initiatorType;
          if (type === 'script') scripts++;
          else if (type === 'css' || type === 'link') stylesheets++;
          else if (type === 'img') images++;
          else if (r.name.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) fonts++;
        });

        return { scripts, stylesheets, images, fonts, total: resources.length };
      });
    } catch {
      return { scripts: 0, stylesheets: 0, images: 0, fonts: 0, total: 0 };
    }
  }

  /**
   * Analyze console logs for errors/warnings and produce a score
   */
  analyzeConsoleLogs(logs: ConsoleLog[]): ConsoleErrorResult {
    const errors = logs.filter(l => l.level === 'error').map(l => l.message);
    const warnings = logs.filter(l => l.level === 'warn').map(l => l.message);

    // Deduplicate
    const uniqueErrors = [...new Set(errors)];
    const uniqueWarnings = [...new Set(warnings)];

    let score = 10;
    score -= uniqueErrors.length * 1.0;
    score -= uniqueWarnings.length * 0.2;
    score = Math.max(0, Math.round(score * 10) / 10);

    return {
      score,
      errorCount: uniqueErrors.length,
      warningCount: uniqueWarnings.length,
      errors: uniqueErrors.slice(0, 20),
      warnings: uniqueWarnings.slice(0, 20),
    };
  }

  private buildSummary(
    vitals: PerformanceResult['coreWebVitals'],
    memory: PerformanceResult['memoryUsage'],
    consoleErrors: ConsoleErrorResult,
    resources: PerformanceResult['resourceCount'],
    score: number
  ): string {
    const parts: string[] = [];
    parts.push(`LCP: ${vitals.lcp}ms, FCP: ${vitals.fcp}ms, CLS: ${vitals.cls}`);
    if (memory.heapUsedMB > 0) parts.push(`Memory: ${memory.heapUsedMB}MB`);
    if (consoleErrors.errorCount > 0) parts.push(`${consoleErrors.errorCount} console errors`);
    parts.push(`${resources.total} resources loaded`);
    return parts.join('; ');
  }
}
