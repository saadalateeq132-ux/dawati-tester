import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { format } from 'date-fns';
import { getCurrentRunDir, getScreenshots, Screenshot } from './screenshot-manager';
import { AnalysisResult, Issue, aggregateIssues, calculateOverallScore, getIssueSummary } from './ai-analyzer';
import { AuthTestResult } from './auth-tester';
import { NavigationTestResult } from './navigation-tester';
import { ScrollTestResult } from './scroll-tester';
import { RTLCheckResult } from './rtl-checker';
import { VisualDiff, AccessibilityResult, PerformanceMetric } from './types';
import { ChecklistScore } from './checklist-validator';
import { createChildLogger } from './logger';
import { HTML_TEMPLATE } from './report-template';

const log = createChildLogger('report-generator');

export interface TestReport {
  generatedAt: Date;
  appUrl: string;
  duration: number; // in seconds
  overallScore: number;
  screenshotCount: number;
  issuesSummary: Record<string, number>;
  allIssues: Issue[];
  analysisResults: AnalysisResult[];
  authResults: AuthTestResult[];
  navigationResults: NavigationTestResult[];
  scrollResults: ScrollTestResult[];
  rtlResults: RTLCheckResult[];
  screenshots: Screenshot[];
  // New fields for enhancements
  visualDiffs: VisualDiff[];
  accessibilityResults: AccessibilityResult[];
  performanceMetrics: PerformanceMetric[];
  devicesTested: string[];
  performanceSummary: {
    avgLoadTimeMs: number;
    maxLoadTimeMs: number;
    minLoadTimeMs: number;
    totalPages: number;
    slowPages: string[];
  };
  accessibilitySummary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  };
  visualChangesCount: number;
  checklistScore?: ChecklistScore;
  aiStatus?: {
    enabled: boolean;
    skippedReason?: string | null;
  };
}


// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date) => {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
});

Handlebars.registerHelper('formatDuration', (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
});

Handlebars.registerHelper('formatMs', (ms: number) => {
  if (!ms || ms <= 0) return '0s';
  return `${(ms / 1000).toFixed(2)}s`;
});

Handlebars.registerHelper('formatPercentage', (value: number) => {
  return value.toFixed(2);
});

Handlebars.registerHelper('scoreColor', (score: number) => {
  if (score >= 8) return '#28a745';
  if (score >= 6) return '#ffc107';
  if (score >= 4) return '#fd7e14';
  return '#dc3545';
});

Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('join', (arr: string[], separator: string) => arr.join(separator));

export function generateReport(
  appUrl: string,
  startTime: Date,
  analysisResults: AnalysisResult[],
  authResults: AuthTestResult[],
  navigationResults: NavigationTestResult[],
  scrollResults: ScrollTestResult[],
  rtlResults: RTLCheckResult[],
  visualDiffs: VisualDiff[] = [],
  accessibilityResults: AccessibilityResult[] = [],
  performanceMetrics: PerformanceMetric[] = [],
  devicesTested: string[] = [],
  checklistScore?: ChecklistScore,
  aiStatus?: { enabled: boolean; skippedReason?: string | null }
): TestReport {
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  const allIssues = aggregateIssues(analysisResults);
  const overallScore = calculateOverallScore(analysisResults);
  const issuesSummary = getIssueSummary(allIssues);
  const screenshots = getScreenshots();

  // Calculate visual changes count
  const visualChangesCount = visualDiffs.filter((d) => d.hasSignificantChange).length;

  // Calculate accessibility summary
  const accessibilitySummary = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: 0,
  };
  for (const result of accessibilityResults) {
    for (const violation of result.violations) {
      accessibilitySummary[violation.impact]++;
      accessibilitySummary.total++;
    }
  }

  // Calculate performance summary
  const loadMetrics = performanceMetrics.filter((m) => m.pageLoadTimeMs > 0);
  const performanceSummary = {
    avgLoadTimeMs: 0,
    maxLoadTimeMs: 0,
    minLoadTimeMs: 0,
    totalPages: loadMetrics.length,
    slowPages: [] as string[],
  };

  if (loadMetrics.length > 0) {
    const loadTimes = loadMetrics.map((m) => m.pageLoadTimeMs);
    performanceSummary.avgLoadTimeMs = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    performanceSummary.maxLoadTimeMs = Math.max(...loadTimes);
    performanceSummary.minLoadTimeMs = Math.min(...loadTimes);
    performanceSummary.slowPages = loadMetrics
      .filter((m) => m.pageLoadTimeMs > 5000)
      .map((m) => `${m.name} (${(m.pageLoadTimeMs / 1000).toFixed(2)}s)`);
  }

  const report: TestReport = {
    generatedAt: endTime,
    appUrl,
    duration,
    overallScore,
    screenshotCount: screenshots.length,
    issuesSummary,
    allIssues,
    analysisResults,
    authResults,
    navigationResults,
    scrollResults,
    rtlResults,
    screenshots,
    visualDiffs,
    accessibilityResults,
    performanceMetrics,
    devicesTested,
    performanceSummary,
    accessibilitySummary,
    visualChangesCount,
    checklistScore,
    aiStatus,
  };

  return report;
}

