# Architecture Patterns for v1.1 Hardening & Full Coverage

**Project:** Dawati Autonomous Testing System v1.1
**Research Date:** 2026-02-10
**Focus:** Integration architecture for visual regression, PII masking, CI/CD, security testing, performance testing

---

## Executive Summary

The existing architecture follows a **pipeline orchestration pattern** where `TestOrchestrator` coordinates browser automation (`BrowserManager`), AI analysis (`GeminiClient`), and quality checkers (RTL, Color, Code Quality, Checklist). The v1.1 milestone adds five new capabilities that integrate as:

1. **Visual Regression** — Already integrated, needs enhancement (ignore regions, multi-device baselines)
2. **PII Masking** — Already integrated, needs image masking + CI integration
3. **CI/CD Pipeline** — New component: GitHub Actions workflow orchestration
4. **Security Testing** — New component: parallel security scanner (OWASP checks, dependency audits)
5. **Performance Testing** — New component: Lighthouse integration + custom metrics collector

**Key architectural principle:** New components integrate as **parallel checkers** that run alongside existing checks, feeding results into the unified scoring system. This preserves the current orchestrator pattern while adding new dimensions of quality measurement.

---

## Current Architecture (v1.0)

### Component Map

```
TestOrchestrator (coordinator)
│
├─ BrowserManager (Playwright automation)
│  ├─ navigate/click/fill actions
│  ├─ screenshot capture
│  ├─ HTML snapshot
│  └─ network/console logging
│
├─ GeminiClient (Vertex AI integration)
│  ├─ Single screenshot analysis
│  ├─ Batch analysis (5-10 screenshots)
│  └─ Streaming responses
│
├─ ResponseParser (advisory decision engine)
│  ├─ Parses AI response
│  ├─ Validates against DOM
│  └─ Always returns PASS (advisory)
│
├─ RTLIntegration (18 DOM-level checks)
│  ├─ Direction, alignment, margins
│  ├─ Hardcoded strings (EN/AR)
│  ├─ Currency, dates, BiDi
│  ├─ Mobile tap targets
│  └─ Color consistency (check #11)
│
├─ CodeQualityChecker (6-category analysis)
│  ├─ Static analysis via typescript-eslint
│  ├─ Maps URLs to source files
│  └─ Scores: 0-10 per page
│
├─ ChecklistValidator (coverage tracking)
│  ├─ Parses MASTER-TEST-CHECKLIST.md
│  ├─ Maps phases to checklist items
│  └─ Scores: % passing vs total
│
├─ BaselineManager (visual regression - basic)
│  ├─ Pixel-level comparison (pixelmatch)
│  ├─ Baseline creation/update
│  └─ Diff image generation
│
└─ PIIMasker (HTML masking only)
   ├─ Phone numbers, emails, IBANs
   ├─ Saudi National IDs, credit cards
   └─ Saves masked HTML snapshots
```

### Data Flow (Per Phase)

