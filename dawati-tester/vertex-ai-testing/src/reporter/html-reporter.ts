import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteResult, TestConfig, PhaseResult, CostBreakdown, TotalCostReport, TrendAnalysis } from '../types';

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
    ${this.generateTrendSection(result)}
    ${this.generateChecklistSection(result)}
    ${this.generatePhaseResultsSection(result)}
    ${this.generateLevel1Section(result)}
    ${this.generateLevel2Section(result)}
    ${this.generateLevel3Section(result)}
    ${this.generatePerformanceSection(result)}
    ${this.generateSecuritySection(result)}
    ${this.generateWCAGSection(result)}
    ${this.generateImageAssetSection(result)}
    ${this.generatePhaseChecklistDetails(result)}
    ${this.generateCostSection(result)}
    ${this.generateIssuesSection(result)}
    ${this.generateScreenshotsSection(result)}
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

  private generateChecklistSection(result: TestSuiteResult): string {
    const cl = result.checklistScore;
    if (!cl) {
      return `
      <section class="checklist-section">
        <h2>Checklist Coverage</h2>
        <p style="color: #9CA3AF;">Checklist not available (MASTER-TEST-CHECKLIST.md not found)</p>
      </section>`;
    }

    const scoreColor = cl.overallScore >= 80 ? '#10b981' : cl.overallScore >= 50 ? '#f59e0b' : '#ef4444';
    const reqColor = cl.requiredScore === 100 ? '#10b981' : '#ef4444';
    const barWidth = cl.overallScore;

    return `
    <section class="checklist-section">
      <h2>Checklist Coverage (Score 5)</h2>
      <div class="stats-grid">
        <div class="stat-card" style="border-left-color: ${scoreColor}">
          <span class="stat-label">Overall Coverage</span>
          <span class="stat-value" style="color: ${scoreColor}">${cl.overallScore}%</span>
        </div>
        <div class="stat-card" style="border-left-color: ${reqColor}">
          <span class="stat-label">Required (P0)</span>
          <span class="stat-value" style="color: ${reqColor}">${cl.requiredScore}%</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Passing</span>
          <span class="stat-value">${cl.passingItems}/${cl.totalItems}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Missing Tests</span>
          <span class="stat-value">${cl.missingItems}</span>
        </div>
      </div>
      <div style="background: #e5e7eb; border-radius: 9999px; height: 24px; margin: 1rem 0; overflow: hidden;">
        <div style="background: ${scoreColor}; height: 100%; width: ${barWidth}%; border-radius: 9999px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.75rem;">
          ${barWidth > 10 ? cl.overallScore + '%' : ''}
        </div>
      </div>
      <div class="phase-breakdown">
        <div class="phase-stat passed"><span class="count">${cl.passingItems}</span><span class="label">Passing</span></div>
        <div class="phase-stat failed"><span class="count">${cl.failingItems}</span><span class="label">Failing</span></div>
        <div class="phase-stat unknown"><span class="count">${cl.testedItems - cl.passingItems - cl.failingItems}</span><span class="label">Partial</span></div>
        <div class="phase-stat skipped"><span class="count">${cl.missingItems}</span><span class="label">Missing</span></div>
      </div>
    </section>`;
  }

  private generatePhaseResultsSection(result: TestSuiteResult): string {
    const phaseRows = result.phaseResults
      .map((phase) => {
        const statusIcon = phase.status === 'passed' ? '✅' : phase.status === 'failed' ? '❌' : phase.status === 'unknown' ? '❓' : '⏭️';
        const confidenceBadge = phase.decision.confidence >= 0.8 ? 'high' : phase.decision.confidence >= 0.6 ? 'medium' : 'low';

        // Extract color score from RTL checks
        const colorCheck = phase.rtlResult?.checks?.find((c: any) => c.checkName === 'Design System Color Consistency');
        const colorScore = colorCheck ? colorCheck.score : null;

        return `
        <tr class="phase-row status-${phase.status}">
          <td>${statusIcon}</td>
          <td><strong>${phase.phase.name}</strong></td>
          <td>${phase.decision.state}</td>
          <td><span class="confidence-badge ${confidenceBadge}">${(phase.decision.confidence * 100).toFixed(0)}%</span></td>
          <td>${phase.decision.issues.length}</td>
          <td>${(phase.duration / 1000).toFixed(1)}s</td>
          <td>
            ${phase.rtlResult ? `<span class="score-badge ${phase.rtlResult.overallScore >= 7 ? 'score-good' : 'score-bad'}">${phase.rtlResult.overallScore.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${colorScore !== null ? `<span class="score-badge ${colorScore >= 7 ? 'score-good' : 'score-bad'}">${colorScore.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.codeQualityResult ? `<span class="score-badge ${phase.codeQualityResult.score >= 7 ? 'score-good' : 'score-bad'}">${phase.codeQualityResult.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.phaseChecklist && phase.phaseChecklist.items.length > 0
              ? `<span class="score-badge ${phase.phaseChecklist.score >= 50 ? 'score-good' : 'score-bad'}">${phase.phaseChecklist.passing}/${phase.phaseChecklist.items.length} (${phase.phaseChecklist.score}%)</span>`
              : '-'}
          </td>
          <td>
            ${phase.componentConsistency ? `<span class="score-badge ${phase.componentConsistency.score >= 7 ? 'score-good' : 'score-bad'}">${phase.componentConsistency.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.formValidation ? `<span class="score-badge ${phase.formValidation.score >= 7 ? 'score-good' : 'score-bad'}">${phase.formValidation.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.backendIntegration ? `<span class="score-badge ${phase.backendIntegration.score >= 7 ? 'score-good' : 'score-bad'}">${phase.backendIntegration.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.performanceResult ? `<span class="score-badge ${phase.performanceResult.score >= 7 ? 'score-good' : 'score-bad'}">${phase.performanceResult.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.securityResult ? `<span class="score-badge ${phase.securityResult.score >= 7 ? 'score-good' : 'score-bad'}">${phase.securityResult.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.wcagResult ? `<span class="score-badge ${phase.wcagResult.score >= 7 ? 'score-good' : 'score-bad'}">${phase.wcagResult.score.toFixed(1)}</span>` : '-'}
          </td>
          <td>
            ${phase.decision.reason.substring(0, 120)}${phase.decision.reason.length > 120 ? '...' : ''}
            ${phase.error ? `<br><span class="error-text">Error: ${phase.error}</span>` : ''}
          </td>
        </tr>`;
      })
      .join('');

    return `
    <section class="phase-results">
      <h2>Phase Results</h2>
      <div style="overflow-x: auto;">
      <table class="results-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Phase</th>
            <th>Decision</th>
            <th>Confidence</th>
            <th>Issues</th>
            <th>Duration</th>
            <th>RTL /10</th>
            <th>Color /10</th>
            <th>Code /10</th>
            <th>Checklist</th>
            <th>L1: Visual</th>
            <th>L2: Forms</th>
            <th>L3: API</th>
            <th>Perf</th>
            <th>Security</th>
            <th>WCAG</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${phaseRows}
        </tbody>
      </table>
      </div>
    </section>`;
  }

  private generateLevel1Section(result: TestSuiteResult): string {
    const phasesWithL1 = result.phaseResults.filter(p => p.componentConsistency);
    if (phasesWithL1.length === 0) return '';

    const rows = phasesWithL1.map(phase => {
      const cc = phase.componentConsistency!;
      const annotated = this.renderAnnotatedScreenshot(phase);
      const inconsistencyRows = cc.inconsistencies.slice(0, 10).map(inc =>
        `<tr>
          <td>${inc.component}</td>
          <td>${inc.property}</td>
          <td>${inc.pageA}</td>
          <td>${inc.valueA}</td>
          <td>${inc.pageB}</td>
          <td>${inc.valueB}</td>
          <td><span class="issue-count ${inc.severity}">${inc.diffPercent}%</span></td>
        </tr>`
      ).join('');

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${cc.score >= 7 ? 'score-good' : 'score-bad'}">${cc.score.toFixed(1)}/10</span></h3>
        <p>${cc.summary}</p>
        ${annotated}
        ${inconsistencyRows ? `
        <table class="results-table" style="font-size: 0.85rem;">
          <thead><tr><th>Component</th><th>Property</th><th>Page A</th><th>Value A</th><th>Page B</th><th>Value B</th><th>Diff</th></tr></thead>
          <tbody>${inconsistencyRows}</tbody>
        </table>` : ''}
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Level 1: Visual & Component Consistency</h2>
      <p style="color: #6b7280;">Checks back button position, header uniformity, tab bar, button consistency across pages</p>
      ${rows}
    </section>`;
  }

  private generateLevel2Section(result: TestSuiteResult): string {
    const phasesWithL2 = result.phaseResults.filter(p => p.formValidation || p.hardcodedDetection);
    if (phasesWithL2.length === 0) return '';

    const rows = phasesWithL2.map(phase => {
      const parts: string[] = [];

      if (phase.formValidation && phase.formValidation.violations.length > 0) {
        const fv = phase.formValidation;
        const violationRows = fv.violations.slice(0, 8).map(v =>
          `<tr>
            <td>${v.field}</td>
            <td>${v.type}</td>
            <td><span class="issue-count ${v.severity}">${v.severity}</span></td>
            <td>${v.message}</td>
            <td>${v.suggestion}</td>
          </tr>`
        ).join('');
        parts.push(`
          <h4>Form Validation <span class="score-badge ${fv.score >= 7 ? 'score-good' : 'score-bad'}">${fv.score.toFixed(1)}/10</span></h4>
          <table class="results-table" style="font-size: 0.85rem;">
            <thead><tr><th>Field</th><th>Type</th><th>Severity</th><th>Issue</th><th>Suggestion</th></tr></thead>
            <tbody>${violationRows}</tbody>
          </table>`);
      }

      if (phase.hardcodedDetection) {
        const hd = phase.hardcodedDetection;
        const allItems = [...hd.hardcodedStrings, ...hd.mockData, ...hd.placeholders, ...hd.disconnectedElements];
        if (allItems.length > 0) {
          const itemRows = allItems.slice(0, 10).map(item =>
            `<tr>
              <td>${item.type}</td>
              <td><span class="issue-count ${item.severity}">${item.severity}</span></td>
              <td><code>${item.value}</code></td>
              <td>${item.location}</td>
              <td>${item.suggestion}</td>
            </tr>`
          ).join('');
          parts.push(`
            <h4>Hardcoded Values <span class="score-badge ${hd.score >= 7 ? 'score-good' : 'score-bad'}">${hd.score.toFixed(1)}/10</span></h4>
            <table class="results-table" style="font-size: 0.85rem;">
              <thead><tr><th>Type</th><th>Severity</th><th>Value</th><th>Location</th><th>Suggestion</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>`);
        }
      }

      if (parts.length === 0) return '';

      return `<div class="checklist-phase-block"><h3>${phase.phase.name}</h3>${parts.join('')}</div>`;
    }).join('');

    return `
    <section>
      <h2>Level 2: Data Validation & Component Testing</h2>
      <p style="color: #6b7280;">Form field validation, hardcoded strings/values, mock data, disconnected elements</p>
      ${rows}
    </section>`;
  }

  private generateLevel3Section(result: TestSuiteResult): string {
    const phasesWithL3 = result.phaseResults.filter(p => p.backendIntegration && p.backendIntegration.totalRequests > 0);
    if (phasesWithL3.length === 0) return '';

    const rows = phasesWithL3.map(phase => {
      const bi = phase.backendIntegration!;
      const apiRows = bi.apiResults.slice(0, 15).map(api =>
        `<tr>
          <td><span class="score-badge ${api.passed ? 'score-good' : 'score-bad'}">${api.passed ? '✓' : '✗'}</span></td>
          <td>${api.method}</td>
          <td style="font-family: monospace; font-size: 0.8rem;">${api.url}</td>
          <td>${api.status}</td>
          <td>${api.latencyMs > 0 ? api.latencyMs + 'ms' : '-'}</td>
          <td>${api.error || ''}</td>
        </tr>`
      ).join('');

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${bi.score >= 7 ? 'score-good' : 'score-bad'}">${bi.score.toFixed(1)}/10</span></h3>
        <p>${bi.summary}</p>
        ${bi.stateManagement.issues.length > 0 ? `<p style="color: #f59e0b;">State issues: ${bi.stateManagement.issues.join('; ')}</p>` : ''}
        ${apiRows ? `
        <table class="results-table" style="font-size: 0.85rem;">
          <thead><tr><th>OK</th><th>Method</th><th>URL</th><th>Status</th><th>Latency</th><th>Error</th></tr></thead>
          <tbody>${apiRows}</tbody>
        </table>` : ''}
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Level 3: Backend Integration & Data Flow</h2>
      <p style="color: #6b7280;">API call monitoring, response codes, latency, state management</p>
      ${rows}
    </section>`;
  }

  private generatePhaseChecklistDetails(result: TestSuiteResult): string {
    const phasesWithChecklist = result.phaseResults.filter(
      p => p.phaseChecklist && p.phaseChecklist.items.length > 0
    );

    if (phasesWithChecklist.length === 0) return '';

    const phaseBlocks = phasesWithChecklist.map(phase => {
      const cl = phase.phaseChecklist!;
      const itemRows = cl.items.map(item => {
        const statusIcon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : item.status === 'PARTIAL' ? '⚠️' : item.status === 'MISSING' ? '🚫' : '📝';
        const priorityClass = item.priority === 'P0' ? 'critical' : item.priority === 'P1' ? 'high' : 'medium';
        return `<tr>
          <td>${statusIcon}</td>
          <td><code>${item.id}</code></td>
          <td>${item.name}</td>
          <td><span class="issue-count ${priorityClass}">${item.priority}</span></td>
        </tr>`;
      }).join('');

      const scoreColor = cl.score >= 80 ? '#10b981' : cl.score >= 50 ? '#f59e0b' : '#ef4444';

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span style="color: ${scoreColor}; font-size: 0.9rem;">(${cl.passing}/${cl.items.length} = ${cl.score}%)</span></h3>
        <table class="results-table" style="font-size: 0.85rem;">
          <thead><tr><th>Status</th><th>ID</th><th>Feature</th><th>Priority</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
    }).join('');

    return `
    <section class="checklist-details">
      <h2>Per-Page Checklist Coverage</h2>
      <p style="color: #6b7280;">Each page is matched to its corresponding checklist items from MASTER-TEST-CHECKLIST.md</p>
      ${phaseBlocks}
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

  private renderAnnotatedScreenshot(phase: PhaseResult): string {
    const cc = phase.componentConsistency;
    if (!cc || !cc.elementPositions || cc.elementPositions.length === 0) return '';

    const screenshotPath = phase.decision.metadata.screenshotPath || phase.artifacts.screenshots[0];
    if (!screenshotPath) return '';

    const relative = this.toRelativePath(screenshotPath);
    if (!relative) return '';

    const boxes = cc.elementPositions
      .filter(p => p.viewportWidth > 0 && p.viewportHeight > 0)
      .slice(0, 20)
      .map((p) => {
        const left = (p.x / p.viewportWidth) * 100;
        const top = (p.y / p.viewportHeight) * 100;
        const width = (p.width / p.viewportWidth) * 100;
        const height = (p.height / p.viewportHeight) * 100;
        const label = p.element.replace(/_/g, ' ');
        return `<div class="overlay-box ${p.element}" style="left:${left.toFixed(2)}%; top:${top.toFixed(2)}%; width:${width.toFixed(2)}%; height:${height.toFixed(2)}%;">
          <span class="overlay-label">${label}</span>
        </div>`;
      })
      .join('');

    return `
      <div class="annotated-block">
        <div class="annotated-title">Annotated Positions (positional diffs reference)</div>
        <div class="annotated-container">
          <img src="${relative}" alt="Annotated ${phase.phase.name}">
          ${boxes}
        </div>
        <div class="annotated-legend">
          <span class="legend-item back-button">Back</span>
          <span class="legend-item header">Header</span>
          <span class="legend-item tab-bar">Tab Bar</span>
          <span class="legend-item primary-button">Primary Button</span>
          <span class="legend-item page-title">Title</span>
        </div>
      </div>`;
  }

  private toRelativePath(filepath: string): string | null {
    try {
      const rel = path.relative(this.config.reporting.reportsDir, filepath);
      return rel.split(path.sep).join('/');
    } catch {
      return null;
    }
  }

  private generateTrendSection(result: TestSuiteResult): string {
    const trend = result.trendAnalysis;
    if (!trend) return '';
    if (trend.degradation.length === 0 && trend.improvements.length === 0 && Object.keys(trend.sparklines).length === 0) return '';

    const degradationHtml = trend.degradation.length > 0
      ? `<div style="margin-bottom: 1rem;">
          <h3 style="color: #ef4444;">Degradations</h3>
          <ul>${trend.degradation.map(d => `<li style="color: #dc2626;">${d}</li>`).join('')}</ul>
        </div>`
      : '';

    const improvementHtml = trend.improvements.length > 0
      ? `<div style="margin-bottom: 1rem;">
          <h3 style="color: #10b981;">Improvements</h3>
          <ul>${trend.improvements.map(i => `<li style="color: #059669;">${i}</li>`).join('')}</ul>
        </div>`
      : '';

    const stableHtml = trend.stable.length > 0
      ? `<p style="color: #6b7280;">Stable: ${trend.stable.join(', ')}</p>`
      : '';

    // SVG sparklines
    const sparklineHtml = Object.entries(trend.sparklines)
      .filter(([, values]) => values.length > 1)
      .map(([name, values]) => {
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const w = 200;
        const h = 40;
        const points = values.map((v, i) => {
          const x = (i / (values.length - 1)) * w;
          const y = h - ((v - min) / range) * h;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const latest = values[values.length - 1];
        return `<div style="display: inline-block; margin: 0.5rem 1rem;">
          <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 2px;">${name} (${latest})</div>
          <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
            <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" />
          </svg>
        </div>`;
      }).join('');

    return `
    <section>
      <h2>Trend Analysis</h2>
      ${degradationHtml}
      ${improvementHtml}
      ${stableHtml}
      ${sparklineHtml ? `<div style="margin-top: 1rem;"><h3>Sparklines (recent runs)</h3>${sparklineHtml}</div>` : ''}
    </section>`;
  }

  private generatePerformanceSection(result: TestSuiteResult): string {
    const phasesWithPerf = result.phaseResults.filter(p => p.performanceResult);
    if (phasesWithPerf.length === 0) return '';

    const rows = phasesWithPerf.map(phase => {
      const perf = phase.performanceResult!;
      const cwv = perf.coreWebVitals;
      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${perf.score >= 7 ? 'score-good' : 'score-bad'}">${perf.score.toFixed(1)}/10</span></h3>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
          <div class="stat-card"><span class="stat-label">LCP</span><span class="stat-value" style="font-size:1.2rem;">${cwv.lcp}ms</span></div>
          <div class="stat-card"><span class="stat-label">FCP</span><span class="stat-value" style="font-size:1.2rem;">${cwv.fcp}ms</span></div>
          <div class="stat-card"><span class="stat-label">CLS</span><span class="stat-value" style="font-size:1.2rem;">${cwv.cls.toFixed(3)}</span></div>
          <div class="stat-card"><span class="stat-label">TTI</span><span class="stat-value" style="font-size:1.2rem;">${cwv.tti}ms</span></div>
          <div class="stat-card"><span class="stat-label">Heap</span><span class="stat-value" style="font-size:1.2rem;">${perf.memoryUsage.heapUsedMB}MB</span></div>
          <div class="stat-card"><span class="stat-label">Resources</span><span class="stat-value" style="font-size:1.2rem;">${perf.resourceCount.total}</span></div>
        </div>
        ${perf.consoleErrors.errorCount > 0 ? `<p style="color: #ef4444;">Console errors: ${perf.consoleErrors.errorCount} (${perf.consoleErrors.errors.slice(0, 3).join('; ')})</p>` : ''}
        ${perf.memoryUsage.growthDetected ? `<p style="color: #f59e0b;">Potential memory leak detected</p>` : ''}
        <p style="color: #6b7280; font-size: 0.85rem;">${perf.summary}</p>
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Performance (Core Web Vitals)</h2>
      <p style="color: #6b7280;">LCP, FCP, CLS, TTI, memory usage, resource count, console errors</p>
      ${rows}
    </section>`;
  }

  private generateSecuritySection(result: TestSuiteResult): string {
    const phasesWithSec = result.phaseResults.filter(p => p.securityResult);
    if (phasesWithSec.length === 0) return '';

    const rows = phasesWithSec.map(phase => {
      const sec = phase.securityResult!;
      const allVulns = [...sec.xssVulnerabilities, ...sec.sensitiveDataExposure, ...sec.authProtection];
      if (allVulns.length === 0 && sec.csrfProtection) {
        return `
        <div class="checklist-phase-block">
          <h3>${phase.phase.name} <span class="score-badge score-good">${sec.score.toFixed(1)}/10</span></h3>
          <p style="color: #10b981;">No security vulnerabilities detected. CSRF protection: OK</p>
        </div>`;
      }

      const vulnRows = allVulns.slice(0, 10).map(v =>
        `<tr>
          <td><span class="issue-count ${v.severity}">${v.severity}</span></td>
          <td>${v.type}</td>
          <td>${v.description}</td>
          <td style="font-size: 0.8rem;">${v.location}</td>
          <td>${v.suggestion}</td>
        </tr>`
      ).join('');

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${sec.score >= 7 ? 'score-good' : 'score-bad'}">${sec.score.toFixed(1)}/10</span></h3>
        <p>CSRF protection: ${sec.csrfProtection ? 'Yes' : 'No'}</p>
        ${vulnRows ? `
        <table class="results-table" style="font-size: 0.85rem;">
          <thead><tr><th>Severity</th><th>Type</th><th>Description</th><th>Location</th><th>Suggestion</th></tr></thead>
          <tbody>${vulnRows}</tbody>
        </table>` : ''}
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Security Analysis</h2>
      <p style="color: #6b7280;">XSS prevention, CSRF protection, sensitive data exposure, auth protection</p>
      ${rows}
    </section>`;
  }

  private generateWCAGSection(result: TestSuiteResult): string {
    const phasesWithWCAG = result.phaseResults.filter(p => p.wcagResult);
    if (phasesWithWCAG.length === 0) return '';

    const rows = phasesWithWCAG.map(phase => {
      const wcag = phase.wcagResult!;
      const violationRows = wcag.violations.slice(0, 10).map(v =>
        `<tr>
          <td><span class="issue-count ${v.impact === 'critical' ? 'critical' : v.impact === 'serious' ? 'high' : 'medium'}">${v.impact}</span></td>
          <td>${v.wcagCriteria}</td>
          <td>${v.description}</td>
          <td>${v.nodes} elements</td>
        </tr>`
      ).join('');

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${wcag.score >= 7 ? 'score-good' : 'score-bad'}">${wcag.score.toFixed(1)}/10</span></h3>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
          <div class="stat-card"><span class="stat-label">Violations</span><span class="stat-value" style="font-size:1.2rem;">${wcag.violations.length}</span></div>
          <div class="stat-card"><span class="stat-label">Passes</span><span class="stat-value" style="font-size:1.2rem;">${wcag.passes}</span></div>
          <div class="stat-card"><span class="stat-label">Focus Order</span><span class="stat-value" style="font-size:1.2rem;">${wcag.focusOrder ? 'OK' : 'Fail'}</span></div>
          <div class="stat-card"><span class="stat-label">Keyboard Nav</span><span class="stat-value" style="font-size:1.2rem;">${wcag.keyboardNavigable ? 'OK' : 'Fail'}</span></div>
          <div class="stat-card"><span class="stat-label">Contrast Pass</span><span class="stat-value" style="font-size:1.2rem;">${wcag.contrastRatio.passing}</span></div>
          <div class="stat-card"><span class="stat-label">Contrast Fail</span><span class="stat-value" style="font-size:1.2rem;">${wcag.contrastRatio.failing}</span></div>
        </div>
        ${violationRows ? `
        <table class="results-table" style="font-size: 0.85rem;">
          <thead><tr><th>Impact</th><th>WCAG</th><th>Description</th><th>Affected</th></tr></thead>
          <tbody>${violationRows}</tbody>
        </table>` : ''}
      </div>`;
    }).join('');

    return `
    <section>
      <h2>WCAG 2.1 AA Accessibility</h2>
      <p style="color: #6b7280;">Focus order, color contrast, ARIA roles, keyboard navigation, touch targets, motion preferences</p>
      ${rows}
    </section>`;
  }

  private generateImageAssetSection(result: TestSuiteResult): string {
    const phasesWithImg = result.phaseResults.filter(p => p.imageAssetResult);
    if (phasesWithImg.length === 0) return '';

    const rows = phasesWithImg.map(phase => {
      const img = phase.imageAssetResult!;
      const parts: string[] = [];

      if (img.brokenImages.length > 0) {
        parts.push(`<div style="margin: 0.5rem 0;"><strong style="color: #ef4444;">Broken Images (${img.brokenImages.length}):</strong><ul>${img.brokenImages.slice(0, 5).map(s => `<li style="font-size: 0.85rem; word-break: break-all;">${s}</li>`).join('')}</ul></div>`);
      }
      if (img.missingAltText.length > 0) {
        parts.push(`<div style="margin: 0.5rem 0;"><strong style="color: #f59e0b;">Missing Alt Text (${img.missingAltText.length}):</strong><ul>${img.missingAltText.slice(0, 5).map(s => `<li style="font-size: 0.85rem; word-break: break-all;">${s}</li>`).join('')}</ul></div>`);
      }
      if (img.oversizedImages.length > 0) {
        parts.push(`<div style="margin: 0.5rem 0;"><strong style="color: #f59e0b;">Oversized Images (${img.oversizedImages.length}):</strong><ul>${img.oversizedImages.slice(0, 5).map(o => `<li style="font-size: 0.85rem;">${o.src} (${o.sizeMB}MB)</li>`).join('')}</ul></div>`);
      }

      const fontRows = img.fontLoadingStatus.map(f =>
        `<span class="score-badge ${f.loaded ? 'score-good' : 'score-bad'}" style="margin: 2px;">${f.fontFamily}: ${f.loaded ? 'Loaded' : 'Missing'}</span>`
      ).join(' ');

      return `
      <div class="checklist-phase-block">
        <h3>${phase.phase.name} <span class="score-badge ${img.score >= 7 ? 'score-good' : 'score-bad'}">${img.score.toFixed(1)}/10</span></h3>
        <p style="color: #6b7280;">${img.summary}</p>
        ${fontRows ? `<div style="margin: 0.5rem 0;"><strong>Font Status:</strong> ${fontRows}</div>` : ''}
        ${parts.join('')}
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Image & Asset Health</h2>
      <p style="color: #6b7280;">Broken images, missing alt text, font loading (Cairo), oversized images</p>
      ${rows}
    </section>`;
  }

  private generateScreenshotsSection(result: TestSuiteResult): string {
    const phasesWithScreenshots = result.phaseResults.filter(
      p => p.artifacts.screenshots.length > 0 || p.decision.metadata.screenshotPath
    );
    if (phasesWithScreenshots.length === 0) return '';

    const screenshotCards = phasesWithScreenshots.map(phase => {
      const screenshotPath = phase.decision.metadata.screenshotPath || phase.artifacts.screenshots[0];
      if (!screenshotPath) return '';

      const relative = this.toRelativePath(screenshotPath);
      if (!relative) return '';

      // Try to embed as base64 if file exists
      let imgSrc = relative;
      try {
        if (fs.existsSync(screenshotPath)) {
          const data = fs.readFileSync(screenshotPath);
          const base64 = data.toString('base64');
          imgSrc = `data:image/png;base64,${base64}`;
        }
      } catch { /* fallback to relative path */ }

      const statusIcon = phase.status === 'passed' ? '&#x2705;' : phase.status === 'failed' ? '&#x274C;' : '&#x2753;';

      return `
      <div class="screenshot-card">
        <div class="screenshot-header">${statusIcon} ${phase.phase.name}</div>
        <img src="${imgSrc}" alt="${phase.phase.name}" class="screenshot-img" loading="lazy" />
      </div>`;
    }).join('');

    return `
    <section>
      <h2>Screenshots</h2>
      <div class="screenshot-grid">
        ${screenshotCards}
      </div>
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
      .score-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 600; min-width: 2.5rem; text-align: center; }
      .score-good { background: #d1fae5; color: #065f46; }
      .score-bad { background: #fee2e2; color: #991b1b; }
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

      .annotated-block { margin: 1rem 0 1.5rem; }
      .annotated-title { font-weight: 600; margin-bottom: 0.5rem; color: #374151; }
      .annotated-container { position: relative; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; background: #fff; }
      .annotated-container img { width: 100%; height: auto; display: block; }
      .overlay-box { position: absolute; border: 2px solid rgba(59,130,246,0.9); box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
      .overlay-label { position: absolute; top: -18px; left: 0; background: rgba(59,130,246,0.9); color: #fff; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; }
      .overlay-box.header { border-color: rgba(16,185,129,0.9); box-shadow: 0 0 0 2px rgba(16,185,129,0.2); }
      .overlay-box.header .overlay-label { background: rgba(16,185,129,0.9); }
      .overlay-box.tab-bar { border-color: rgba(245,158,11,0.9); box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
      .overlay-box.tab-bar .overlay-label { background: rgba(245,158,11,0.9); }
      .overlay-box.primary-button { border-color: rgba(239,68,68,0.9); box-shadow: 0 0 0 2px rgba(239,68,68,0.2); }
      .overlay-box.primary-button .overlay-label { background: rgba(239,68,68,0.9); }
      .overlay-box.page-title { border-color: rgba(99,102,241,0.9); box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
      .overlay-box.page-title .overlay-label { background: rgba(99,102,241,0.9); }
      .overlay-box.back-button { border-color: rgba(14,165,233,0.9); box-shadow: 0 0 0 2px rgba(14,165,233,0.2); }
      .overlay-box.back-button .overlay-label { background: rgba(14,165,233,0.9); }
      .annotated-legend { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
      .legend-item { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #f3f4f6; color: #111827; }
      .legend-item.back-button { background: rgba(14,165,233,0.15); }
      .legend-item.header { background: rgba(16,185,129,0.15); }
      .legend-item.tab-bar { background: rgba(245,158,11,0.15); }
      .legend-item.primary-button { background: rgba(239,68,68,0.15); }
      .legend-item.page-title { background: rgba(99,102,241,0.15); }

      .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
      .screenshot-card { border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; background: #fff; }
      .screenshot-header { padding: 0.5rem 0.75rem; background: #f9fafb; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid #e5e7eb; }
      .screenshot-img { width: 100%; height: auto; display: block; }

      .checklist-phase-block { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
    `;
  }
}
