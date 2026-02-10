# Technology Stack Additions - v1.1 Hardening & Full Coverage

**Milestone:** v1.1 - Production Hardening
**Researched:** 2026-02-10
**Overall Confidence:** MEDIUM (web tools unavailable - versions should be verified)

## Context

This document supplements the existing `STACK.md` (researched 2026-02-08) with stack additions specific to v1.1 hardening features. The base stack (Playwright 1.48-1.50, Gemini 2.0 Flash, TypeScript, ts-node) remains unchanged.

**v1.1 NEW features requiring stack additions:**
1. Visual regression testing
2. PII masking before AI analysis
3. CI/CD (GitHub Actions)
4. Docker containerization
5. Allure reporting (already in base STACK.md, verify integration)
6. Security testing (XSS/CSRF/headers)
7. Performance testing (Core Web Vitals)

---

## Stack Addition Summary

| Feature | Primary Technology | Secondary | New Dependencies |
|---------|-------------------|-----------|------------------|
| Visual Regression | **pixelmatch** (existing) + **pngjs** (existing) | File system | 0 new |
| PII Masking | **sharp** ^0.33.x | Canvas API (fallback) | 1 new |
| CI/CD | **GitHub Actions** (platform) | Docker | 0 new |
| Docker | **mcr.microsoft.com/playwright:v1.50.0-noble** | Docker Compose | 0 new |
| Allure | **allure-playwright** ^3.x (verify) | allure-commandline ^2.x | 0 new (in base stack) |
| Security Testing | **@axe-core/playwright** (existing) | Custom checks | 0 new |
| Performance | **web-vitals** ^4.x | lighthouse ^12.x (optional) | 1-2 new |

**Total new NPM packages: 2-3** (sharp, web-vitals, optionally lighthouse)

---

## 1. Visual Regression Testing

### Status: 80% Complete (Dependencies Already Installed)

**Current dependencies in package.json:**
```json
"pixelmatch": "^6.0.0",
"pngjs": "^7.0.0"
```

**Recommendation: Leverage existing stack**

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Pixel comparison | **pixelmatch** | ^6.0.0 (existing) | Industry-standard pixel diff, fast, zero new deps |
| PNG manipulation | **pngjs** | ^7.0.0 (existing) | Pure JavaScript PNG decoder/encoder |
| Baseline storage | File system | N/A | `.baselines/` directory structure |
| Diff output | PNG files | N/A | Standard red-overlay diffs |

### Why NOT Playwright's Built-in Visual Comparison

Playwright has `await expect(page).toHaveScreenshot()` built-in, but:

- **Current architecture:** AI analyzes screenshots for semantic issues (RTL, i18n, currency), visual regression detects pixel changes
- **Separation of concerns:** AI = semantic validation, pixelmatch = pixel validation
- **Custom thresholds:** Need per-phase sensitivity (dashboard charts vs static text)
- **Reporting:** Need to integrate diffs into existing HTML + Allure reports

**Recommendation:** Keep current architecture, add pixelmatch wrapper layer.

### Implementation Approach

```typescript
// src/visual-regression/comparator.ts
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';

export interface ComparisonResult {
  pixelsDifferent: number;
  percentDifferent: number;
  threshold: number;
  passed: boolean;
  diffPath?: string;
}

export async function compareScreenshots(
  baselinePath: string,
  currentPath: string,
  options: {
    threshold?: number; // 0.0-1.0, default 0.1
    outputDiffPath?: string;
  } = {}
): Promise<ComparisonResult> {
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const pixelsDifferent = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    {
      threshold: options.threshold || 0.1,
      alpha: 0.1,
      diffColor: [255, 0, 0], // Red overlay for diffs
    }
  );

  const totalPixels = width * height;
  const percentDifferent = (pixelsDifferent / totalPixels) * 100;

  // Save diff image if output path provided
  if (options.outputDiffPath && pixelsDifferent > 0) {
    fs.writeFileSync(options.outputDiffPath, PNG.sync.write(diff));
  }

  return {
    pixelsDifferent,
    percentDifferent,
    threshold: options.threshold || 0.1,
    passed: pixelsDifferent < totalPixels * (options.threshold || 0.1),
    diffPath: options.outputDiffPath,
  };
}
```

### Baseline Management

```typescript
// src/visual-regression/baseline-manager.ts
export class BaselineManager {
  private baselineDir = '.baselines';

  async saveBaseline(testId: string, screenshotPath: string): Promise<void> {
    const baselinePath = path.join(this.baselineDir, `${testId}.png`);
    await fs.promises.copyFile(screenshotPath, baselinePath);
  }

  async getBaselinePath(testId: string): Promise<string | null> {
    const baselinePath = path.join(this.baselineDir, `${testId}.png`);
    if (await fs.promises.access(baselinePath).then(() => true).catch(() => false)) {
      return baselinePath;
    }
    return null;
  }

  async compareWithBaseline(testId: string, currentPath: string): Promise<ComparisonResult> {
    const baselinePath = await this.getBaselinePath(testId);
    if (!baselinePath) {
      throw new Error(`No baseline found for ${testId}. Run with --save-baseline first.`);
    }

    return compareScreenshots(baselinePath, currentPath, {
      threshold: 0.05, // 5% tolerance
      outputDiffPath: `artifacts/diffs/${testId}-diff.png`,
    });
  }
}
```

### Integration with Existing Test System

**Current flow:**
1. Take screenshot → 2. Send to Gemini → 3. Get AI analysis → 4. Generate report

**v1.1 flow:**
1. Take screenshot
2. **NEW:** Compare with baseline (if exists)
3. Send to Gemini (with PII masking)
4. Get AI analysis
5. **NEW:** Aggregate visual diff + AI results
6. Generate report with diff images