```
1. BrowserManager executes actions (navigate, click, screenshot)
   → captures screenshot.png + html-snapshot.html

2. PIIMasker creates html-masked.html (but screenshot still contains PII)

3. GeminiClient analyzes screenshot.png
   → returns AIIssue[] (advisory only)

4. RTLIntegration runs 18 DOM checks on Page object
   → returns RTLCheckResult[] with overall score

5. CodeQualityChecker analyzes source files for URL
   → returns violations[] with score

6. ChecklistValidator maps phase to checklist items
   → returns coverage score

7. BaselineManager (if enabled) compares screenshot vs baseline
   → returns diff% and pass/fail

8. Orchestrator ENFORCES thresholds:
   - RTL score < 6.0 → FAIL (overrides AI)
   - Color score < 5.0 → FAIL (overrides AI)
   - Code Quality < 5.0 → FAIL (overrides AI)
   - AI advisory is logged but doesn't block

9. HTMLReporter generates report with all scores
   → HTML + JSON output
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Orchestrator as coordinator** | Single entry point, sequential phase execution, dependency management |
| **AI advisory mode** | Prevents false positives from blocking tests; DOM checks are authoritative |
| **Threshold enforcement in orchestrator** | Centralized pass/fail logic for all quality dimensions |
| **Parallel checkers** | RTL, Color, Code Quality run independently, scores combined |
| **Phase-based execution** | Each test file defines phases[], orchestrator runs sequentially |
| **Artifact-first approach** | All evidence (screenshots, HTML, logs) saved before analysis |

---

## Integration Architecture for New Features

### 1. Visual Regression Enhancement

**Current State:**
- `BaselineManager` exists but is basic (pixel-level comparison, single device)
- No ignore regions, no multi-device baselines, no approval workflow

**Enhancement Architecture:**

```
BaselineManager (enhanced)
│
├─ RegionMasker (NEW)
│  ├─ Define ignore regions (dynamic content areas)
│  ├─ Mask regions before comparison (black boxes)
│  └─ Config: ignoreRegions: { selector: string, reason: string }[]
│
├─ MultiDeviceBaselines (NEW)
│  ├─ Separate baselines per device (iPhone, iPad, Android)
│  ├─ Device-specific diff thresholds
│  └─ Storage: baselines/{device-name}/{baseline-name}.png
│
├─ DiffAnalyzer (ENHANCED)
│  ├─ Pixelmatch for pixel-level diff
│  ├─ Structural similarity (SSIM) for layout changes
│  └─ Diff categorization: layout shift, color shift, content change
│
└─ ApprovalWorkflow (NEW - CI integration)
   ├─ Save diffs to PR artifacts
   ├─ GitHub Actions: comment on PR with diff images
   └─ Manual approval: update baselines via git commit
```

**Integration Point:**
- Runs in orchestrator after screenshot capture (line 236-244 in test-orchestrator.ts)
- Parallel to AI analysis (doesn't block)
- Result stored in `PhaseResult.visualResult`

**Build Order:**
1. RegionMasker (enables dynamic content filtering)
2. MultiDeviceBaselines (prerequisite for device testing)
3. DiffAnalyzer enhancements (better diff categorization)
4. ApprovalWorkflow (CI integration last)

---

### 2. PII Masking Enhancement

**Current State:**
- `PIIMasker` exists but only masks HTML (line 206-211 in test-orchestrator.ts)
- Screenshots sent to Gemini API still contain PII (phone numbers, names, emails visible in UI)

**Enhancement Architecture:**

```
PIIMasker (enhanced)
│
├─ HTMLMasker (EXISTING)
│  └─ Regex-based masking for text content
│
├─ ScreenshotMasker (NEW - CRITICAL)
│  ├─ OCR via Tesseract.js (extract text from screenshot)
│  ├─ Detect PII patterns in extracted text
│  ├─ Redact regions using image manipulation (sharp library)
│  └─ Generate masked-screenshot.png
│
├─ DOMElementMasker (NEW - ALTERNATIVE)
│  ├─ Identify PII-containing elements via selectors
│  ├─ Playwright: hide elements before screenshot
│  └─ Config: piiSelectors: string[] (e.g., '[data-testid="user-phone"]')
│
└─ MaskingReport (NEW)
   ├─ Log what was masked and where
   ├─ Flag screenshots with detected PII
   └─ CI: fail build if unmasked PII detected
