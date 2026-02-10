
export const HTML_TEMPLATE = `
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
            <div class="stat-card">
                <div class="stat-value {{#if aiStatus}}{{#unless aiStatus.enabled}}warning{{/unless}}{{/if}}">
                    {{#if aiStatus}}{{#if aiStatus.enabled}}ON{{else}}SKIPPED{{/if}}{{else}}N/A{{/if}}
                </div>
                <div class="stat-label">AI Analysis</div>
            </div>
        </div>

        {{#if aiStatus}}
        {{#unless aiStatus.enabled}}
        <div class="section">
            <h2 class="warning">AI Analysis Skipped</h2>
            <p style="color: #666; margin-bottom: 10px;">AI analysis did not run for this test.</p>
            {{#if aiStatus.skippedReason}}
            <div class="issue-suggestion">
                <strong>Reason:</strong> {{aiStatus.skippedReason}}
            </div>
            {{/if}}
        </div>
        {{/unless}}
        {{/if}}

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