export function saveReport(report: TestReport): string {
  const runDir = getCurrentRunDir();
  const template = Handlebars.compile(HTML_TEMPLATE);
  const html = template(report);

  // Save HTML report
  const htmlPath = path.join(runDir, 'report.html');
  fs.writeFileSync(htmlPath, html);
  log.info({ path: htmlPath }, 'HTML report saved');

  // Save JSON report
  const jsonPath = path.join(runDir, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log.info({ path: jsonPath }, 'JSON report saved');

  // Save issues as CSV for easy import to spreadsheets
  const csvPath = path.join(runDir, 'issues.csv');
  const csvHeader = 'ID,Severity,Category,Title,Description,Suggestion,Screenshot\n';
  const csvRows = report.allIssues
    .map((issue) =>
      `"${issue.id}","${issue.severity}","${issue.category}","${issue.title}","${issue.description}","${issue.suggestion}","${issue.screenshot}"`
    )
    .join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  log.info({ path: csvPath }, 'Issues CSV saved');

  // Save accessibility issues as separate CSV
  if (report.accessibilityResults.length > 0) {
    const a11yCsvPath = path.join(runDir, 'accessibility-issues.csv');
    const a11yHeader = 'Page,Device,Impact,ID,Description,Help,Nodes\n';
    const a11yRows: string[] = [];
    for (const result of report.accessibilityResults) {
      for (const violation of result.violations) {
        const nodes = violation.nodes.map((n) => n.target.join(' > ')).join('; ');
        a11yRows.push(
          `"${result.page}","${result.device}","${violation.impact}","${violation.id}","${violation.description}","${violation.help}","${nodes}"`
        );
      }
    }
    fs.writeFileSync(a11yCsvPath, a11yHeader + a11yRows.join('\n'));
    log.info({ path: a11yCsvPath }, 'Accessibility issues CSV saved');
  }

  return htmlPath;
}

export function printReportSummary(report: TestReport): void {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DAWATI AUTONOMOUS TESTER - REPORT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Calculate RTL Score (average of all RTL check scores)
  const rtlScore = report.rtlResults.length > 0
    ? (report.rtlResults.reduce((sum, r) => sum + r.score, 0) / report.rtlResults.length).toFixed(1)
    : 'N/A';

  // AI Score (overall score from Gemini analysis)
  const aiScore = report.overallScore;
  const aiStatus = report.aiStatus;

  // Checklist Score
  const checklistScore = report.checklistScore ? report.checklistScore.overallScore : null;
  const checklistRequired = report.checklistScore ? report.checklistScore.requiredScore : null;

  // Display the 3 SCORES prominently
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    🎯 TEST SCORES                    ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  if (aiStatus && !aiStatus.enabled) {
    console.log('âڑ ï¸ڈ  AI analysis was skipped.');
    if (aiStatus.skippedReason) {
      console.log(`   Reason: ${aiStatus.skippedReason}`);
    }
    console.log('');
  }

  // Score 1: RTL Score
  const rtlEmoji = rtlScore !== 'N/A' && parseFloat(rtlScore) >= 7 ? '✅' : rtlScore !== 'N/A' && parseFloat(rtlScore) >= 5 ? '⚠️' : '❌';
  console.log(`  ${rtlEmoji} Score 1: RTL Score              ${rtlScore}/10`);

  // Score 2: AI Score
  const aiEmoji = aiScore >= 7 ? '✅' : aiScore >= 5 ? '⚠️' : '❌';
  console.log(`  ${aiEmoji} Score 2: AI Score (Gemini)      ${aiScore}/10`);

  // Score 3: Checklist Score
  if (checklistScore !== null && checklistRequired !== null) {
    const checklistEmoji = checklistRequired === 100 ? '✅' : '❌';
    console.log(`  ${checklistEmoji} Score 3: Checklist Coverage     ${checklistScore}%`);
    console.log(`           - Required (P0):         ${checklistRequired}% ${checklistRequired === 100 ? '✅' : '❌ MUST BE 100%'}`);
    console.log(`           - Passing:               ${report.checklistScore!.passingItems}/${report.checklistScore!.totalItems} tests`);
  } else {
    console.log(`  ⚠️  Score 3: Checklist Coverage     N/A (checklist not found)`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  console.log(`📸 Screenshots: ${report.screenshotCount}`);
  console.log(`⏱️  Duration: ${Math.floor(report.duration / 60)}m ${Math.floor(report.duration % 60)}s`);

  if (report.devicesTested.length > 0) {
    console.log(`📱 Devices: ${report.devicesTested.join(', ')}`);
  }

  console.log('\n📋 Issues Summary:');
  console.log(`   🔴 Critical: ${report.issuesSummary.critical}`);
  console.log(`   🟠 High: ${report.issuesSummary.high}`);
  console.log(`   🟡 Medium: ${report.issuesSummary.medium}`);
  console.log(`   🟢 Low: ${report.issuesSummary.low}`);
  console.log(`   📝 Total: ${report.issuesSummary.total}`);

  if (report.visualChangesCount > 0) {
    console.log(`\n🖼️  Visual Changes: ${report.visualChangesCount} screenshots differ from baseline`);
  }

  if (report.accessibilitySummary.total > 0) {
    console.log('\n♿ Accessibility Violations:');
    console.log(`   Critical: ${report.accessibilitySummary.critical}`);
    console.log(`   Serious: ${report.accessibilitySummary.serious}`);
    console.log(`   Moderate: ${report.accessibilitySummary.moderate}`);
    console.log(`   Total: ${report.accessibilitySummary.total}`);
  }

  if (report.performanceSummary.totalPages > 0) {
    console.log('\n⚡ Performance:');
    console.log(`   Avg Load: ${(report.performanceSummary.avgLoadTimeMs / 1000).toFixed(2)}s`);
    console.log(`   Max Load: ${(report.performanceSummary.maxLoadTimeMs / 1000).toFixed(2)}s`);
    if (report.performanceSummary.slowPages.length > 0) {
      console.log(`   Slow Pages: ${report.performanceSummary.slowPages.length}`);
    }
  }

  console.log('\n📁 Report saved to:', getCurrentRunDir());
  console.log('   └── report.html');
  console.log('   └── report.json');
  console.log('   └── issues.csv');
  if (report.accessibilitySummary.total > 0) {
    console.log('   └── accessibility-issues.csv');
  }
  console.log('   └── screenshots/');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