```

**Integration Point:**
- **Option A (OCR-based):** After screenshot capture, before sending to Gemini
  - `captureScreenshot()` → `maskScreenshot()` → `analyzeSingle()`
- **Option B (DOM-based):** Before screenshot capture
  - `executeActions()` → `hidePIIElements()` → `captureScreenshot()` → `analyzeSingle()`

**Recommended:** Option B (DOM-based) — faster, more reliable, no OCR dependency

**Build Order:**
1. DOMElementMasker (faster, simpler)
2. ScreenshotMasker (fallback for OCR-based masking if needed)
3. MaskingReport (observability)
4. CI integration (fail on unmasked PII)

**Configuration Example:**
```typescript
piiMasking: {
  enabled: true,
  htmlPatterns: [...], // existing
  domSelectors: [
    '[data-testid="user-phone"]',
    '[data-testid="user-email"]',
    '.user-name',
    '.credit-card-display'
  ],
  ocrFallback: false, // enable if DOM masking insufficient
}
```

---

### 3. CI/CD Pipeline Architecture

**Current State:**
- Tests run manually via `ts-node` on Windows
- No automated execution, no PR integration, no artifact storage

**CI/CD Architecture:**

```
GitHub Actions Workflow
│
├─ Test Execution Job (runs on PR, push to main)
│  ├─ Setup: Node.js, install dependencies
│  ├─ Authenticate: Google Cloud (Vertex AI credentials)
│  ├─ Run: npm run test:all (execute all test suites)
│  └─ Timeout: 30 minutes
│
├─ Artifact Collection Job (parallel, depends on test job)
│  ├─ Collect: screenshots, HTML reports, JSON results
│  ├─ Upload: GitHub Actions artifacts (90-day retention)
│  └─ Archive: visual regression diffs, PII-masked snapshots
│
├─ Report Generation Job (depends on artifact job)
│  ├─ Parse: JSON results from all suites
│  ├─ Generate: Markdown summary (scores, failures, links)
│  ├─ Post: GitHub PR comment with summary + artifact links
│  └─ Status: Set GitHub status check (pass/fail)
│
├─ Baseline Update Job (manual trigger only)
│  ├─ Trigger: workflow_dispatch with input baseline_name
│  ├─ Update: copy current screenshot to baselines/
│  ├─ Commit: push updated baseline to branch
│  └─ Security: require approval from CODEOWNERS
│
└─ Scheduled Regression Job (nightly)
   ├─ Schedule: cron '0 2 * * *' (2 AM UTC)
   ├─ Run: full test suite against production
   ├─ Alert: Slack/email on failure
   └─ Trend: track score history over time
```

**Integration Points:**
1. **Test execution:** Orchestrator already supports JSON output
2. **Artifact storage:** BrowserManager.getArtifacts() provides paths
3. **Reporting:** HTMLReporter output consumed by Report Generation Job
4. **Status checks:** GitHub API called with pass/fail status

**Build Order:**
1. Test Execution Job (core CI functionality)
2. Artifact Collection Job (prerequisite for reporting)
3. Report Generation Job (PR feedback)
4. Baseline Update Job (visual regression workflow)
5. Scheduled Regression Job (ongoing monitoring)

**Workflow File Structure:**
```yaml
# .github/workflows/test-suite.yml
name: Dawati Test Suite
on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      - run: npm install
      - run: npm run test:all
      - uses: actions/upload-artifact@v4
        with:
          name: test-artifacts
          path: |
            reports/
            artifacts/
            baselines/
```

**Configuration Changes:**
- Add `--ci` flag to orchestrator (disables interactive prompts, forces JSON output)
- Add `--github-token` for API integration (post PR comments)
- Environment variable: `VERTEX_AI_CREDENTIALS` (base64-encoded JSON key)

---

### 4. Security Testing Integration

**Current State:**
- No security testing
- Application deployed to Vercel with no security scanning

**Security Testing Architecture:**

```
SecurityScanner (NEW component)
│
├─ OWASPChecker (passive scanning)
│  ├─ Run: during browser automation phases
│  ├─ ZAP Proxy: intercept traffic, detect vulnerabilities
│  ├─ Checks: SQL injection, XSS, CSRF, insecure headers
│  └─ Report: OWASPCheckResult with severity scores
│
├─ DependencyAuditor (static analysis)
│  ├─ Run: npm audit --json (Node.js dependencies)
│  ├─ Run: Trivy scan (Docker images if containerized)
│  ├─ Filter: exclude false positives, prioritize HIGH/CRITICAL
│  └─ Report: DependencyAuditResult with CVE list
│
├─ AuthenticationTester (active testing)
│  ├─ Test: login flow, session management, token handling
│  ├─ Check: password strength, rate limiting, account lockout
│  ├─ Verify: JWT signature, token expiration, refresh flow
│  └─ Report: AuthSecurityResult with vulnerabilities
│
└─ SecureHeadersChecker (passive)
   ├─ Inspect: HTTP response headers from BrowserManager.networkLogs
   ├─ Verify: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
   ├─ Score: security header compliance (0-10)
   └─ Report: HeaderSecurityResult
