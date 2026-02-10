/**
 * Trend Tracker: Historical Data, Degradation Detection
 *
 * Provides:
 * - JSON persistence of test results over time
 * - Degradation detection (score drops > threshold)
 * - Improvement tracking
 * - Sparkline data for reports
 * - Compare with previous run
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteResult, TrendHistoryEntry, TrendAnalysis, PhaseResult } from '../types';

export class TrendTracker {
  private historyFile: string;
  private maxEntries: number;
  private degradationThreshold: number; // % drop

  constructor(historyFile: string, maxEntries = 200, degradationThreshold = 15) {
    this.historyFile = historyFile;
    this.maxEntries = maxEntries;
    this.degradationThreshold = degradationThreshold;

    // Ensure directory exists
    const dir = path.dirname(historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Record a test run result
   */
  recordRun(result: TestSuiteResult): void {
    const history = this.loadHistory();

    const entry: TrendHistoryEntry = {
      timestamp: result.startTime.toISOString(),
      suite: result.suiteName,
      device: result.deviceName || 'default',
      passRate: result.totalPhases > 0 ? result.passedPhases / result.totalPhases : 0,
      avgRTLScore: this.avgScore(result.phaseResults, 'rtl'),
      avgColorScore: this.avgScore(result.phaseResults, 'color'),
      avgCodeQuality: this.avgScore(result.phaseResults, 'codeQuality'),
      avgLevel1Score: this.avgScore(result.phaseResults, 'level1'),
      avgLevel2Score: this.avgScore(result.phaseResults, 'level2'),
      avgLevel3Score: this.avgScore(result.phaseResults, 'level3'),
      avgPerformanceScore: this.avgScore(result.phaseResults, 'performance'),
      avgSecurityScore: this.avgScore(result.phaseResults, 'security'),
      avgWCAGScore: this.avgScore(result.phaseResults, 'wcag'),
      duration: result.duration,
      cost: result.totalCost,
      phaseCount: result.totalPhases,
    };

    history.push(entry);

    // Trim to max entries
    if (history.length > this.maxEntries) {
      history.splice(0, history.length - this.maxEntries);
    }

    this.saveHistory(history);
    console.log(`[TrendTracker] Recorded run: ${result.suiteName} (${history.length} total entries)`);
  }

  /**
   * Analyze trends and detect degradation
   */
  analyzeTrends(currentSuite?: string): TrendAnalysis {
    const history = this.loadHistory();
    const filtered = currentSuite
      ? history.filter(h => h.suite === currentSuite)
      : history;

    if (filtered.length < 2) {
      return { degradation: [], improvements: [], stable: [], sparklines: {} };
    }

    const recent = filtered.slice(-10);
    const prev = filtered.slice(-20, -10);

    if (prev.length === 0) {
      return { degradation: [], improvements: [], stable: [], sparklines: this.buildSparklines(recent) };
    }

    const degradation: string[] = [];
    const improvements: string[] = [];
    const stable: string[] = [];

    const metrics: Array<{ name: string; key: keyof TrendHistoryEntry }> = [
      { name: 'Pass Rate', key: 'passRate' },
      { name: 'RTL Score', key: 'avgRTLScore' },
      { name: 'Color Score', key: 'avgColorScore' },
      { name: 'Code Quality', key: 'avgCodeQuality' },
      { name: 'Level 1 (Visual)', key: 'avgLevel1Score' },
      { name: 'Level 2 (Forms)', key: 'avgLevel2Score' },
      { name: 'Level 3 (API)', key: 'avgLevel3Score' },
      { name: 'Performance', key: 'avgPerformanceScore' },
      { name: 'Security', key: 'avgSecurityScore' },
      { name: 'WCAG', key: 'avgWCAGScore' },
    ];

    for (const metric of metrics) {
      const recentAvg = this.average(recent.map(r => r[metric.key] as number));
      const prevAvg = this.average(prev.map(r => r[metric.key] as number));

      if (prevAvg === 0) continue;

      const change = ((recentAvg - prevAvg) / prevAvg) * 100;

      if (change < -this.degradationThreshold) {
        degradation.push(`${metric.name}: ${prevAvg.toFixed(1)} -> ${recentAvg.toFixed(1)} (${change.toFixed(0)}%)`);
      } else if (change > this.degradationThreshold) {
        improvements.push(`${metric.name}: ${prevAvg.toFixed(1)} -> ${recentAvg.toFixed(1)} (+${change.toFixed(0)}%)`);
      } else {
        stable.push(metric.name);
      }
    }

    return {
      degradation,
      improvements,
      stable,
      sparklines: this.buildSparklines(recent),
    };
  }

  /**
   * Get comparison with previous run
   */
  getPreviousRun(suiteName: string): TrendHistoryEntry | undefined {
    const history = this.loadHistory();
    const suiteHistory = history.filter(h => h.suite === suiteName);
    return suiteHistory.length >= 2 ? suiteHistory[suiteHistory.length - 2] : undefined;
  }

  private buildSparklines(entries: TrendHistoryEntry[]): Record<string, number[]> {
    return {
      passRate: entries.map(e => Math.round(e.passRate * 100)),
      rtl: entries.map(e => e.avgRTLScore),
      color: entries.map(e => e.avgColorScore),
      codeQuality: entries.map(e => e.avgCodeQuality),
      performance: entries.map(e => e.avgPerformanceScore),
      security: entries.map(e => e.avgSecurityScore),
      wcag: entries.map(e => e.avgWCAGScore),
    };
  }

  private avgScore(phases: PhaseResult[], type: string): number {
    const scores: number[] = [];

    for (const p of phases) {
      switch (type) {
        case 'rtl':
          if (p.rtlResult) scores.push(p.rtlResult.overallScore);
          break;
        case 'color': {
          const colorCheck = p.rtlResult?.checks.find(c => c.checkName === 'Design System Color Consistency');
          if (colorCheck) scores.push(colorCheck.score);
          break;
        }
        case 'codeQuality':
          if (p.codeQualityResult) scores.push(p.codeQualityResult.score);
          break;
        case 'level1':
          if (p.componentConsistency) scores.push(p.componentConsistency.score);
          break;
        case 'level2':
          if (p.formValidation) scores.push(p.formValidation.score);
          break;
        case 'level3':
          if (p.backendIntegration) scores.push(p.backendIntegration.score);
          break;
        case 'performance':
          if (p.performanceResult) scores.push(p.performanceResult.score);
          break;
        case 'security':
          if (p.securityResult) scores.push(p.securityResult.score);
          break;
        case 'wcag':
          if (p.wcagResult) scores.push(p.wcagResult.score);
          break;
      }
    }

    if (scores.length === 0) return 0;
    return Math.round(this.average(scores) * 10) / 10;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private loadHistory(): TrendHistoryEntry[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        return JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      }
    } catch {
      console.warn('[TrendTracker] Failed to load history, starting fresh');
    }
    return [];
  }

  private saveHistory(history: TrendHistoryEntry[]): void {
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2), 'utf-8');
  }
}
