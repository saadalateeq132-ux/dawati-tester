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
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
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
    </header>

    <div class="container">
        <div class="score-card">
            <div class="score">{{overallScore}}</div>
            <div class="score-label">Overall Health Score (out of 10)</div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{{screenshotCount}}</div>
                <div class="stat-label">Screenshots Captured</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{issuesSummary.total}}</div>
                <div class="stat-label">Total Issues Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{issuesSummary.critical}}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{issuesSummary.high}}</div>
                <div class="stat-label">High Priority Issues</div>
            </div>
        </div>

        {{#if allIssues.length}}
        <div class="section">
            <h2>Issues Found ({{allIssues.length}})</h2>
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
                <div class="screenshot-card">
                    <img src="screenshots/{{filename}}" alt="{{action}}" loading="lazy">
                    <div class="screenshot-info">
                        <div class="screenshot-action">{{action}}</div>
                        <div class="screenshot-desc">{{description}}</div>
                    </div>
                </div>
                {{/each}}
            </div>
        </div>
    </div>

    <footer>
        <p>Generated by <strong>Dawati Autonomous Tester</strong></p>
        <p>Powered by Playwright + Gemini AI</p>
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

Handlebars.registerHelper('scoreColor', (score: number) => {
  if (score >= 8) return '#28a745';
  if (score >= 6) return '#ffc107';
  if (score >= 4) return '#fd7e14';
  return '#dc3545';
});

Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);

export function generateReport(
  appUrl: string,
  startTime: Date,
  analysisResults: AnalysisResult[],
  authResults: AuthTestResult[],
  navigationResults: NavigationTestResult[],
  scrollResults: ScrollTestResult[],
  rtlResults: RTLCheckResult[]
): TestReport {
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  const allIssues = aggregateIssues(analysisResults);
  const overallScore = calculateOverallScore(analysisResults);
  const issuesSummary = getIssueSummary(allIssues);
  const screenshots = getScreenshots();

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

  return htmlPath;
}

export function printReportSummary(report: TestReport): void {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DAWATI AUTONOMOUS TESTER - REPORT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Overall Score: ${report.overallScore}/10`);
  console.log(`📸 Screenshots: ${report.screenshotCount}`);
  console.log(`⏱️  Duration: ${Math.floor(report.duration / 60)}m ${Math.floor(report.duration % 60)}s`);
  console.log('\n📋 Issues Summary:');
  console.log(`   🔴 Critical: ${report.issuesSummary.critical}`);
  console.log(`   🟠 High: ${report.issuesSummary.high}`);
  console.log(`   🟡 Medium: ${report.issuesSummary.medium}`);
  console.log(`   🟢 Low: ${report.issuesSummary.low}`);
  console.log(`   📝 Total: ${report.issuesSummary.total}`);
  console.log('\n📁 Report saved to:', getCurrentRunDir());
  console.log('   └── report.html');
  console.log('   └── report.json');
  console.log('   └── issues.csv');
  console.log('   └── screenshots/');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