```

**Integration Point:**
- **Orchestrator level:** Add optional `securityCheck` phase type
- **Parallel execution:** Run during OR after browser automation
- **Result storage:** `PhaseResult.securityResult?: SecurityScanResult`

**Build Order:**
1. SecureHeadersChecker (simplest, uses existing network logs)
2. DependencyAuditor (static, no runtime dependency)
3. AuthenticationTester (requires test scenarios)
4. OWASPChecker (most complex, requires ZAP proxy setup)

**Integration Pattern:**

```typescript
// In test-orchestrator.ts, after line 244 (visual regression)

if (this.config.security.enabled) {
  console.log(`[Orchestrator] Running security checks...`);
  const securityScanner = new SecurityScanner(this.config, this.browserManager);
  securityResult = await securityScanner.runChecks(phase);

  // ENFORCE security threshold
  const SECURITY_THRESHOLD = 7.0;
  if (securityResult.score < SECURITY_THRESHOLD && decision.state === 'PASS') {
    decision.state = 'FAIL';
    decision.reason += ` | Security Score too low: ${securityResult.score}/10`;
  }
}
```

**Configuration Example:**
```typescript
security: {
  enabled: true,
  checks: {
    headers: true,        // passive, always on
    dependencies: true,   // static, CI only
    authentication: false, // active, manual only (avoid account lockout)
    owasp: false,         // complex, requires ZAP setup
  },
  threshold: 7.0,
  failOnCritical: true, // fail test if CRITICAL vulnerabilities found
}
```

**OWASP ZAP Integration (Advanced):**
- Run ZAP proxy in Docker container
- Configure Playwright to route through ZAP proxy
- Run passive scan during normal test execution
- Active scan: optional, separate phase (slow, intrusive)

---

### 5. Performance Testing Integration

**Current State:**
- No performance metrics collected
- Network logs captured but not analyzed

**Performance Testing Architecture:**

```
PerformanceTester (NEW component)
│
├─ LighthouseRunner (Core Web Vitals)
│  ├─ Run: Lighthouse CLI via Playwright context
│  ├─ Metrics: LCP, FID, CLS, TTFB, FCP, TTI
│  ├─ Scores: Performance (0-100), Accessibility, Best Practices, SEO
│  └─ Report: LighthouseResult with detailed breakdown
│
├─ CustomMetricsCollector (App-specific)
│  ├─ Page load timing: navigationStart → loadEventEnd
│  ├─ API response times: from BrowserManager.networkLogs
│  ├─ JavaScript execution: performance.measure() API
│  ├─ Memory usage: performance.memory (Chrome only)
│  └─ Report: CustomPerformanceResult
│
├─ NetworkAnalyzer (existing data)
│  ├─ Parse: BrowserManager.networkLogs
│  ├─ Detect: slow requests (>3s), failed requests (4xx/5xx)
│  ├─ Analyze: payload sizes, caching headers
│  └─ Report: NetworkAnalysisResult
│
└─ RenderMetricsCollector (DOM performance)
   ├─ Measure: DOM content loaded, first paint, largest contentful paint
   ├─ Detect: layout shifts (cumulative layout shift)
   ├─ Trace: React component render times (if profiling enabled)
   └─ Report: RenderMetricsResult
```

**Integration Point:**
- **Per-phase:** Run after screenshot capture, before AI analysis
- **Lighthouse:** Run once per page (expensive, ~5-10s per run)
- **Custom metrics:** Inject performance monitoring script before navigation

**Build Order:**
1. NetworkAnalyzer (uses existing data, no new dependency)
2. CustomMetricsCollector (lightweight, uses browser APIs)
3. RenderMetricsCollector (DOM observation)
4. LighthouseRunner (heavy dependency, last)

**Integration Pattern:**

```typescript
// In test-orchestrator.ts, after line 244 (visual regression)