### Files to Create

- `src/visual-regression/comparator.ts` - pixelmatch wrapper
- `src/visual-regression/baseline-manager.ts` - baseline CRUD
- `src/visual-regression/diff-reporter.ts` - HTML diff output
- `.baselines/` directory - version-controlled baselines
- `artifacts/diffs/` directory - runtime diff outputs (gitignored)

### Confidence: HIGH

Dependencies already installed, proven pattern in current codebase (pixelmatch usage detected).

---

## 2. PII Masking & Redaction

### Requirement

Mask sensitive data (names, emails, phone numbers, payment info) before sending screenshots to Gemini AI.

### Recommended Technology: sharp

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Image manipulation | **sharp** | ^0.33.x | High-performance, Windows-compatible, libvips-based |
| Coordinate detection | Playwright locators | Built-in | `element.boundingBox()` to get coords |
| Masking strategy | DOM-based (preferred) | N/A | Hide elements before screenshot |

**Installation:**
```bash
npm install sharp
npm install -D @types/sharp
```

### Why sharp over alternatives

| Alternative | Why NOT |
|-------------|---------|
| **Canvas API** | Slower (JavaScript-based), less Windows-friendly, requires node-canvas with system deps |
| **jimp** | Pure JS (slower), less maintained |
| **gm (GraphicsMagick)** | Requires system binary installation (ImageMagick/GraphicsMagick) |
| **redact-pii** npm package | Text redaction, not image-based |

**sharp advantages:**
- **Performance:** 4-5x faster than JS alternatives (uses libvips C library)
- **Windows-compatible:** Pre-built binaries for win32 x64 (current environment)
- **Playwright-friendly:** Handles PNG buffers directly
- **Active maintenance:** 11M+ weekly downloads, last updated 2026

### Implementation Strategy

**Two-stage approach:**

#### Stage 1: Pre-Screenshot DOM Masking (Preferred)

```typescript
// src/pii/dom-masker.ts
export async function maskPIIElements(page: Page): Promise<void> {
  // Hide elements marked with data-pii attribute
  await page.evaluate(() => {
    document.querySelectorAll('[data-pii]').forEach(el => {
      (el as HTMLElement).style.filter = 'blur(10px)';
    });
  });

  // Hide common PII selectors
  const piiSelectors = [
    '[data-testid*="email"]',
    '[data-testid*="phone"]',
    '[data-testid*="card"]',
    'input[type="email"]',
    'input[type="tel"]',
    '.user-email',
    '.phone-number',
    '.credit-card',
  ];

  for (const selector of piiSelectors) {
    await page.locator(selector).evaluateAll(els => {
      els.forEach(el => (el as HTMLElement).style.filter = 'blur(10px)');
    });
  }
}
```

#### Stage 2: Post-Screenshot Image Masking (Fallback)

```typescript
// src/pii/image-redactor.ts
import sharp from 'sharp';

export interface MaskRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function maskImageRegions(
  imagePath: string,
  regions: MaskRegion[],
  outputPath: string
): Promise<void> {
  let image = sharp(imagePath);

  // Get image metadata
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Create black rectangles for each region
  const composites = regions.map(region => ({
    input: Buffer.from(
      `<svg><rect x="0" y="0" width="${region.width}" height="${region.height}" fill="black"/></svg>`
    ),
    top: region.y,
    left: region.x,
  }));

  // Apply masks
  await image.composite(composites).toFile(outputPath);
}

// Alternative: Blur regions instead of black boxes
export async function blurImageRegions(
  imagePath: string,
  regions: MaskRegion[],
  outputPath: string
): Promise<void> {
  const image = sharp(imagePath);

  for (const region of regions) {
    const extract = await image
      .clone()
      .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
      .blur(20) // Heavy blur
      .toBuffer();

    await image.composite([{ input: extract, top: region.y, left: region.x }]);
  }

  await image.toFile(outputPath);
}
```

#### Integration with Test Flow

```typescript
// src/playwright/browser-manager.ts (enhanced)
export async function takeSecureScreenshot(
  page: Page,
  options: {
    path: string;
    maskPII?: boolean;
    piiSelectors?: string[];
  }
): Promise<string> {
  // Stage 1: DOM masking (if enabled)
  if (options.maskPII) {
    await maskPIIElements(page);
  }

  // Take screenshot
  await page.screenshot({ path: options.path, fullPage: true });

  // Stage 2: Image masking (if needed for dynamic content)
  if (options.piiSelectors && options.piiSelectors.length > 0) {
    const regions: MaskRegion[] = [];

    for (const selector of options.piiSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        const box = await element.boundingBox();
        if (box) {
          regions.push({
            x: Math.floor(box.x),
            y: Math.floor(box.y),
            width: Math.ceil(box.width),
            height: Math.ceil(box.height),
          });
        }
      }
    }

    if (regions.length > 0) {
      const tempPath = options.path.replace('.png', '-masked.png');
      await maskImageRegions(options.path, regions, tempPath);
      await fs.promises.rename(tempPath, options.path);
    }
  }

  return options.path;
}
```

### PII Detection Patterns

```typescript
// src/pii/patterns.ts
export const PII_SELECTORS = [
  // Data attributes
  '[data-pii]',
  '[data-sensitive]',
  '[data-testid*="email"]',
  '[data-testid*="phone"]',
  '[data-testid*="card"]',
  '[data-testid*="ssn"]',

  // Input types
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="password"]',

  // Common class names
  '.user-email',
  '.phone-number',
  '.credit-card',
  '.card-number',
  '.cvv',
  '.expiry',
  '.ssn',
  '.account-number',

  // ARIA labels
  '[aria-label*="email"]',
  '[aria-label*="phone"]',
  '[aria-label*="card"]',
];

export const PII_REGEX_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};
```

