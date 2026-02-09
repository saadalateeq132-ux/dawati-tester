import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteResult, TestConfig, CostBreakdown, TotalCostReport } from '../types';

export class HTMLReporter {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;

    // Ensure reports directory exists
    fs.mkdirSync(config.reporting.reportsDir, { recursive: true });
  }

  /**
   * Generate comprehensive HTML report
   */
  generateReport(result: TestSuiteResult): string {
    console.log('[Reporter] Generating HTML report...');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${result.suiteName}</title>
  <style>
    ${this.getCSS()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 Vertex AI Testing Report</h1>
      <p class="suite-name">${result.suiteName}</p>
      <p class="timestamp">${result.startTime.toLocaleString()}</p>
    </header>

    ${this.generateSummarySection(result)}
    ${this.generatePhaseResultsSection(result)}
    ${this.generateCostSection(result)}
    ${this.generateIssuesSection(result)}
    ${this.generateArtifactsSection(result)}
  </div>
</body>
</html>`;

    const reportPath = path.join(
      this.config.reporting.reportsDir,
      `report-${Date.now()}.html`
    );

    fs.writeFileSync(reportPath, html, 'utf-8');
    console.log(`[Reporter] HTML report saved: ${reportPath}`);

    // Also save JSON report
    if (this.config.reporting.format === 'both' || this.config.reporting.format === 'json') {
      const jsonPath = reportPath.replace('.html', '.json');
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[Reporter] JSON report saved: ${jsonPath}`);
    }

    return reportPath;
  }

  private generateSummarySection(result: TestSuiteResult): string {
    const statusColor = result.overallStatus === 'passed' ? '#10b981' : result.overallStatus === 'failed' ? '#ef4444' : '#f59e0b';
    const successRate = ((result.passedPhases / result.totalPhases) * 100).toFixed(1);

    return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats-grid">
        <div class="stat-card" style="border-left-color: ${statusColor}">
          <span class="stat-label">Overall Status</span>
          <span class="stat-value status-${result.overallStatus}">${result.overallStatus.toUpperCase()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${(result.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Success Rate</span>
          <span class="stat-value">${successRate}%</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Cost</span>
          <span class="stat-value">$${result.totalCost.toFixed(4)}</span>
        </div>
      </div>

      <div class="phase-breakdown">
        <div class="phase-stat passed">
          <span class="count">${result.passedPhases}</span>
          <span class="label">Passed</span>
        </div>
        <div class="phase-stat failed">
          <span class="count">${result.failedPhases}</span>
          <span class="label">Failed</span>
        </div>
        <div class="phase-stat unknown">
          <span class="count">${result.unknownPhases}</span>
          <span class="label">Unknown</span>
        </div>
        <div class="phase-stat skipped">
          <span class="count">${result.skippedPhases}</span>
          <span class="label">Skipped</span>
        </div>
      </div>

      <p class="summary-text">${result.summary}</p>
    </section>`;
  }

  private generatePhaseResultsSection(result: TestSuiteResult): string {
    const phaseRows = result.phaseResults
      .map((phase) => {
        const statusIcon = phase.status === 'passed' ? '✅' : phase.status === 'failed' ? '❌' : phase.status === 'unknown' ? '❓' : '⏭️';
        const confidenceBadge = phase.decision.confidence >= 0.8 ? 'high' : phase.decision.confidence >= 0.6 ? 'medium' : 'low';

        return `
        <tr class="phase-row status-${phase.status}">
          <td>${statusIcon}</td>
          <td><strong>${phase.phase.name}</strong></td>
          <td>${phase.decision.state}</td>
          <td><span class="confidence-badge ${confidenceBadge}">${(phase.decision.confidence * 100).toFixed(0)}%</span></td>
          <td>${phase.decision.issues.length}</td>
          <td>${(phase.duration / 1000).toFixed(1)}s</td>
          <td>
            ${phase.rtlResult ? `<span class="rtl-score">RTL: ${phase.rtlResult.overallScore.toFixed(1)}/10</span>` : '-'}
          </td>
          <td>
            ${phase.decision.reason}
            ${phase.error ? `<br><span class="error-text">Error: ${phase.error}</span>` : ''}
          </td>
        </tr>`;
      })
      .join('');

    return `
    <section class="phase-results">
      <h2>Phase Results</h2>
      <table class="results-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Phase</th>
            <th>Decision</th>
            <th>Confidence</th>
            <th>Issues</th>
            <th>Duration</th>
            <th>RTL Score</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${phaseRows}
        </tbody>
      </table>
    </section>`;
  }

  private generateCostSection(result: TestSuiteResult): string {
    if (!this.config.reporting.trackCosts) {
      return '';
    }

    return `
    <section class="cost-section">
      <h2>Cost Analysis</h2>
      <div class="cost-summary">
        <p><strong>Total Tokens:</strong> ${result.totalTokens.toLocaleString()}</p>
        <p><strong>Total Cost:</strong> $${result.totalCost.toFixed(4)}</p>
        <p><strong>Average Cost per Phase:</strong> $${(result.totalCost / result.totalPhases).toFixed(4)}</p>
      </div>
      <p class="cost-note">
        💡 Using Vertex AI batch processing (5-10 screenshots per request) provides ~80% cost savings compared to individual requests.
      </p>
    </section>`;
  }

  private generateIssuesSection(result: TestSuiteResult): string {
    const allIssues = result.phaseResults.flatMap((phase) => phase.decision.issues);

    if (allIssues.length === 0) {
      return `
      <section class="issues-section">
        <h2>Issues</h2>
        <p class="no-issues">🎉 No issues detected!</p>
      </section>`;
    }

    const criticalIssues = allIssues.filter((i) => i.severity === 'critical');
    const highIssues = allIssues.filter((i) => i.severity === 'high');
    const mediumIssues = allIssues.filter((i) => i.severity === 'medium');
    const lowIssues = allIssues.filter((i) => i.severity === 'low');

    const issueRows = allIssues
      .slice(0, 20) // Limit to first 20
      .map((issue) => {
        const severityColor =
          issue.severity === 'critical' ? '#dc2626' :
          issue.severity === 'high' ? '#ea580c' :
          issue.severity === 'medium' ? '#f59e0b' : '#6b7280';

        return `
        <div class="issue-card" style="border-left-color: ${severityColor}">
          <div class="issue-header">
            <span class="severity-badge ${issue.severity}">${issue.severity.toUpperCase()}</span>
            <span class="category-badge">${issue.category}</span>
          </div>
          <h3>${issue.title}</h3>
          <p><strong>Description:</strong> ${issue.description}</p>
          <p><strong>Suggestion:</strong> ${issue.suggestion}</p>
          ${issue.location ? `<p><strong>Location:</strong> ${issue.location}</p>` : ''}
          <p class="issue-meta">Confidence: ${(issue.confidence * 100).toFixed(0)}%${issue.location ? ` • Location: ${issue.location}` : ''}</p>
        </div>`;
      })
      .join('');

    return `
    <section class="issues-section">
      <h2>Issues Detected (${allIssues.length})</h2>
      <div class="issue-summary">
        <span class="issue-count critical">${criticalIssues.length} Critical</span>
        <span class="issue-count high">${highIssues.length} High</span>
        <span class="issue-count medium">${mediumIssues.length} Medium</span>
        <span class="issue-count low">${lowIssues.length} Low</span>
      </div>
      <div class="issues-list">
        ${issueRows}
      </div>
      ${allIssues.length > 20 ? `<p class="more-issues">+ ${allIssues.length - 20} more issues (see JSON report)</p>` : ''}
    </section>`;
  }

  private generateArtifactsSection(result: TestSuiteResult): string {
    const allScreenshots = result.phaseResults.flatMap((phase) => phase.artifacts.screenshots);
    const allErrors = result.phaseResults.flatMap((phase) => phase.artifacts.errors);

    return `
    <section class="artifacts-section">
      <h2>Artifacts</h2>
      <div class="artifact-stats">
        <p><strong>Screenshots:</strong> ${allScreenshots.length}</p>
        <p><strong>HTML Snapshots:</strong> ${result.phaseResults.flatMap((p) => p.artifacts.htmlSnapshots).length}</p>
        <p><strong>Network Logs:</strong> ${result.phaseResults.flatMap((p) => p.artifacts.networkLogs).length}</p>
        <p><strong>Console Logs:</strong> ${result.phaseResults.flatMap((p) => p.artifacts.consoleLogs).length}</p>
        <p><strong>Errors:</strong> ${allErrors.length}</p>
      </div>

      ${allErrors.length > 0 ? `
        <div class="errors-section">
          <h3>Errors</h3>
          ${allErrors.map((error) => `
            <div class="error-box">
              <p><strong>${error.phase}:</strong> ${error.message}</p>
              ${error.stack ? `<pre>${error.stack}</pre>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </section>`;
  }

  private getCSS(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; line-height: 1.6; }
      .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      header { text-align: center; margin-bottom: 3rem; }
      header h1 { font-size: 2.5rem; color: #1f2937; margin-bottom: 0.5rem; }
      .suite-name { font-size: 1.25rem; color: #6b7280; }
      .timestamp { color: #9ca3af; font-size: 0.875rem; }

      section { background: white; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      h2 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }

      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
      .stat-card { padding: 1.5rem; border-left: 4px solid #3b82f6; background: #f9fafb; border-radius: 0.25rem; }
      .stat-label { display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
      .stat-value { display: block; font-size: 1.875rem; font-weight: 700; color: #111827; }
      .status-passed { color: #10b981; }
      .status-failed { color: #ef4444; }
      .status-partial { color: #f59e0b; }

      .phase-breakdown { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; }
      .phase-stat { text-align: center; padding: 1rem 2rem; border-radius: 0.5rem; }
      .phase-stat.passed { background: #d1fae5; }
      .phase-stat.failed { background: #fee2e2; }
      .phase-stat.unknown { background: #fef3c7; }
      .phase-stat.skipped { background: #e5e7eb; }
      .phase-stat .count { display: block; font-size: 2rem; font-weight: 700; }
      .phase-stat .label { display: block; font-size: 0.875rem; color: #6b7280; }

      .results-table { width: 100%; border-collapse: collapse; }
      .results-table th { text-align: left; padding: 0.75rem; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
      .results-table td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
      .phase-row.status-passed { background: #f0fdf4; }
      .phase-row.status-failed { background: #fef2f2; }
      .phase-row.status-unknown { background: #fffbeb; }

      .confidence-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }
      .confidence-badge.high { background: #d1fae5; color: #065f46; }
      .confidence-badge.medium { background: #fef3c7; color: #92400e; }
      .confidence-badge.low { background: #fee2e2; color: #991b1b; }

      .rtl-score { font-size: 0.875rem; padding: 0.25rem 0.5rem; background: #dbeafe; border-radius: 0.25rem; }
      .error-text { color: #dc2626; font-size: 0.875rem; }

      .cost-summary { background: #f0fdf4; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem; }
      .cost-note { color: #6b7280; font-size: 0.875rem; font-style: italic; }

      .issue-summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
      .issue-count { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; }
      .issue-count.critical { background: #fecaca; color: #991b1b; }
      .issue-count.high { background: #fed7aa; color: #9a3412; }
      .issue-count.medium { background: #fef3c7; color: #92400e; }
      .issue-count.low { background: #e5e7eb; color: #374151; }

      .issue-card { border-left: 4px solid #3b82f6; padding: 1.5rem; background: #f9fafb; border-radius: 0.25rem; margin-bottom: 1rem; }
      .issue-header { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
      .severity-badge { padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
      .severity-badge.critical { background: #dc2626; color: white; }
      .severity-badge.high { background: #ea580c; color: white; }
      .severity-badge.medium { background: #f59e0b; color: white; }
      .severity-badge.low { background: #6b7280; color: white; }
      .category-badge { padding: 0.25rem 0.75rem; background: #dbeafe; border-radius: 0.25rem; font-size: 0.75rem; }
      .issue-card h3 { margin: 0.5rem 0; color: #111827; }
      .issue-meta { font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }

      .no-issues { text-align: center; font-size: 1.5rem; color: #10b981; padding: 2rem; }
      .more-issues { text-align: center; color: #6b7280; font-style: italic; margin-top: 1rem; }

      .artifact-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
      .error-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 1rem; margin-bottom: 1rem; border-radius: 0.25rem; }
      .error-box pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 0.25rem; overflow-x: auto; font-size: 0.75rem; margin-top: 0.5rem; }
    `;
  }
}