if (this.config.performance.enabled) {
  console.log(`[Orchestrator] Running performance tests...`);
  const perfTester = new PerformanceTester(this.config, this.browserManager);
  performanceResult = await perfTester.runTests(phase);

  // ENFORCE performance threshold
  const PERFORMANCE_THRESHOLD = 50; // Lighthouse performance score
  if (performanceResult.lighthouse.performance < PERFORMANCE_THRESHOLD && decision.state === 'PASS') {
    decision.state = 'FAIL';
    decision.reason += ` | Performance Score too low: ${performanceResult.lighthouse.performance}/100`;
  }
}
```

**Configuration Example:**
```typescript
performance: {
  enabled: true,
  lighthouse: {
    enabled: true,
    throttling: 'mobile3G', // simulate slow network
    device: 'mobile',
    categories: ['performance', 'accessibility'], // skip SEO, best-practices for speed
  },
  customMetrics: {
    enabled: true,
    collectMemory: true,
    traceAPIs: true, // log slow API calls
  },
  thresholds: {
    performanceScore: 50, // Lighthouse score
    lcp: 2500,            // Largest Contentful Paint (ms)
    fid: 100,             // First Input Delay (ms)
    cls: 0.1,             // Cumulative Layout Shift
    ttfb: 800,            // Time to First Byte (ms)
  },
  failOnThreshold: true,
}
```

**Lighthouse Integration:**
```typescript
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

async runLighthouse(url: string): Promise<LighthouseResult> {
  const chrome = await launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility'],
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  return {
    performance: runnerResult.lhr.categories.performance.score * 100,
    lcp: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
    fid: runnerResult.lhr.audits['max-potential-fid'].numericValue,
    cls: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
    ttfb: runnerResult.lhr.audits['server-response-time'].numericValue,
  };
}
```

---

## Modified Component Diagram (v1.1)

```
TestOrchestrator (enhanced coordinator)
│
├─ BrowserManager (existing)
│  └─ NEW: hidePIIElements() method for DOM masking
│
├─ GeminiClient (existing, no changes)
│
├─ ResponseParser (existing, no changes)
│
├─ RTLIntegration (existing, no changes)
│
├─ CodeQualityChecker (existing, no changes)
│
├─ ChecklistValidator (existing, no changes)
│
├─ BaselineManager (ENHANCED)
│  ├─ RegionMasker (NEW)
│  ├─ MultiDeviceBaselines (NEW)
│  ├─ DiffAnalyzer (ENHANCED)
│  └─ ApprovalWorkflow (NEW)
│
├─ PIIMasker (ENHANCED)
│  ├─ HTMLMasker (existing)
│  ├─ DOMElementMasker (NEW)
│  ├─ ScreenshotMasker (NEW, optional)
│  └─ MaskingReport (NEW)
│
├─ SecurityScanner (NEW)
│  ├─ SecureHeadersChecker
│  ├─ DependencyAuditor
│  ├─ AuthenticationTester
│  └─ OWASPChecker (optional)
│
├─ PerformanceTester (NEW)
│  ├─ LighthouseRunner
│  ├─ CustomMetricsCollector
│  ├─ NetworkAnalyzer
│  └─ RenderMetricsCollector
│
└─ HTMLReporter (ENHANCED)
   └─ NEW sections: security scores, performance metrics, visual diffs
```

---

## Data Flow (Enhanced Per Phase)

```
1. BrowserManager.executeActions()
   → navigate, click, fill, etc.
   → IF PII masking enabled: hidePIIElements() before screenshot

2. BrowserManager.captureScreenshot()
   → screenshot.png (PII-masked if DOM masking enabled)

3. BrowserManager.captureHTML()
   → html-snapshot.html

4. PIIMasker.saveMaskedHTML()
   → html-masked.html

5. BaselineManager.compareWithBaseline() [if enabled, parallel]
   → VisualRegressionResult (diff%, pass/fail)

6. SecurityScanner.runChecks() [if enabled, parallel]
   → SecurityScanResult (vulnerabilities[], score)

7. PerformanceTester.runTests() [if enabled, parallel]
   → PerformanceResult (Lighthouse + custom metrics)

8. GeminiClient.analyzeSingle()
   → AIIssue[] (advisory)

9. RTLIntegration.runComprehensiveChecks()
   → RTLCheckResult[] with scores

10. CodeQualityChecker.analyzePageByUrl()
    → CodeQualityResult with violations

11. ChecklistValidator.getPhaseChecklistResult()
    → PhaseChecklistResult with coverage