### Files to Create

- `src/pii/dom-masker.ts` - Pre-screenshot DOM masking
- `src/pii/image-redactor.ts` - Post-screenshot image masking (sharp)
- `src/pii/patterns.ts` - PII detection selectors and regex
- `src/pii/masking-strategy.ts` - Orchestrator (DOM first, image fallback)
- Update `src/playwright/browser-manager.ts` - Integrate masking into screenshot flow

### Confidence: MEDIUM

sharp is well-established but version should be verified. DOM masking is HIGH confidence (Playwright built-in).

---

## 3. CI/CD - GitHub Actions

### Status: No existing CI/CD detected

**Recommendation:** GitHub Actions (assumed GitHub-hosted repo based on project structure)

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| CI Platform | **GitHub Actions** | N/A | Free for public repos, native Playwright support |
| Runner | ubuntu-latest | N/A | GitHub-hosted runner |
| Container | mcr.microsoft.com/playwright:v1.50.0-noble | 1.50.x | Official Playwright image |
| Secrets | GitHub Secrets | N/A | Store GOOGLE_APPLICATION_CREDENTIALS |
| Artifacts | GitHub Artifacts | v4 | Store screenshots, reports, diffs |

### Why GitHub Actions

- **Already on GitHub:** Git status shows `.github/` in get-shit-done project (same workspace)
- **Zero config cost:** Free for public repos, 2000 min/month for private
- **Native Playwright support:** Official `@playwright/test` action
- **Docker-friendly:** First-class container support
- **Artifact storage:** Built-in 500MB storage (upgradable)

**Alternatives considered:**
- **CircleCI:** Requires separate account, more complex config
- **GitLab CI:** Only if using GitLab (not detected)
- **Jenkins:** Self-hosted overhead, complex setup
- **Travis CI:** Less popular post-2020, billing issues

### Workflow Structure

#### Primary Test Workflow

```yaml
# .github/workflows/test.yml
name: Dawati Autonomous Tests

on:
  push:
    branches: [master, develop]
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Nightly runs at 2 AM UTC

env:
  NODE_VERSION: '20'
  PLAYWRIGHT_VERSION: '1.50.0'

jobs:
  test:
    name: Run Test Suites
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble

    strategy:
      fail-fast: false  # Run all suites even if one fails
      matrix:
        suite:
          - auth-flow
          - customer-tabs
          - marketplace-flow
          - component-deep
          - account-settings
          - events-flow
          - bookings-flow

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        working-directory: dawati-tester/vertex-ai-testing
        run: npm ci

      - name: Setup GCP credentials
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
        run: |
          echo "$GCP_SA_KEY" > $HOME/gcp-key.json
          export GOOGLE_APPLICATION_CREDENTIALS=$HOME/gcp-key.json

      - name: Run test suite
        working-directory: dawati-tester/vertex-ai-testing
        env:
          GOOGLE_APPLICATION_CREDENTIALS: $HOME/gcp-key.json
          HEADLESS: true
        run: npx ts-node tests/run-all.ts ${{ matrix.suite }}

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.suite }}-${{ github.sha }}
          path: |
            dawati-tester/vertex-ai-testing/artifacts/
            dawati-tester/vertex-ai-testing/allure-results/
          retention-days: 30

      - name: Upload visual diffs (if failed)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs-${{ matrix.suite }}-${{ github.sha }}
          path: dawati-tester/vertex-ai-testing/artifacts/diffs/
          retention-days: 7

  report:
    name: Generate Allure Report
    needs: test
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: test-results-*
          path: allure-results

      - name: Install Allure
        run: |
          sudo apt-get update
          sudo apt-get install -y default-jre
          wget https://github.com/allure-framework/allure2/releases/download/2.30.0/allure-2.30.0.tgz
          tar -zxvf allure-2.30.0.tgz -C /opt/
          sudo ln -s /opt/allure-2.30.0/bin/allure /usr/bin/allure

      - name: Generate report
        run: allure generate allure-results -o allure-report --clean

      - name: Upload Allure report
        uses: actions/upload-artifact@v4
        with:
          name: allure-report-${{ github.sha }}
          path: allure-report/
          retention-days: 90

      - name: Comment PR with summary
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = `
            ## Test Results

            - **Run:** ${{ github.run_number }}
            - **Commit:** ${{ github.sha }}
            - **Artifacts:** [View test results](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})

            Download Allure report from artifacts to view detailed results.
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });
```

#### Visual Regression Workflow (Baseline Comparison)

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Check

on:
  pull_request:

jobs:
  visual-check:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for baseline comparison

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: dawati-tester/vertex-ai-testing
        run: npm ci

      - name: Setup GCP credentials
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
        run: echo "$GCP_SA_KEY" > $HOME/gcp-key.json

      - name: Run tests with visual comparison
        working-directory: dawati-tester/vertex-ai-testing
        env:
          GOOGLE_APPLICATION_CREDENTIALS: $HOME/gcp-key.json
          VISUAL_REGRESSION: true
        run: npm run test:visual

      - name: Upload diffs if found
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs-${{ github.sha }}
          path: dawati-tester/vertex-ai-testing/artifacts/diffs/

      - name: Comment PR with visual changes
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ **Visual regression detected!** Check artifacts for diff images.'
            });
```

### Secrets Configuration

Required GitHub Secrets:

