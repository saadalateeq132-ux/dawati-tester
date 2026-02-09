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
}

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dawati Test Report - {{formatDate generatedAt}}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .meta { opacity: 0.9; font-size: 0.9rem; }
        .devices-tested { margin-top: 10px; font-size: 0.85rem; opacity: 0.8; }

        .score-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin: -40px auto 30px;
            max-width: 600px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        .score {
            font-size: 5rem;
            font-weight: bold;
            color: {{scoreColor overallScore}};
        }
        .score-label { color: #666; font-size: 1.2rem; }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .stat-value { font-size: 2rem; font-weight: bold; color: #667eea; }
        .stat-value.warning { color: #fd7e14; }
        .stat-value.danger { color: #dc3545; }
        .stat-value.success { color: #28a745; }
        .stat-label { color: #666; font-size: 0.9rem; }

        .section {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .section h2.warning { border-bottom-color: #fd7e14; }
        .section h2.danger { border-bottom-color: #dc3545; }

        .issue {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-right: 4px solid;
        }
        .issue.critical { border-right-color: #dc3545; background: #fff5f5; }
        .issue.high { border-right-color: #fd7e14; background: #fff8f0; }
        .issue.medium { border-right-color: #ffc107; background: #fffef0; }
        .issue.low { border-right-color: #28a745; background: #f0fff4; }

        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .issue-title { font-weight: bold; }
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge.critical { background: #dc3545; color: white; }
        .badge.high { background: #fd7e14; color: white; }
        .badge.medium { background: #ffc107; color: #333; }
        .badge.low { background: #28a745; color: white; }
        .badge.serious { background: #fd7e14; color: white; }
        .badge.moderate { background: #ffc107; color: #333; }
        .badge.minor { background: #17a2b8; color: white; }

        .issue-description { color: #666; margin-bottom: 10px; }
        .issue-suggestion {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.9rem;
        }
        .issue-suggestion strong { color: #667eea; }

        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .screenshot-card {
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot-card.has-diff { border: 2px solid #fd7e14; }
        .screenshot-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .screenshot-info {
            padding: 10px;
        }
        .screenshot-action { font-weight: bold; color: #333; }
        .screenshot-desc { font-size: 0.85rem; color: #666; }
        .screenshot-device { font-size: 0.75rem; color: #999; margin-top: 4px; }
        .screenshot-diff { font-size: 0.75rem; color: #fd7e14; margin-top: 4px; }

        .test-result {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .test-result:last-child { border-bottom: none; }
        .test-status {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-left: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }
        .test-status.pass { background: #28a745; }
        .test-status.fail { background: #dc3545; }
        .test-name { flex: 1; }

        .perf-table {
            width: 100%;
            border-collapse: collapse;
        }
        .perf-table th, .perf-table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #eee;
        }
        .perf-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .perf-table tr.slow td { background: #fff5f5; color: #dc3545; }

        .a11y-violation {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .a11y-violation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .a11y-violation-id { font-weight: bold; font-family: monospace; }
        .a11y-violation-help { color: #666; margin-bottom: 8px; }
        .a11y-violation-nodes {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-family: monospace;
            overflow-x: auto;
        }

        .visual-diff-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .visual-diff-card {
            background: #fff8f0;
            border: 2px solid #fd7e14;
            border-radius: 8px;
            padding: 15px;
        }
        .visual-diff-filename { font-weight: bold; margin-bottom: 8px; }
        .visual-diff-percentage {
            font-size: 1.5rem;
            font-weight: bold;
            color: #fd7e14;
        }

        footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9rem;
        }
        footer a { color: #667eea; }
    </style>
</head>
<body>
    <header>
        <h1>Dawati Test Report</h1>
        <p class="meta">Generated: {{formatDate generatedAt}} | Duration: {{formatDuration duration}} | URL: {{appUrl}}</p>
        {{#if devicesTested.length}}
        <p class="devices-tested">Devices Tested: {{join devicesTested ", "}}</p>
        {{/if}}
    </header>

    <div class="container">
        <div class="score-card">
            <div class="score">{{overallScore}}</div>
            <div class="score-label">Overall Health Score (out of 10)</div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{{screenshotCount}}</div>
                <div class="stat-label">Screenshots</div>
            </div>
            <div class="stat-card">
                <div class="stat-value {{#if (gt issuesSummary.total 0)}}warning{{else}}success{{/if}}">{{issuesSummary.total}}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value {{#if (gt issuesSummary.critical 0)}}danger{{else}}success{{/if}}">{{issuesSummary.critical}}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value {{#if (gt visualChangesCount 0)}}warning{{/if}}">{{visualChangesCount}}</div>
                <div class="stat-label">Visual Changes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value {{#if (gt accessibilitySummary.total 0)}}warning{{/if}}">{{accessibilitySummary.total}}</div>
                <div class="stat-label">A11y Violations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{formatMs performanceSummary.avgLoadTimeMs}}</div>
                <div class="stat-label">Avg Load Time</div>
            </div>
        </div>

        {{#if (gt visualChangesCount 0)}}
        <div class="section">
            <h2 class="warning">Visual Changes ({{visualChangesCount}})</h2>
            <p style="margin-bottom: 15px; color: #666;">Screenshots that differ from baseline by more than the threshold.</p>
            <div class="visual-diff-grid">
                {{#each visualDiffs}}
                {{#if hasSignificantChange}}
                <div class="visual-diff-card">
                    <div class="visual-diff-filename">{{filename}}</div>
                    <div class="visual-diff-percentage">{{formatPercentage diffPercentage}}% changed</div>
                    {{#if diffImagePath}}
                    <a href="diffs/diff_{{filename}}" style="font-size: 0.85rem; color: #667eea;">View Diff</a>
                    {{/if}}
                </div>
                {{/if}}
                {{/each}}
            </div>
        </div>
        {{/if}}

        {{#if (gt accessibilitySummary.total 0)}}
        <div class="section">
            <h2 class="warning">Accessibility Issues ({{accessibilitySummary.total}})</h2>
            <div style="margin-bottom: 15px; display: flex; gap: 15px; flex-wrap: wrap;">
                <span><strong>Critical:</strong> {{accessibilitySummary.critical}}</span>
                <span><strong>Serious:</strong> {{accessibilitySummary.serious}}</span>
                <span><strong>Moderate:</strong> {{accessibilitySummary.moderate}}</span>
                <span><strong>Minor:</strong> {{accessibilitySummary.minor}}</span>
            </div>
            {{#each accessibilityResults}}
            {{#if violations.length}}
            <h3 style="margin: 20px 0 10px; font-size: 1rem; color: #666;">{{page}} ({{device}})</h3>
            {{#each violations}}
            <div class="a11y-violation">
                <div class="a11y-violation-header">
                    <span class="a11y-violation-id">{{id}}</span>
                    <span class="badge {{impact}}">{{impact}}</span>
                </div>
                <p class="a11y-violation-help">{{help}}</p>
                <div class="a11y-violation-nodes">
                    {{#each nodes}}
                    <div>{{target}}</div>
                    {{/each}}
                </div>
            </div>
            {{/each}}
            {{/if}}
            {{/each}}
        </div>
        {{/if}}

        {{#if performanceMetrics.length}}
        <div class="section">
            <h2>Performance Summary</h2>
            <div style="margin-bottom: 15px; display: flex; gap: 20px; flex-wrap: wrap;">
                <span><strong>Avg:</strong> {{formatMs performanceSummary.avgLoadTimeMs}}</span>
                <span><strong>Min:</strong> {{formatMs performanceSummary.minLoadTimeMs}}</span>
                <span><strong>Max:</strong> {{formatMs performanceSummary.maxLoadTimeMs}}</span>
                <span><strong>Pages:</strong> {{performanceSummary.totalPages}}</span>
            </div>
            {{#if performanceSummary.slowPages.length}}
            <p style="color: #dc3545; margin-bottom: 15px;"><strong>Slow pages (>5s):</strong> {{join performanceSummary.slowPages ", "}}</p>
            {{/if}}
            <table class="perf-table">
                <thead>
                    <tr>
                        <th>Page</th>
                        <th>Device</th>
                        <th>Load Time</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each performanceMetrics}}
                    <tr {{#if (gt pageLoadTimeMs 5000)}}class="slow"{{/if}}>
                        <td>{{name}}</td>
                        <td>{{device}}</td>
                        <td>{{formatMs pageLoadTimeMs}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>
        {{/if}}

        {{#if allIssues.length}}
        <div class="section">
            <h2>AI Analysis Issues ({{allIssues.length}})</h2>
            {{#each allIssues}}
            <div class="issue {{severity}}">
                <div class="issue-header">
                    <span class="issue-title">{{id}}: {{title}}</span>
                    <span class="badge {{severity}}">{{severity}}</span>
                </div>
                <p class="issue-description">{{description}}</p>
                <div class="issue-suggestion">
                    <strong>Suggestion:</strong> {{suggestion}}
                </div>
            </div>
            {{/each}}
        </div>
        {{/if}}

        <div class="section">
            <h2>Authentication Tests</h2>
            {{#each authResults}}
            <div class="test-result">
                <div class="test-status {{#if success}}pass{{else}}fail{{/if}}">
                    {{#if success}}✓{{else}}✗{{/if}}
                </div>
                <span class="test-name">{{method}} Authentication</span>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>Navigation Tests</h2>
            {{#each navigationResults}}
            <div class="test-result">
                <div class="test-status {{#if success}}pass{{else}}fail{{/if}}">
                    {{#if success}}✓{{else}}✗{{/if}}
                </div>
                <span class="test-name">{{category}} ({{pagesVisited.length}} pages)</span>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>Scroll Tests</h2>
            {{#each scrollResults}}
            <div class="test-result">
                <div class="test-status {{#if success}}pass{{else}}fail{{/if}}">
                    {{#if success}}✓{{else}}✗{{/if}}
                </div>
                <span class="test-name">{{testName}}</span>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>RTL & Internationalization</h2>
            {{#each rtlResults}}
            <div class="test-result">
                <div class="test-status {{#if (gte score 7)}}pass{{else}}fail{{/if}}">
                    {{score}}/10
                </div>
                <span class="test-name">{{category}} ({{issues.length}} issues)</span>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>Screenshots ({{screenshots.length}})</h2>
            <div class="screenshots">
                {{#each screenshots}}
                <div class="screenshot-card {{#if visualDiff.hasSignificantChange}}has-diff{{/if}}">
                    <img src="screenshots/{{filename}}" alt="{{action}}" loading="lazy">
                    <div class="screenshot-info">
                        <div class="screenshot-action">{{action}}</div>
                        <div class="screenshot-desc">{{description}}</div>
                        <div class="screenshot-device">{{device}}</div>
                        {{#if visualDiff.hasSignificantChange}}
                        <div class="screenshot-diff">{{formatPercentage visualDiff.diffPercentage}}% changed from baseline</div>
                        {{/if}}
                    </div>
                </div>
                {{/each}}
            </div>
        </div>
    </div>

    <footer>
        <p>Generated by <strong>Dawati Autonomous Tester</strong></p>
        <p>Powered by Playwright + Gemini AI + axe-core</p>
    </footer>
</body>
</html>
`;

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
  checklistScore?: ChecklistScore
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

  // Checklist Score
  const checklistScore = report.checklistScore ? report.checklistScore.overallScore : null;
  const checklistRequired = report.checklistScore ? report.checklistScore.requiredScore : null;

  // Display the 3 SCORES prominently
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    🎯 TEST SCORES                    ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

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