12. Orchestrator ENFORCES thresholds:
    - RTL score < 6.0 → FAIL
    - Color score < 5.0 → FAIL
    - Code Quality < 5.0 → FAIL
    - Security score < 7.0 → FAIL (NEW)
    - Performance score < 50 → FAIL (NEW)
    - Visual regression diff > threshold → FAIL (NEW)

13. HTMLReporter.generateReport()
    → HTML report with 7 score dimensions (was 3)
```

---

## Suggested Build Order for v1.1

### Phase 1: Foundation Enhancements (Weeks 1-2)
**Goal:** Strengthen existing components before adding new ones

1. **PII Masking - DOM-based** (DOMElementMasker)
   - Add `hidePIIElements()` to BrowserManager
   - Configure `piiSelectors` in config
   - Test with account pages (most PII-heavy)

2. **Visual Regression - Ignore Regions** (RegionMasker)
   - Add `ignoreRegions` to config
   - Implement region masking before pixelmatch
   - Test with dynamic content (timestamps, counters)

3. **Network Analyzer** (uses existing data)
   - Parse BrowserManager.networkLogs
   - Detect slow/failed requests
   - Add to PhaseResult

**Deliverable:** Enhanced PII masking + visual regression ignore regions

---

### Phase 2: CI/CD Pipeline (Weeks 3-4)
**Goal:** Automate test execution and artifact management

4. **GitHub Actions - Test Execution Job**
   - Workflow file: `.github/workflows/test-suite.yml`
   - Authenticate with Vertex AI
   - Run test suite on PR/push

5. **GitHub Actions - Artifact Collection Job**
   - Upload screenshots, reports, diffs
   - 90-day retention policy

6. **GitHub Actions - Report Generation Job**
   - Parse JSON results
   - Post PR comment with summary
   - Set GitHub status check

**Deliverable:** Automated CI/CD pipeline with PR feedback

---

### Phase 3: Security Testing (Weeks 5-6)
**Goal:** Add security scanning to test suite

7. **SecureHeadersChecker** (passive, uses existing network logs)
   - Verify CSP, HSTS, X-Frame-Options
   - Score: 0-10 per page

8. **DependencyAuditor** (static, CI-only)
   - Run `npm audit --json`
   - Filter HIGH/CRITICAL vulnerabilities
   - Fail build on critical findings

9. **AuthenticationTester** (active, manual-only)
   - Test login flow security
   - Verify JWT handling
   - Check rate limiting

**Deliverable:** Security scanning with scores and vulnerability reports

---

### Phase 4: Performance Testing (Weeks 7-8)
**Goal:** Measure and enforce performance standards

10. **CustomMetricsCollector** (lightweight, browser APIs)
    - Page load timing
    - API response times
    - Memory usage

11. **RenderMetricsCollector** (DOM observation)
    - LCP, FID, CLS measurement
    - Layout shift detection

12. **LighthouseRunner** (heavy dependency)
    - Core Web Vitals
    - Performance score (0-100)
    - Accessibility score

**Deliverable:** Performance testing with Core Web Vitals enforcement

---

### Phase 5: Advanced Features (Weeks 9-10)
**Goal:** Polish and advanced capabilities

13. **Multi-Device Baselines** (visual regression)
    - Device-specific baselines
    - Device-specific thresholds

14. **Approval Workflow** (visual regression)
    - PR comments with diff images
    - Manual baseline updates via workflow_dispatch

15. **OWASP ZAP Integration** (optional, complex)
    - ZAP proxy setup
    - Passive/active scanning

16. **OCR-based PII Masking** (fallback)
    - Tesseract.js integration
    - Redact PII in screenshots

**Deliverable:** Full v1.1 feature set with advanced capabilities

---

## Component Modification Summary

| Component | Modification Type | Changes Required |
|-----------|-------------------|------------------|
| `TestOrchestrator` | **ENHANCED** | Add security, performance scanners; update threshold enforcement |
| `BrowserManager` | **ENHANCED** | Add `hidePIIElements()` method for DOM masking |
| `BaselineManager` | **ENHANCED** | Add region masking, multi-device baselines, approval workflow |
| `PIIMasker` | **ENHANCED** | Add DOMElementMasker, ScreenshotMasker, MaskingReport |
| `SecurityScanner` | **NEW** | Create from scratch with 4 sub-checkers |
| `PerformanceTester` | **NEW** | Create from scratch with 4 sub-collectors |
| `HTMLReporter` | **ENHANCED** | Add sections for security, performance, visual diffs |
| `TestPhase` type | **ENHANCED** | Add optional `securityCheck`, `performanceCheck` flags |
| `PhaseResult` type | **ENHANCED** | Add optional `securityResult`, `performanceResult` fields |
| GitHub Actions | **NEW** | Create 5 workflow jobs (test, artifact, report, baseline, scheduled) |

---

## Integration Risk Assessment

| Feature | Risk Level | Mitigation |
|---------|-----------|------------|
| **Visual Regression - Ignore Regions** | LOW | Simple image masking, no external dependencies |
| **PII Masking - DOM-based** | LOW | Uses existing Playwright selectors, testable |
| **CI/CD Pipeline** | MEDIUM | Requires GCP credentials management, secrets rotation |
| **Security Testing - Headers** | LOW | Passive, uses existing network logs |
| **Security Testing - OWASP ZAP** | HIGH | Complex setup, proxy configuration, false positives |
| **Performance - Custom Metrics** | LOW | Uses browser APIs, no external dependencies |
| **Performance - Lighthouse** | MEDIUM | Heavy dependency, slow execution (~10s per page) |
| **Multi-Device Baselines** | LOW | File organization, no logic changes |

---

## Configuration Schema Changes

### Current Config Structure
```typescript
interface TestConfig {
  baseUrl: string;
  headless: boolean;
  timeout: number;
  devices: Device[];
  locale: string;
  timezone: string;