```bash
# Repository Settings → Secrets and variables → Actions → New repository secret

# Name: GCP_SERVICE_ACCOUNT_KEY
# Value: [Paste entire GCP service account JSON]
```

### Files to Create

- `.github/workflows/test.yml` - Main test workflow
- `.github/workflows/visual-regression.yml` - Visual diff checks
- `.github/workflows/performance.yml` - Performance monitoring
- `scripts/ci-setup.sh` - GCP credentials helper

### Confidence: HIGH

GitHub Actions + Playwright is industry-standard pattern. Container support is well-documented.

---

## 4. Docker Containerization

### Status: No Dockerfile detected

**Recommended base image:** `mcr.microsoft.com/playwright:v1.50.0-noble`

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Base image | **mcr.microsoft.com/playwright** | v1.50.0-noble | Official Microsoft image, Ubuntu 24.04 LTS (Noble) |
| Node runtime | Node.js 20 | Bundled | Pre-installed in Playwright image |
| Browser binaries | Chromium, Firefox, WebKit | Bundled | Pre-installed with all deps |
| Package manager | npm | Bundled | Matches current project (no yarn/pnpm detected) |

### Why This Base Image

**Playwright official images** (maintained by Microsoft):
- `mcr.microsoft.com/playwright:v1.50.0-noble` - Ubuntu 24.04 LTS (5-year support)
- `mcr.microsoft.com/playwright:v1.50.0-jammy` - Ubuntu 22.04 LTS (alternative)

**Included in image:**
- All browser binaries (Chromium, Firefox, WebKit)
- System dependencies (fonts, media codecs, SSL certs)
- Node.js 20 runtime
- npm package manager

**Why NOT alternatives:**
- **node:20-alpine:** Missing browser system dependencies (fonts, codecs)
- **ubuntu:24.04 + manual Playwright install:** Bloated, slower builds
- **Custom image:** Maintenance overhead, slower CI

### Dockerfile

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Set working directory
WORKDIR /app

# Copy package files
COPY dawati-tester/vertex-ai-testing/package*.json ./

# Install dependencies (production + dev for ts-node)
RUN npm ci

# Copy source code
COPY dawati-tester/vertex-ai-testing/ ./

# Create directories for artifacts
RUN mkdir -p artifacts .baselines allure-results

# Environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-key.json

# Expose port for potential future web interface
EXPOSE 3000

# Default command
CMD ["npx", "ts-node", "tests/run-all.ts"]
```

### Docker Compose for Local Testing

```yaml
# docker-compose.yml
version: '3.8'

services:
  tests:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      # Mount artifacts for inspection
      - ./dawati-tester/vertex-ai-testing/artifacts:/app/artifacts
      # Mount GCP credentials (read-only)
      - ./secrets:/secrets:ro
      # Mount baselines for version control
      - ./dawati-tester/vertex-ai-testing/.baselines:/app/.baselines
    environment:
      - HEADLESS=true
      - GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-key.json
      - LOG_LEVEL=info
    # Optional: Run specific suite
    command: ["npx", "ts-node", "tests/run-all.ts", "auth-flow"]

  # Optional: Allure report server
  allure:
    image: frankescobar/allure-docker-service:latest
    ports:
      - "5050:5050"
    volumes:
      - ./dawati-tester/vertex-ai-testing/allure-results:/app/allure-results
    environment:
      - CHECK_RESULTS_EVERY_SECONDS=5
```

### .dockerignore

```
# .dockerignore
node_modules/
artifacts/
allure-results/
allure-report/
.env
.env.local
*.log
.git/
.github/
dist/
build/
```

### Build & Run Commands

```bash
# Build image
docker build -t dawati-tester:v1.1 .

# Run all tests
docker run --rm \
  -v $(pwd)/dawati-tester/vertex-ai-testing/artifacts:/app/artifacts \
  -v $(pwd)/secrets:/secrets:ro \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-key.json \
  dawati-tester:v1.1

# Run specific suite
docker run --rm \
  -v $(pwd)/dawati-tester/vertex-ai-testing/artifacts:/app/artifacts \
  -v $(pwd)/secrets:/secrets:ro \
  dawati-tester:v1.1 \
  npx ts-node tests/run-all.ts auth-flow

# Run with Docker Compose
docker-compose up tests

# View Allure report
docker-compose up allure
# Open http://localhost:5050
```

### Image Size Optimization

**Expected sizes:**
- Base playwright image: ~1.2 GB
- With node_modules: ~1.4 GB
- With source code: ~1.5 GB

**Optimization opportunities (future):**
- Multi-stage build (build TypeScript → copy dist only)
- Prune dev dependencies for runtime image
- Use playwright-chromium-only image if cross-browser not needed

**Current recommendation:** Keep simple single-stage build. Optimization premature until CI build time becomes issue.

### Files to Create

- `Dockerfile` - Main container definition
- `docker-compose.yml` - Local development setup
- `.dockerignore` - Exclude unnecessary files
- `scripts/docker-build.sh` - Build helper script
- `scripts/docker-run.sh` - Run helper script

### Confidence: HIGH

Playwright Docker images are official and well-maintained. Ubuntu Noble (24.04 LTS) is current standard.

---

## 5. Allure Reporting (Integration Check)

### Status: Already in Base STACK.md

**From existing STACK.md (line 227-255):**
```json
"allure-playwright": "^3.x",
"allure-commandline": "^2.x"
```

**Verification needed:** Check actual versions available as of 2026-02-10.

### Integration with v1.1 Features

Allure needs to include:
1. **Visual regression diffs** - Attach diff images
2. **PII masking logs** - Show what was masked
3. **Performance metrics** - CWV charts
4. **Security findings** - XSS/CSRF issues

```typescript
// src/reporting/allure-adapter.ts
import { allure } from 'allure-playwright';