  visualRegression: {
    enabled: boolean;
    threshold: number; // 0.01 = 1%
    baselinesDir: string;
    updateBaselines: boolean;
  };

  artifacts: {
    artifactsDir: string;
    saveScreenshots: boolean;
    saveHTML: boolean;
    saveNetworkLogs: boolean;
    saveConsoleLogs: boolean;
    maskPII: boolean;
    piiPatterns: string[];
  };

  rtl: { enabled: boolean };
  vertexAI: { ... };
  fineTuning: { ... };
}
```

### v1.1 Config Additions
```typescript
interface TestConfig {
  // ... existing fields ...

  visualRegression: {
    enabled: boolean;
    threshold: number;
    baselinesDir: string;
    updateBaselines: boolean;
    ignoreRegions: { // NEW
      selector: string;
      reason: string;
    }[];
    multiDevice: boolean; // NEW
    approvalWorkflow: boolean; // NEW
  };

  artifacts: {
    // ... existing fields ...
    maskPII: boolean;
    piiPatterns: string[];
    piiSelectors: string[]; // NEW - DOM elements to hide
    piiOCR: boolean; // NEW - fallback OCR masking
  };

  security: { // NEW
    enabled: boolean;
    checks: {
      headers: boolean;
      dependencies: boolean;
      authentication: boolean;
      owasp: boolean;
    };
    threshold: number; // 0-10
    failOnCritical: boolean;
  };

  performance: { // NEW
    enabled: boolean;
    lighthouse: {
      enabled: boolean;
      throttling: 'mobile3G' | 'mobile4G' | 'desktop';
      device: 'mobile' | 'desktop';
      categories: string[];
    };
    customMetrics: {
      enabled: boolean;
      collectMemory: boolean;
      traceAPIs: boolean;
    };
    thresholds: {
      performanceScore: number; // 0-100
      lcp: number; // ms
      fid: number; // ms
      cls: number; // 0-1
      ttfb: number; // ms
    };
    failOnThreshold: boolean;
  };