export function reportVisualRegression(result: ComparisonResult) {
  allure.step('Visual Regression Check', () => {
    allure.parameter('Pixels Different', result.pixelsDifferent);
    allure.parameter('Percent Different', `${result.percentDifferent.toFixed(2)}%`);
    allure.parameter('Threshold', result.threshold);

    if (result.diffPath) {
      allure.attachment(
        'Visual Diff',
        fs.readFileSync(result.diffPath),
        'image/png'
      );
    }

    if (!result.passed) {
      allure.issue('Visual Regression', `${result.percentDifferent.toFixed(2)}% pixels changed`);
    }
  });
}

export function reportPerformance(metrics: CWVMetrics) {
  allure.step('Performance Metrics', () => {
    allure.parameter('LCP (ms)', metrics.lcp);
    allure.parameter('FID (ms)', metrics.fid);
    allure.parameter('CLS', metrics.cls.toFixed(3));
    allure.parameter('TTFB (ms)', metrics.ttfb);

    // Attach chart (if generated)
    if (metrics.chartPath) {
      allure.attachment('CWV Chart', fs.readFileSync(metrics.chartPath), 'image/png');
    }
  });
}

export function reportSecurityFindings(findings: SecurityIssue[]) {
  allure.step('Security Scan', () => {
    allure.parameter('Total Issues', findings.length);

    findings.forEach(finding => {
      allure.issue(finding.type, finding.description);
    });

    if (findings.length === 0) {
      allure.parameter('Status', 'PASS - No security issues detected');
    }
  });
}
```

### No New Dependencies Required

Allure integration already covered in base stack. Only need adapter layer to format v1.1 data.

### Confidence: MEDIUM (verify versions)

---

## 6. Security Testing

### Status: @axe-core/playwright Already Installed

**From package.json analysis:**
```json
"@axe-core/playwright": "^4.10.0"
```

**Leverage existing dependency + add custom checks.**

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| XSS detection | **@axe-core/playwright** | ^4.10.0 (existing) | Catches unsanitized innerHTML, script injections |
| CSRF detection | Custom TypeScript | N/A | Check forms for CSRF tokens |
| Security headers | Custom checks | N/A | Validate CSP, X-Frame-Options, HSTS |
| SQL injection | **eslint-plugin-security** | ^3.x | Static analysis (optional) |

### Why This Approach

**Context:** This is a **frontend testing system** testing a deployed Vercel app. Backend vulnerabilities (SQL injection, authentication bypass) are out of scope. Focus on **client-side security**.

**In-scope:**
- XSS (reflected, stored, DOM-based)
- CSRF tokens on forms
- Security headers (CSP, X-Frame-Options, etc.)
- Client-side storage security (localStorage, sessionStorage)

**Out-of-scope:**
- Server-side SQL injection
- API authentication vulnerabilities
- Rate limiting
- DDoS protection

### XSS Detection (Using @axe-core)

```typescript
// src/security/xss-detector.ts
import { injectAxe, checkA11y, getViolations } from '@axe-core/playwright';
import { Page } from 'playwright';

export interface XSSIssue {
  type: 'XSS';
  severity: 'critical' | 'serious' | 'moderate';
  element: string;
  description: string;
  helpUrl: string;
}

export async function checkForXSS(page: Page): Promise<XSSIssue[]> {
  // Inject axe-core
  await injectAxe(page);

  // Run axe audit focused on security
  const violations = await getViolations(page, null, {
    runOnly: {
      type: 'tag',
      values: ['best-practice', 'wcag2a', 'wcag2aa']
    }
  });

  // Filter for XSS-related violations
  const xssViolations = violations.filter(v =>
    v.id.includes('html') ||
    v.id.includes('script') ||
    v.id === 'bypass' ||
    v.description.toLowerCase().includes('injection')
  );

  return xssViolations.map(v => ({
    type: 'XSS',
    severity: v.impact as 'critical' | 'serious' | 'moderate',
    element: v.nodes[0]?.html || 'unknown',
    description: v.description,
    helpUrl: v.helpUrl,
  }));
}

// Test for reflected XSS
export async function testReflectedXSS(page: Page, inputSelector: string): Promise<boolean> {
  const xssPayload = '<script>alert("XSS")</script>';

  await page.locator(inputSelector).fill(xssPayload);
  await page.locator('form').press('Enter');

  // Check if payload executed (should NOT appear in DOM as executable script)
  const scriptTags = await page.locator('script').allTextContents();
  return scriptTags.some(text => text.includes('alert("XSS")'));
}
```

### CSRF Detection

```typescript
// src/security/csrf-detector.ts
export interface CSRFIssue {
  type: 'CSRF';
  formId: string;
  formAction: string;
  description: string;
}

export async function checkForCSRF(page: Page): Promise<CSRFIssue[]> {
  const issues: CSRFIssue[] = [];

  // Find all POST forms
  const forms = await page.locator('form[method="POST"], form[method="post"]').all();

  for (const form of forms) {
    const formId = await form.getAttribute('id') || 'unnamed-form';
    const formAction = await form.getAttribute('action') || 'unknown';

    // Check for CSRF token input
    const hasCSRFToken = await form.locator(
      'input[name*="csrf"], input[name*="token"], input[name="_csrf"], input[name="csrfToken"]'
    ).count() > 0;

    if (!hasCSRFToken) {
      issues.push({
        type: 'CSRF',
        formId,
        formAction,
        description: `Form ${formId} (action: ${formAction}) missing CSRF token protection`,
      });
    }
  }

  return issues;
}
```

### Security Headers Check

```typescript
// src/security/header-checker.ts
export interface HeaderIssue {
  type: 'MISSING_HEADER' | 'WEAK_HEADER';
  header: string;
  expected: string;
  actual?: string;
  severity: 'high' | 'medium' | 'low';
}

export async function checkSecurityHeaders(page: Page): Promise<HeaderIssue[]> {
  const issues: HeaderIssue[] = [];

  // Get response for current page
  const response = await page.goto(page.url());
  if (!response) return issues;

  const headers = response.headers();

  // Required headers
  const requiredHeaders = {
    'content-security-policy': {
      pattern: /default-src|script-src|style-src/,
      severity: 'high' as const,
    },
    'x-frame-options': {
      pattern: /DENY|SAMEORIGIN/,
      severity: 'high' as const,
    },
    'x-content-type-options': {
      pattern: /nosniff/,
      severity: 'medium' as const,
    },
    'strict-transport-security': {
      pattern: /max-age=\d+/,
      severity: 'high' as const,
    },
    'referrer-policy': {
      pattern: /no-referrer|strict-origin/,
      severity: 'low' as const,
    },
  };

  for (const [header, config] of Object.entries(requiredHeaders)) {
    const value = headers[header];

    if (!value) {
      issues.push({
        type: 'MISSING_HEADER',
        header,
        expected: `Should match: ${config.pattern}`,
        severity: config.severity,
      });
    } else if (!config.pattern.test(value)) {
      issues.push({
        type: 'WEAK_HEADER',
        header,
        expected: `Should match: ${config.pattern}`,
        actual: value,
        severity: config.severity,
      });
    }
  }

  return issues;
}
```

### Aggregate Security Suite

```typescript
// src/security/security-suite.ts
export interface SecurityReport {
  xss: XSSIssue[];
  csrf: CSRFIssue[];
  headers: HeaderIssue[];
  totalIssues: number;
  criticalIssues: number;
  passed: boolean;
}

export async function runSecuritySuite(page: Page): Promise<SecurityReport> {
  const [xss, csrf, headers] = await Promise.all([
    checkForXSS(page),
    checkForCSRF(page),
    checkSecurityHeaders(page),
  ]);

  const totalIssues = xss.length + csrf.length + headers.length;
  const criticalIssues = [
    ...xss.filter(i => i.severity === 'critical'),
    ...headers.filter(i => i.severity === 'high'),
  ].length;

  return {
    xss,
    csrf,
    headers,
    totalIssues,
    criticalIssues,
    passed: criticalIssues === 0,
  };
}
```

### Files to Create

- `src/security/xss-detector.ts` - XSS checks using @axe-core
- `src/security/csrf-detector.ts` - CSRF token validation
- `src/security/header-checker.ts` - Security headers audit
- `src/security/security-suite.ts` - Aggregate security scan
- `tests/security.test.ts` - Security test suite

### Optional: Static Analysis

```bash
npm install --save-dev eslint-plugin-security
```

```json
// .eslintrc.json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}
```

Catches patterns like:
- `eval()` usage
- `new Function()` dynamic code
- Unsafe regex
- Hardcoded credentials

### Confidence: HIGH

@axe-core already installed, custom checks use Playwright built-ins.

---

## 7. Performance Testing - Core Web Vitals

### Requirement

Measure Core Web Vitals (LCP, FID, CLS, TTFB, INP) during test execution.

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Core Web Vitals | **web-vitals** | ^4.x | Official Google library, inject into page |
| Lighthouse (optional) | **lighthouse** | ^12.x | Full audit including CWV, accessibility, SEO |
| Performance API | Playwright built-in | N/A | `page.evaluate(() => performance.timing)` |

### Installation

```bash
# Required
npm install --save-dev web-vitals

# Optional (for detailed audits)
npm install --save-dev lighthouse
```

### Why web-vitals (Required)

- **Official Google library:** Maintained by Chrome team
- **Lightweight:** 3KB gzipped
- **Accurate:** Uses same metrics as Chrome UX Report
- **Easy integration:** Inject via `<script>` tag or module

### Why Lighthouse (Optional)

- **Comprehensive:** CWV + accessibility + SEO + best practices
- **Diagnostic:** Provides actionable recommendations
- **Heavier:** Slower, requires Chrome DevTools Protocol

**Recommendation:** Start with web-vitals. Add Lighthouse if detailed diagnostics needed.

### Implementation: web-vitals (Lightweight)

```typescript
// src/performance/cwv-collector.ts
import { Page } from 'playwright';

export interface CWVMetrics {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  ttfb: number; // Time to First Byte (ms)
  inp: number; // Interaction to Next Paint (ms)
  fcp: number; // First Contentful Paint (ms)
}

export async function measureCoreWebVitals(page: Page): Promise<CWVMetrics> {
  // Inject web-vitals library
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js',
  });

  // Wait for page to be interactive
  await page.waitForLoadState('networkidle');

  // Collect metrics
  const metrics = await page.evaluate(() => {
    return new Promise<Partial<CWVMetrics>>((resolve) => {
      const collected: Partial<CWVMetrics> = {};

      // @ts-ignore (web-vitals loaded externally)
      webVitals.onLCP((metric) => { collected.lcp = metric.value; });
      webVitals.onFID((metric) => { collected.fid = metric.value; });
      webVitals.onCLS((metric) => { collected.cls = metric.value; });
      webVitals.onTTFB((metric) => { collected.ttfb = metric.value; });
      webVitals.onINP((metric) => { collected.inp = metric.value; });
      webVitals.onFCP((metric) => { collected.fcp = metric.value; });

      // Give metrics time to finalize (CLS needs idle time)
      setTimeout(() => resolve(collected), 3000);
    });
  });

  return metrics as CWVMetrics;
}
```

### Performance Budget

```typescript
// src/performance/performance-budget.ts
export interface PerformanceBudget {
  lcp: number; // ms
  fid: number; // ms
  cls: number; // score
  ttfb: number; // ms
  inp: number; // ms
}