  ci: { // NEW
    enabled: boolean;
    provider: 'github-actions' | 'gitlab-ci' | 'jenkins';
    githubToken?: string;
    slackWebhook?: string;
  };
}
```

---

## Architecture Patterns Applied

### 1. Pipeline Orchestration Pattern
**Applied to:** Overall test execution flow
**Benefits:** Clear separation of concerns, easy to add new stages
**Tradeoff:** Sequential execution can be slow (mitigated by parallel checkers)

### 2. Plugin Architecture Pattern
**Applied to:** Security and Performance checkers
**Benefits:** Modular, can enable/disable features via config
**Tradeoff:** Configuration complexity increases

### 3. Observer Pattern
**Applied to:** Network logs, console logs, performance metrics
**Benefits:** Non-invasive monitoring, minimal overhead
**Tradeoff:** Post-execution analysis only (no real-time intervention)

### 4. Strategy Pattern
**Applied to:** PII masking (DOM-based vs OCR-based)
**Benefits:** Flexible implementation switching based on requirements
**Tradeoff:** Multiple implementations to maintain

### 5. Facade Pattern
**Applied to:** TestOrchestrator coordinates all components
**Benefits:** Simple API for test execution, hides complexity
**Tradeoff:** Orchestrator becomes large (mitigated by extracting checkers)

---

## Performance Considerations

### Current Performance Baseline
- Average phase execution: ~10-15 seconds
  - Browser automation: 5-8s
  - Screenshot capture: 1s
  - AI analysis: 2-4s
  - RTL checks: 1s
  - Code quality: 1s

### v1.1 Performance Impact

| Feature | Overhead per Phase | Mitigation |
|---------|-------------------|------------|
| Visual Regression | +0.5s (pixelmatch) | Parallel with AI analysis |
| PII Masking (DOM) | +0.2s (hide elements) | Pre-screenshot, minimal |
| PII Masking (OCR) | +3-5s (Tesseract) | Optional, fallback only |
| Security Headers | +0s (uses existing logs) | No overhead |
| Security OWASP | +10-30s (ZAP scan) | Optional, CI-only |
| Performance Custom | +0.5s (browser APIs) | Lightweight |
| Performance Lighthouse | +5-10s (full audit) | Optional, per-page |

**Total overhead (with all features enabled):** +6-8 seconds per phase
**Mitigation strategy:** Run expensive checks (Lighthouse, OWASP) only on key pages or in CI

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|-----------|-----------|
| **Visual Regression Enhancement** | HIGH | Existing implementation, straightforward enhancements (region masking, multi-device) |
| **PII Masking - DOM-based** | HIGH | Leverages existing Playwright selectors, testable, no external dependencies |
| **PII Masking - OCR-based** | MEDIUM | Tesseract.js dependency, accuracy concerns, performance overhead |
| **CI/CD Pipeline** | HIGH | Standard GitHub Actions patterns, well-documented, widely used |
| **Security - Headers & Dependencies** | HIGH | Passive checks, existing data, npm audit is standard |
| **Security - OWASP ZAP** | LOW | Complex setup, proxy configuration, false positives common |
| **Performance - Custom Metrics** | HIGH | Browser APIs well-documented, lightweight, reliable |
| **Performance - Lighthouse** | MEDIUM | Heavy dependency, slow execution, but widely used and reliable |
| **Overall Architecture** | HIGH | Extends existing patterns cleanly, minimal breaking changes |

---

## Summary

The v1.1 architecture extends the existing pipeline orchestration pattern with five new dimensions of quality measurement:

1. **Visual Regression** — Enhanced with region masking, multi-device support, approval workflow
2. **PII Masking** — Enhanced with DOM-based masking (primary), OCR fallback (optional)
3. **CI/CD Pipeline** — New GitHub Actions workflow with artifact management, PR feedback
4. **Security Testing** — New component with 4 checkers (headers, dependencies, auth, OWASP)
5. **Performance Testing** — New component with Lighthouse + custom metrics

**Key architectural decisions:**
- **Parallel checkers:** Security and performance run alongside existing checks
- **Threshold enforcement:** Orchestrator remains single source of truth for pass/fail
- **Backward compatibility:** All features configurable, can be disabled individually
- **Build order:** Foundation enhancements → CI/CD → Security → Performance → Advanced

**Estimated timeline:** 10 weeks for full v1.1 implementation (5 phases, 2 weeks each)

**Recommended starting point:** Phase 1 (PII masking + visual regression enhancements) — provides immediate value with minimal risk