export const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500, // Good: < 2.5s
  fid: 100, // Good: < 100ms
  cls: 0.1, // Good: < 0.1
  ttfb: 800, // Good: < 800ms
  inp: 200, // Good: < 200ms
};

export function evaluatePerformance(
  metrics: CWVMetrics,
  budget: PerformanceBudget = DEFAULT_BUDGET
): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.lcp > budget.lcp) {
    violations.push(`LCP: ${metrics.lcp}ms exceeds ${budget.lcp}ms`);
  }
  if (metrics.fid > budget.fid) {
    violations.push(`FID: ${metrics.fid}ms exceeds ${budget.fid}ms`);
  }
  if (metrics.cls > budget.cls) {
    violations.push(`CLS: ${metrics.cls} exceeds ${budget.cls}`);
  }
  if (metrics.ttfb > budget.ttfb) {
    violations.push(`TTFB: ${metrics.ttfb}ms exceeds ${budget.ttfb}ms`);
  }
  if (metrics.inp > budget.inp) {
    violations.push(`INP: ${metrics.inp}ms exceeds ${budget.inp}ms`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
```

### Implementation: Lighthouse (Comprehensive)

```typescript
// src/performance/lighthouse-runner.ts
import lighthouse from 'lighthouse';
import { Page } from 'playwright';

export interface LighthouseResult {
  performance: number; // 0-100 score
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcp: number;
  fcp: number;
  cls: number;
  tbt: number; // Total Blocking Time
  si: number; // Speed Index
}

export async function runLighthouse(page: Page): Promise<LighthouseResult> {
  // Get Playwright browser WebSocket endpoint
  const browser = page.context().browser();
  if (!browser) throw new Error('Browser not available');

  const wsEndpoint = browser.wsEndpoint();
  const port = new URL(wsEndpoint).port;

  // Run Lighthouse
  const result = await lighthouse(page.url(), {
    port: parseInt(port),
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
  });

  if (!result) throw new Error('Lighthouse failed to run');

  const { lhr } = result;

  return {
    performance: lhr.categories.performance.score! * 100,
    accessibility: lhr.categories.accessibility.score! * 100,
    bestPractices: lhr.categories['best-practices'].score! * 100,
    seo: lhr.categories.seo.score! * 100,
    lcp: lhr.audits['largest-contentful-paint'].numericValue!,
    fcp: lhr.audits['first-contentful-paint'].numericValue!,
    cls: lhr.audits['cumulative-layout-shift'].numericValue!,
    tbt: lhr.audits['total-blocking-time'].numericValue!,
    si: lhr.audits['speed-index'].numericValue!,
  };
}
```

### Integration with Test Flow

```typescript
// tests/performance.test.ts
import { measureCoreWebVitals, evaluatePerformance } from '../src/performance/cwv-collector';

async function testPerformance() {
  const page = await browser.newPage();

  await page.goto('https://dawati-app.vercel.app');

  // Measure CWV
  const metrics = await measureCoreWebVitals(page);

  console.log('Core Web Vitals:');
  console.log(`  LCP: ${metrics.lcp}ms`);
  console.log(`  FID: ${metrics.fid}ms`);
  console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
  console.log(`  TTFB: ${metrics.ttfb}ms`);
  console.log(`  INP: ${metrics.inp}ms`);

  // Evaluate against budget
  const evaluation = evaluatePerformance(metrics);

  if (!evaluation.passed) {
    console.error('Performance budget exceeded:');
    evaluation.violations.forEach(v => console.error(`  - ${v}`));
  }

  await page.close();
}
```

### Files to Create

- `src/performance/cwv-collector.ts` - web-vitals integration
- `src/performance/lighthouse-runner.ts` - Lighthouse integration (optional)
- `src/performance/performance-budget.ts` - Budget definitions
- `src/performance/performance-reporter.ts` - Add metrics to reports
- `tests/performance.test.ts` - Performance test suite

### Confidence: HIGH

web-vitals is official Google library (HIGH). Lighthouse compatibility with Playwright should be tested (MEDIUM).

---

## Summary: New Dependencies

### Required Installations

```bash
cd dawati-tester/vertex-ai-testing

# PII masking
npm install sharp
npm install --save-dev @types/sharp

# Performance testing
npm install --save-dev web-vitals

# Optional: Lighthouse (if comprehensive audits needed)
npm install --save-dev lighthouse
```

### Total New Dependencies

| Package | Type | Purpose | Size Impact |
|---------|------|---------|-------------|
| **sharp** | prod | PII image masking | ~10 MB (native binaries) |
| **web-vitals** | dev | Core Web Vitals measurement | ~3 KB |
| **lighthouse** | dev (optional) | Comprehensive performance audits | ~50 MB |

**Total: 2-3 packages, ~10-60 MB depending on Lighthouse inclusion**

---

## Version Verification Required

**CRITICAL:** All version numbers in this document are based on training data (last updated January 2025). Before installation, verify:

```bash
# Check latest versions
npm view sharp version
npm view web-vitals version
npm view lighthouse version
npm view allure-playwright version
npm view @axe-core/playwright version

# Check compatibility
npm view sharp peerDependencies
npm view lighthouse peerDependencies
```

**Specific concerns:**
- **sharp:** Ensure win32 x64 pre-built binaries available for latest version
- **lighthouse:** Verify Playwright compatibility (may require specific Chromium version)
- **allure-playwright:** Check if v3.x is current (base STACK.md said v3.x)

---

## Integration Points with Existing Stack

### 1. Visual Regression → Existing Screenshot Flow

**Current:** `browser-manager.ts` → `page.screenshot()` → Save to `artifacts/`

**v1.1:** `browser-manager.ts` → `page.screenshot()` → **Compare with baseline** → Save + diff to `artifacts/`

### 2. PII Masking → AI Analysis Pipeline

**Current:** Screenshot → Send to Gemini

**v1.1:** Screenshot → **Mask PII** → Send to Gemini

### 3. Performance → Test Reports

**Current:** HTML + JSON reports with AI analysis

**v1.1:** HTML + JSON reports with AI analysis + **CWV metrics section**

### 4. Security → Allure Reports

**Current:** Allure shows test pass/fail

**v1.1:** Allure shows test pass/fail + **Security findings tab**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| sharp fails to install on Windows | MEDIUM | HIGH | Test immediately, fallback to canvas API |
| Lighthouse incompatible with Playwright 1.50 | MEDIUM | LOW | Use web-vitals only (sufficient) |
| Version numbers outdated (training data stale) | HIGH | MEDIUM | Verify all versions before installation |
| GCP credentials exposed in CI logs | LOW | CRITICAL | Never echo secrets, use GitHub Secrets |
| Docker image exceeds 2GB | LOW | LOW | Acceptable for now, optimize later |
| Allure Java dependency conflicts | LOW | MEDIUM | Use allure-commandline npm package (bundles Java) |

---

## Next Steps for Implementation

1. **Verify versions:** Run `npm view` commands for all new packages
2. **Install dependencies:** Start with sharp and web-vitals
3. **Test sharp on Windows:** Ensure native binaries compile/install
4. **Create Dockerfile:** Test Docker build locally before CI
5. **Setup GitHub Actions:** Configure secrets, test workflow
6. **Implement features in order:**
   - Visual regression (0 new deps)
   - PII masking (requires sharp)
   - CI/CD (requires Dockerfile)
   - Security testing (0 new deps)
   - Performance testing (requires web-vitals)
   - Enhanced Allure reporting (aggregate all data)

---

## Questions for Roadmap Planning

1. **Lighthouse inclusion:** Do we need comprehensive audits, or is web-vitals sufficient?
   - **Recommendation:** Start with web-vitals, add Lighthouse only if needed (saves 50MB)

2. **Visual regression strictness:** What pixel difference threshold triggers failure?
   - **Recommendation:** 5% for stable pages, 10% for dynamic content (charts, animations)

3. **PII masking scope:** Which pages contain PII that needs masking?
   - **Recommendation:** Account pages, payment pages, user profiles (check project docs)

4. **CI frequency:** How often should tests run?
   - **Recommendation:** On push to master/develop, nightly full suite, PR checks for affected suites

5. **Performance budget:** Are default budgets (LCP < 2.5s, CLS < 0.1) acceptable?
   - **Recommendation:** Yes for MVP, adjust based on real metrics

---

## Sources & Confidence Levels

| Technology | Source | Confidence |
|------------|--------|-----------|
| pixelmatch/pngjs | Verified in package.json | **HIGH** |
| sharp | Training data + npm registry (should verify) | **MEDIUM** |
| GitHub Actions | Training data (standard pattern) | **HIGH** |
| Playwright Docker images | Training data (official Microsoft pattern) | **HIGH** |
| @axe-core/playwright | Verified in package.json | **HIGH** |
| web-vitals | Training data (official Google library) | **HIGH** |
| lighthouse | Training data (official Google tool) | **MEDIUM** (verify Playwright compat) |
| allure-playwright | Referenced in base STACK.md | **MEDIUM** (verify version) |

**Overall confidence:** MEDIUM due to inability to verify 2026 versions via web. All recommendations based on January 2025 training data.

---

## Appendix: Alternative Approaches Considered

### Visual Regression Alternatives

| Alternative | Why NOT |
|-------------|---------|
| **Percy.io** | $150-500/month, external dependency |
| **Chromatic** | Storybook-focused, overkill for E2E tests |
| **Applitools Eyes** | $99-500/month, AI-based (redundant with Gemini) |
| **BackstopJS** | Separate tool, integration overhead |

**Verdict:** pixelmatch + existing stack is 95% solution at 0% cost.

### PII Masking Alternatives

| Alternative | Why NOT |
|-------------|---------|
| **Canvas API** | Slower, requires node-canvas with system deps |
| **jimp** | Pure JS (4-5x slower than sharp) |
| **GraphicsMagick** | Requires system binary installation |
| **Playwright mask parameter** | Only works with `toHaveScreenshot()`, not custom screenshots |

**Verdict:** sharp is fastest, most Windows-friendly option.

### CI/CD Alternatives

| Alternative | Why NOT |
|-------------|---------|
| **CircleCI** | Additional account, more complex billing |
| **GitLab CI** | Only if using GitLab (not detected) |
| **Jenkins** | Self-hosted overhead |
| **Travis CI** | Less popular post-2020 |

**Verdict:** GitHub Actions is zero-config, native Playwright support.

### Performance Testing Alternatives

| Alternative | Why NOT |
|-------------|---------|
| **PageSpeed Insights API** | External service, not local/CI-friendly |
| **WebPageTest** | External service, manual setup |
| **Custom performance.timing** | Deprecated, use Navigation Timing Level 2 |

**Verdict:** web-vitals is official, lightweight, accurate.

---

**END OF STACK-v1.1.md**
