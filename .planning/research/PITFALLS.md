# Domain Pitfalls: v1.1 Production Hardening

**Domain:** Adding Production Features to Working Test Systems (Visual Regression, PII Masking, CI/CD, Performance Testing, Tightening Scoring)
**Milestone:** v1.1 Hardening & Full Coverage
**Researched:** 2026-02-10
**Confidence:** HIGH (based on existing system analysis + Playwright best practices)

## Executive Summary

The most dangerous phase in test system evolution is **hardening an existing working system**. Unlike greenfield development where failures are expected, teams have 63/63 passing phases and must preserve that success while adding production features. The critical mistake is **tightening thresholds without baseline measurement**, causing immediate mass failures that demoralize teams and create pressure to revert changes. Secondary pitfalls include **visual regression baseline pollution** (bad screenshots become "truth"), **PII masking breaking AI analysis** (masked data loses context), and **CI/CD flakiness from timing assumptions** that worked locally.

---

## CRITICAL PITFALLS - Production Hardening Specific

### Pitfall 1: Tightening Scoring Without Baseline Measurement

**What goes wrong:** Team changes scoring from "everything passes" to strict thresholds, causing 63/63 PASS to become 5/63 PASS overnight. Panic ensues, management questions the test system's value, team reverts to lenient scoring, and hardening initiative dies.

**Why it happens:**
- Current system has **advisory-only AI decisions** (line 99-103 in response-parser.ts: `return 'PASS'` always)
- Execution errors are treated as PASS with warning
- RTL/Color/Code Quality thresholds are lenient or bypassed
- No one measured "what would fail if we enforced real thresholds" before enabling enforcement

**Consequences:**
- **Immediate regression**: 63/63 → 5/63 in one commit
- **Loss of trust**: "The test system was working fine, why did you break it?"
- **Revert pressure**: Management demands rollback to "working" state
- **Feature abandonment**: Team loses confidence in hardening initiative
- **False positive hell**: Real issues buried under hundreds of new "failures"

**Prevention:**

1. **Measure before enforcing** - Run shadow mode first
   ```typescript
   // PHASE 1: Shadow mode (collect data, don't fail tests)
   const rtlScore = await rtlChecker.check();
   const wouldFailUnderStrictRules = rtlScore < 8.0;

   logger.info(`RTL Score: ${rtlScore}/10 (strict threshold: 8.0)`);
   logger.info(`Would fail under strict rules: ${wouldFailUnderStrictRules}`);

   // DON'T fail the test yet - just log
   if (wouldFailUnderStrictRules) {
     metrics.recordShadowFailure('rtl', phase.id, rtlScore);
   }

   // STILL PASS for now
   return { status: 'passed', metadata: { shadowMode: true } };
   ```

2. **Gradual threshold tightening** - Not binary flip
   ```typescript
   // BAD: Binary flip
   const PASSING_THRESHOLD = 8.0; // Changed from 5.0 overnight

   // GOOD: Gradual progression over 4 weeks
   const THRESHOLDS = {
     week1: 5.0,  // Baseline (current lenient)
     week2: 6.0,  // 20% stricter
     week3: 7.0,  // 40% stricter
     week4: 8.0,  // Target strict threshold
   };

   const currentWeek = getCurrentDeploymentWeek();
   const threshold = THRESHOLDS[`week${currentWeek}`];
   ```

3. **Category-based rollout** - Not all-at-once
   ```typescript
   // Week 1: Only enforce RTL scoring (most mature)
   if (config.enforcement.rtl) {
     enforceRTLThreshold(rtlScore);
   }

   // Week 2: Add Color scoring
   if (config.enforcement.color) {
     enforceColorThreshold(colorScore);
   }

   // Week 3: Add Code Quality
   if (config.enforcement.codeQuality) {
     enforceCodeQualityThreshold(cqScore);
   }

   // Week 4: Add AI scoring (most subjective, last)
   if (config.enforcement.ai) {
     enforceAIThreshold(aiScore);
   }
   ```

4. **Exemption mechanism for known issues**
   ```typescript
   // Allow phases to declare "known issues" during transition
   const phase: TestPhase = {
     id: 'vendor-dashboard',
     name: 'Vendor Dashboard',
     exemptions: {
       rtl: { reason: 'Currency icon migration in progress', until: '2026-03-01' },
       color: { reason: 'Design system v2 rollout', until: '2026-02-20' },
     },
   };

   // Scorer checks exemptions before failing
   if (phase.exemptions?.rtl && isBeforeDate(phase.exemptions.rtl.until)) {
     logger.warn(`RTL exemption: ${phase.exemptions.rtl.reason}`);
     return 'PASS'; // Temporary exemption
   }
   ```

**Detection:**
- Sudden drop from 63/63 PASS to <20/63 PASS after threshold change
- Developers say "tests are too strict now, everything fails"
- Managers ask "why is the test system broken?"
- Team creates tickets to "fix tests" instead of "fix app"

**Warning signs:**
- No baseline metrics before starting hardening work
- Thresholds set based on "this seems right" not data
- All enforcement enabled in single PR
- No exemption mechanism for gradual migration

---

### Pitfall 2: Visual Regression Baseline Pollution (Garbage In, Garbage Out)

**What goes wrong:** Team enables visual regression with `updateBaselines: true`, captures screenshots while the app has bugs, and those buggy screenshots become the "truth." Future regressions (fixes!) are flagged as failures because they differ from buggy baselines.

**Why it happens:**
- BaselineManager auto-creates baselines if they don't exist (lines 31-43 in baseline-manager.ts)
- Teams run baseline capture during active development, not on known-good build
- No review process for new baselines
- Baselines committed to git without visual review

**Consequences:**
- **Bugs become features**: Visual regression prevents fixing UI bugs because fixes "don't match baseline"
- **False positives on fixes**: Team fixes alignment issue, visual regression fails, fix gets reverted
- **Baseline drift**: Small bugs accumulate in baselines over time
- **Loss of trust**: "Visual regression blocks all UI changes, it's useless"

**Prevention:**

1. **Never auto-create baselines in CI/CD**
   ```typescript
   // BAD: CI can create new baselines
   if (!fs.existsSync(baselinePath) && config.visualRegression.updateBaselines) {
     console.log('Creating new baseline');
     fs.copyFileSync(screenshotPath, baselinePath);
   }

   // GOOD: CI fails if baseline missing, only local/manual creates baselines
   if (!fs.existsSync(baselinePath)) {
     if (process.env.CI === 'true') {
       throw new Error(`Baseline missing: ${baselineName}. Run 'npm run test:baseline' locally.`);
     }

     if (config.visualRegression.updateBaselines) {
       console.warn('Creating baseline - MANUAL REVIEW REQUIRED');
       fs.copyFileSync(screenshotPath, baselinePath);
       recordBaselineForReview(baselineName, screenshotPath);
     }
   }
   ```

2. **Baseline review checklist**
   ```markdown
   ## New Baseline Review Checklist (before committing)

   For each new baseline in `baselines/`:

   - [ ] Screenshot shows CORRECT app state (no bugs, no errors)
   - [ ] Screenshot is stable (no loading spinners, no animations mid-frame)
   - [ ] Screenshot is at expected viewport size (1280x720 default)
   - [ ] Screenshot doesn't contain PII or test data that will change
   - [ ] Screenshot taken with consistent browser version (Playwright Chromium 1.51.0)
   - [ ] Screenshot reviewed by 2+ team members

   If ANY checkbox fails, DELETE baseline and fix app before recapturing.
   ```

3. **Baseline version control with metadata**
   ```typescript
   // baselines/metadata.json
   {
     "vendor-dashboard-summary.png": {
       "createdBy": "user@example.com",
       "createdAt": "2026-02-10T10:30:00Z",
       "appVersion": "v1.0.0",
       "reviewedBy": ["reviewer1@example.com", "reviewer2@example.com"],
       "notes": "Baseline captured after READY-TO-TEST milestone",
       "testId": "vendor-dashboard",
       "phaseId": "vendor-summary"
     }
   }

   // Script to validate baselines
   async function validateBaseline(baselineName: string) {
     const metadata = loadMetadata(baselineName);

     if (!metadata.reviewedBy || metadata.reviewedBy.length < 2) {
       throw new Error(`Baseline ${baselineName} not reviewed by 2+ people`);
     }

     const ageInDays = daysSince(metadata.createdAt);
     if (ageInDays > 90) {
       console.warn(`Baseline ${baselineName} is ${ageInDays} days old - consider refresh`);
     }
   }
   ```

4. **Progressive baseline approval**
   ```bash
   # Step 1: Capture baselines locally (not committed)
   npm run test:capture-baselines

   # Step 2: Manual review in browser
   npm run test:review-baselines
   # Opens HTML page showing all new baselines side-by-side with app screenshots

   # Step 3: Approve baselines (creates metadata.json entries)
   npm run test:approve-baselines

   # Step 4: Commit approved baselines
   git add baselines/
   git commit -m "chore: add visual regression baselines (reviewed)"
   ```

**Detection:**
- Visual regression fails when you FIX a UI bug
- Baselines show loading spinners, error states, or alignment bugs
- No metadata.json in baselines/ directory
- Baselines committed without PR review
- High visual regression failure rate (>30% of runs)

**Warning signs:**
- `updateBaselines: true` left enabled in config after initial capture
- Baselines captured during active feature development
- No baseline review process documented
- Team members don't know what baselines represent

---

### Pitfall 3: PII Masking Breaking AI Context (Over-Redaction)

**What goes wrong:** PII masker aggressively masks phone numbers, emails, and IDs before sending HTML to Gemini. AI analysis becomes useless because masked data removes critical context: "Phone input shows 05XXXXXXXX" tells AI nothing about validation bugs, and "user@example.com everywhere" prevents detection of email formatting issues.

**Why it happens:**
- PIIMasker uses regex-based blanket masking (lines 32-60 in pii-masker.ts)
- Masks are context-unaware: phone number in input field vs in error message both become XXXXXXXXX
- Team prioritizes PII safety over test effectiveness, masking too much
- Screenshot PII can't be masked automatically (line 88-92 warning only)

**Consequences:**
- **Blind AI analysis**: "I see XXXXXXXXX, looks fine" when actual value is malformed
- **Lost bug detection**: Email validation bugs invisible because all emails are "user@example.com"
- **Phone number validation bugs**: Can't detect "05" vs "+966" formatting issues when both are masked
- **False confidence**: Tests pass because AI can't see actual data to validate

**Prevention:**

1. **Contextual masking** - Preserve structure, mask identity
   ```typescript
   // BAD: Destroys all context
   masked = masked.replace(/05[0-9]{8}/g, '05XXXXXXXX');

   // GOOD: Preserves structure, masks identity
   masked = masked.replace(/05([0-9]{8})/g, (match, digits) => {
     // Keep first 2 digits for format detection, mask rest
     return `05${digits.substring(0, 2)}XXXX${digits.substring(6, 8)}`;
   });
   // Result: 0512XXXX34 (can still detect "05" prefix and length)
   ```

2. **Test data substitution** - Not blanking
   ```typescript
   // BETTER: Use realistic test data instead of XXXXX
   const TEST_PHONE_NUMBERS = [
     '+966501234567',  // Valid Saudi mobile
     '+966551234567',  // Valid Saudi mobile (different carrier)
     '+966123456789',  // Invalid (wrong prefix)
   ];

   function maskPhoneWithTestData(html: string): string {
     const phones = extractPhoneNumbers(html);

     phones.forEach((phone, index) => {
       const testPhone = TEST_PHONE_NUMBERS[index % TEST_PHONE_NUMBERS.length];
       html = html.replace(phone, testPhone);
     });

     return html;
   }

   // AI can now validate: "Phone shows +966501234567 (valid format)"
   ```

3. **Selective masking** - Don't mask test accounts
   ```typescript
   const TEST_ACCOUNTS = [
     'test.customer@dawati-test.com',
     'test.vendor@dawati-test.com',
     '+966500000001',  // Test customer phone
   ];

   function shouldMaskValue(value: string): boolean {
     // Don't mask known test accounts
     if (TEST_ACCOUNTS.some(testValue => value.includes(testValue))) {
       return false;
     }

     // Don't mask synthetic data patterns
     if (value.match(/test-user-\d+@example\.com/)) {
       return false;
     }

     // Mask everything else
     return true;
   }
   ```

4. **Screenshot masking via bounding boxes** - Not OCR
   ```typescript
   // Don't try to OCR + redact screenshots (slow, error-prone)
   // Instead: Use consistent test accounts + bounding box redaction

   async function maskScreenshotPII(screenshotPath: string): Promise<string> {
     const page = await browser.newPage();

     // Redact known PII elements with black boxes BEFORE screenshot
     await page.evaluate(() => {
       const piiSelectors = [
         '[data-testid="user-phone"]',
         '[data-testid="user-email"]',
         '.user-profile-photo',
       ];

       piiSelectors.forEach(selector => {
         const elements = document.querySelectorAll(selector);
         elements.forEach(el => {
           (el as HTMLElement).textContent = '████████';
         });
       });
     });

     await page.screenshot({ path: screenshotPath });
   }
   ```

5. **PII masking levels** - Progressive privacy
   ```typescript
   enum PIIMaskingLevel {
     NONE = 0,           // No masking (local dev only)
     MINIMAL = 1,        // Mask real user data, preserve test accounts
     MODERATE = 2,       // Mask all PII but preserve structure
     AGGRESSIVE = 3,     // Mask everything (breaks AI analysis)
   }

   const maskingLevel = process.env.CI === 'true'
     ? PIIMaskingLevel.MODERATE  // CI: mask but keep structure
     : PIIMaskingLevel.MINIMAL;  // Local: only mask real users
   ```

**Detection:**
- AI analysis says "looks correct" but screenshots show validation bugs
- Test reports say "phone number format correct" when it's clearly wrong in screenshot
- All emails in analysis appear as "user@example.com"
- Team manually reviews screenshots because AI analysis is useless

**Warning signs:**
- All regex patterns end with `/g` (global replace, no context preservation)
- No test account exemptions in masking logic
- Screenshot masking uses OCR (slow, brittle)
- Masking enabled equally in local dev and CI

---

### Pitfall 4: CI/CD Flakiness from Local Timing Assumptions

**What goes wrong:** Tests pass 100% locally (fast M1 Mac, localhost, no network latency) but fail 40% in CI (slower runners, network round-trips, resource contention). Team adds `.wait(5000)` everywhere, tests become slow, still flaky.

**Why it happens:**
- Local dev: Expo dev server on localhost, instant responses
- CI: Expo prod build on Vercel, 100-500ms RTT per request
- Local: 8-core M1 Mac, dedicated resources
- CI: Shared 2-core runner, competing with other jobs
- Tests use hardcoded waits instead of dynamic conditions

**Consequences:**
- **30-60% flaky test rate in CI** (industry average: 15% flaky is "normal" but bad)
- **Slow tests**: Defensive `wait(10000)` everywhere, 2-hour test suite becomes 6 hours
- **Retry hell**: Tests rerun 3x on failure, wasting CI minutes
- **Developer friction**: "Tests are flaky, ignore CI failures"

**Prevention:**

1. **Dynamic waits with reasonable timeouts**
   ```typescript
   // BAD: Hardcoded wait
   await page.click('[data-testid="submit"]');
   await page.waitForTimeout(5000); // Maybe enough? Maybe not?

   // GOOD: Wait for condition with timeout
   await page.click('[data-testid="submit"]');
   await page.waitForSelector('[data-testid="success-message"]', {
     state: 'visible',
     timeout: 10000, // Max wait, but returns immediately when visible
   });
   ```

2. **Network wait for Expo/Vercel deploys**
   ```typescript
   // Before test suite, verify app is responsive
   async function waitForAppReady(url: string, maxAttempts = 30) {
     for (let i = 0; i < maxAttempts; i++) {
       try {
         const response = await fetch(url);
         if (response.ok) {
           console.log(`App ready after ${i + 1} attempts`);
           return;
         }
       } catch (error) {
         console.log(`App not ready, attempt ${i + 1}/${maxAttempts}`);
         await sleep(2000);
       }
     }
     throw new Error('App did not become ready in time');
   }

   // In CI, Vercel deploy takes 30-60s to become responsive
   if (process.env.CI === 'true') {
     await waitForAppReady(config.baseUrl);
   }
   ```

3. **Viewport-aware waits** (CI runners may have slower rendering)
   ```typescript
   // Wait for network + rendering + paint
   await page.goto(url, { waitUntil: 'networkidle' }); // Network settled
   await page.waitForLoadState('domcontentloaded');    // DOM ready
   await page.evaluate(() => document.fonts.ready);    // Fonts loaded

   // For React Native Web / Expo, also wait for hydration
   await page.waitForFunction(() => {
     return window.__REACT_HYDRATED__ === true;
   }, { timeout: 5000 });
   ```

4. **Resource contention detection**
   ```typescript
   // Detect if CI runner is under heavy load
   async function isRunnerOverloaded(): Promise<boolean> {
     const start = Date.now();

     // CPU-bound task: should take ~50ms on normal runner
     let sum = 0;
     for (let i = 0; i < 1000000; i++) {
       sum += Math.sqrt(i);
     }

     const duration = Date.now() - start;

     if (duration > 200) {
       console.warn(`Runner appears overloaded (CPU test took ${duration}ms, expected <100ms)`);
       return true;
     }

     return false;
   }

   // If overloaded, extend timeouts by 2x
   if (await isRunnerOverloaded()) {
     config.timeout *= 2;
   }
   ```

5. **Explicit CI/Local config split**
   ```typescript
   // config/default-config.ts
   export function loadConfig(): TestConfig {
     const isCI = process.env.CI === 'true';

     return {
       timeout: isCI ? 30000 : 10000,          // 3x longer in CI
       navigationTimeout: isCI ? 60000 : 20000, // Network waits
       screenshotDelay: isCI ? 1000 : 500,      // Let rendering settle
       retries: isCI ? 2 : 0,                   // Retry in CI only
       workers: isCI ? 1 : 4,                   // Parallel local, serial CI
     };
   }
   ```

**Detection:**
- Tests pass 100% locally, fail 30-60% in CI
- CI logs show "TimeoutError: Waiting for selector"
- Test durations vary wildly in CI (same test: 5s, 45s, 12s)
- Rerunning failed tests passes (timing-dependent failure)

**Warning signs:**
- Config has identical timeouts for local and CI
- Many `waitForTimeout(5000)` hardcoded waits
- No network readiness check before tests
- Test suite uses `.only()` or `.skip()` to work around flaky tests

---

### Pitfall 5: Performance Testing on Inconsistent Environments

**What goes wrong:** Team adds performance tests (LCP, FCP, TTI), tests pass locally (<1s LCP) but fail in CI (>5s LCP). Team either disables performance tests or sets thresholds so high (LCP <10s) they're meaningless.

**Why it happens:**
- Local: M1 Mac, Chrome/Chromium with hardware acceleration, localhost network
- CI: 2-core Linux runner, Chromium with `--disable-gpu`, public Vercel URL with CDN latency
- Performance budgets set based on local measurements
- No baseline for "acceptable CI performance" vs "acceptable user performance"

**Consequences:**
- **Useless performance tests**: Thresholds so high they never fail
- **Disabled performance tests**: "Too flaky, just skip them"
- **Missed regressions**: Real performance issues (5s → 8s LCP) go undetected because baseline is 10s
- **False failures**: Transient network spikes fail tests

**Prevention:**

1. **Separate performance budgets for CI vs Real Users**
   ```typescript
   const PERFORMANCE_BUDGETS = {
     // Real user targets (from field data)
     realUsers: {
       lcp: 2500,  // "Good" per Core Web Vitals
       fcp: 1800,
       tti: 3800,
     },

     // CI targets (higher due to slow runners, but still catch regressions)
     ci: {
       lcp: 5000,  // 2x real user target
       fcp: 3500,
       tti: 7500,
     },

     // Local dev (lower for fast feedback)
     local: {
       lcp: 1500,
       fcp: 1000,
       tti: 2500,
     },
   };

   const budgets = process.env.CI === 'true'
     ? PERFORMANCE_BUDGETS.ci
     : PERFORMANCE_BUDGETS.local;
   ```

2. **Percentile-based thresholds** - Not single-run
   ```typescript
   // BAD: Single measurement (flaky)
   const lcp = await measureLCP();
   expect(lcp).toBeLessThan(2500);

   // GOOD: P95 over multiple runs
   async function measureLCPP95(runs = 5): Promise<number> {
     const measurements: number[] = [];

     for (let i = 0; i < runs; i++) {
       await page.reload();
       const lcp = await measureLCP();
       measurements.push(lcp);
     }

     measurements.sort((a, b) => a - b);
     const p95Index = Math.floor(measurements.length * 0.95);

     return measurements[p95Index];
   }

   const p95LCP = await measureLCPP95();
   expect(p95LCP).toBeLessThan(budgets.lcp);
   ```

3. **Network throttling for consistency**
   ```typescript
   // Emulate "Fast 3G" for consistent CI measurements
   await page.context().route('**/*', route => {
     setTimeout(() => route.continue(), 50); // 50ms delay
   });

   // Or use Playwright's network emulation
   await page.route('**/*', route => {
     route.continue({
       // Simulate 1.5 Mbps download, 750 Kbps upload
       // (Fast 3G profile from Chrome DevTools)
     });
   });
   ```

4. **Relative performance tests** - Not absolute
   ```typescript
   // Instead of "LCP must be <2.5s", measure "LCP must not regress >20%"

   interface PerformanceBaseline {
     lcp: number;
     fcp: number;
     measuredAt: string;
     gitCommit: string;
   }

   async function checkForRegression(current: number, baseline: number, metric: string) {
     const regressionPercent = ((current - baseline) / baseline) * 100;

     if (regressionPercent > 20) {
       throw new Error(
         `Performance regression: ${metric} increased ${regressionPercent.toFixed(1)}% ` +
         `(baseline: ${baseline}ms, current: ${current}ms)`
       );
     }
   }
   ```

5. **CI-specific performance test suite**
   ```typescript
   // Don't run performance tests on every CI run (too flaky)
   // Run them on:
   // 1. Scheduled nightly builds (stable conditions)
   // 2. Release branches only
   // 3. Manual trigger with "performance" label

   const shouldRunPerformanceTests =
     process.env.CI_SCHEDULE === 'nightly' ||
     process.env.GITHUB_REF?.startsWith('refs/heads/release/') ||
     process.env.RUN_PERFORMANCE_TESTS === 'true';

   if (!shouldRunPerformanceTests) {
     console.log('Skipping performance tests (not in nightly/release)');
     return;
   }
   ```

**Detection:**
- Performance test pass rate <70% in CI
- Performance metrics vary wildly between runs (LCP: 2s, 8s, 3s, 12s)
- Team disables performance tests or uses `test.skip()`
- Thresholds >5s for LCP (meaningless, Core Web Vitals "poor" threshold is 4s)

**Warning signs:**
- Performance budgets set based on local dev measurements
- Single-run measurements (no averaging or percentiles)
- No network throttling in CI
- Performance tests run on every PR (should be nightly/release only)

---

## MODERATE PITFALLS - Integration Issues

### Pitfall 6: Security Testing Without Authenticated Contexts

**What goes wrong:** Team adds security tests (SQL injection, XSS, CSRF) but runs them unauthenticated. Tests miss critical vulnerabilities in authenticated-only endpoints (account settings, payment forms, admin panel).

**Why it happens:**
- Security test examples online show unauthenticated attacks (login page injection)
- Setting up authenticated contexts for security tests is tricky
- OWASP ZAP / vulnerability scanners default to unauthenticated scans
- Team treats security testing as separate from functional testing

**Consequences:**
- **False confidence**: "Security tests pass" but only tested public pages
- **Missed critical bugs**: XSS in account settings, CSRF on payment form, SQL injection in admin panel—all untested
- **Audit failures**: Compliance audits reveal massive security gaps in authenticated flows
- **Production incidents**: Real attacks exploit authenticated endpoints

**Prevention:**

1. **Authenticated security test contexts**
   ```typescript
   // Reuse authentication from functional tests
   import { authenticate } from './helpers/auth';

   describe('Security Tests - Authenticated', () => {
     let authContext: BrowserContext;

     beforeAll(async () => {
       authContext = await browser.newContext();
       const page = await authContext.newPage();
       await authenticate(page, 'test.user@example.com');
     });

     test('XSS prevention in account settings', async () => {
       const page = await authContext.newPage();
       await page.goto('/account/edit-profile');

       // Try XSS in profile name field
       await page.fill('[name="displayName"]', '<script>alert("XSS")</script>');
       await page.click('[type="submit"]');

       // Verify script is escaped, not executed
       const displayName = await page.textContent('[data-testid="display-name"]');
       expect(displayName).toBe('<script>alert("XSS")</script>'); // Literal text, not executed
     });
   });
   ```

2. **Role-based security testing**
   ```typescript
   // Test with multiple auth levels: customer, vendor, admin
   const SECURITY_ROLES = [
     { role: 'customer', email: 'test.customer@example.com' },
     { role: 'vendor', email: 'test.vendor@example.com' },
     { role: 'admin', email: 'test.admin@example.com' },
   ];

   for (const { role, email } of SECURITY_ROLES) {
     describe(`Security Tests - ${role}`, () => {
       let context: BrowserContext;

       beforeAll(async () => {
         context = await browser.newContext();
         const page = await context.newPage();
         await authenticate(page, email);
       });

       test('IDOR prevention', async () => {
         const page = await context.newPage();

         // Try accessing another user's data
         await page.goto('/api/user/12345/orders'); // Not this user's ID

         const response = await page.waitForResponse('/api/user/12345/orders');
         expect(response.status()).toBe(403); // Forbidden
       });
     });
   }
   ```

3. **CSRF token validation**
   ```typescript
   test('CSRF protection on payment form', async () => {
     const page = await authContext.newPage();
     await page.goto('/checkout');

     // Extract CSRF token from form
     const csrfToken = await page.getAttribute('[name="_csrf"]', 'value');

     // Try submitting WITHOUT token (direct API call)
     const response = await page.request.post('/api/payment/process', {
       data: { amount: 1000, cardToken: 'tok_test' },
       // Missing CSRF token
     });

     expect(response.status()).toBe(403); // Should reject

     // Try with token - should succeed
     const validResponse = await page.request.post('/api/payment/process', {
       data: {
         amount: 1000,
         cardToken: 'tok_test',
         _csrf: csrfToken,
       },
     });

     expect(validResponse.status()).toBe(200);
   });
   ```

**Detection:**
- Security test suite only tests login/signup pages
- No tests for admin panel security
- Tests don't authenticate before making requests
- Security scan reports only cover public pages

---

### Pitfall 7: Click Validation Expansion Breaking Existing Tests

**What goes wrong:** Team adds `expectAfterClick` validation to all 15 test files. Tests that previously passed (click happened, page moved on) now fail because "expected element not found" after click. Team realizes 40% of clicks don't actually work, but fixes would be huge scope creep.

**Why it happens:**
- Current system: Click happens, test continues (no validation)
- New system: Click must produce expected result (validation added)
- Many clicks are "navigation away" - can't validate element on new page
- Some clicks have race conditions (element appears then disappears)

**Consequences:**
- **Mass test failures**: 63/63 → 30/63 when click validation added
- **Scope explosion**: "Just add validation" becomes "fix 100 broken interactions"
- **Revert pressure**: "Tests were passing before, this is too much work"
- **Half-implemented**: Click validation only in 3/15 files, inconsistent coverage

**Prevention:**

1. **Phased rollout by test file**
   ```typescript
   // Don't enable expectAfterClick everywhere at once
   // Phase 1: Add to 3 highest-value test files
   //   - auth-flow.test.ts (critical path)
   //   - marketplace-booking.test.ts (revenue critical)
   //   - account-settings.test.ts (data integrity)

   // Phase 2: Add to 5 more files (week 2)
   // Phase 3: Add to remaining 7 files (week 3)

   // Track in config
   const CLICK_VALIDATION_ENABLED = {
     'auth-flow': true,           // Phase 1
     'marketplace-booking': true, // Phase 1
     'account-settings': true,    // Phase 1
     'vendor-dashboard': false,   // Phase 2
     'events-flow': false,        // Phase 2
     // ...
   };
   ```

2. **Soft assertions during rollout**
   ```typescript
   // Don't fail tests immediately - log issues first
   async function expectAfterClick(
     selector: string,
     expectedSelector: string,
     mode: 'strict' | 'soft' = 'soft'
   ) {
     await page.click(selector);

     const elementFound = await page.locator(expectedSelector).count() > 0;

     if (!elementFound) {
       if (mode === 'strict') {
         throw new Error(`Expected element not found: ${expectedSelector}`);
       } else {
         // Soft mode: Log warning but don't fail
         logger.warn(`Click validation failed: ${expectedSelector} not found after clicking ${selector}`);
         metrics.recordClickValidationFailure(selector, expectedSelector);
       }
     }
   }

   // Gradually convert from 'soft' to 'strict' mode
   ```

3. **Click validation exemptions**
   ```typescript
   // Some clicks legitimately can't be validated (navigation away)
   const CLICK_VALIDATION_EXEMPTIONS = {
     '[data-testid="logout-button"]': {
       reason: 'Navigates to welcome page, element not on new page',
       validate: 'url-change',
     },
     '[data-testid="external-link"]': {
       reason: 'Opens external site in new tab',
       validate: 'new-tab',
     },
   };

   async function expectAfterClickSmart(selector: string, expectedSelector: string) {
     const exemption = CLICK_VALIDATION_EXEMPTIONS[selector];

     if (exemption) {
       if (exemption.validate === 'url-change') {
         const oldUrl = page.url();
         await page.click(selector);
         await page.waitForURL(url => url !== oldUrl);
       } else if (exemption.validate === 'new-tab') {
         const [newPage] = await Promise.all([
           context.waitForEvent('page'),
           page.click(selector),
         ]);
         expect(newPage.url()).toContain('external');
       }
     } else {
       await expectAfterClick(selector, expectedSelector);
     }
   }
   ```

**Detection:**
- PR adding click validation causes 30+ test failures
- Team creates "fix click validation" umbrella ticket with 50 subtasks
- Click validation only present in 1-2 test files after 2 weeks
- Tests revert to no validation after failures

---

## MINOR PITFALLS - Common Mistakes

### Pitfall 8: Hardcoded Pattern Expansion Without Priority

**What goes wrong:** Team expands RTL checker from 30 patterns to 300 patterns in one commit. Test runs become 10x slower (regex matching 300 patterns per DOM snapshot), and 90% of new patterns never match (Arabic medical terms in an event planning app).

**Why it happens:**
- Documentation claimed "300+ patterns" but only 30 exist
- Team adds every possible Arabic/English word pair from dictionary
- No analysis of which patterns actually matter for this app
- No performance testing of pattern matching

**Consequences:**
- **10x slower RTL checks**: 200ms → 2000ms per phase
- **False positives**: Medical/legal terms flagged in app that doesn't use them
- **Maintenance burden**: 270 unused patterns to maintain
- **Diminishing returns**: 30 patterns caught 95% of issues, 300 patterns catches 96%

**Prevention:**

1. **Analyze existing issues before expanding**
   ```bash
   # Before adding 270 patterns, check what issues actually occurred
   grep -r "hardcoded English" test-reports/*.json

   # Results show:
   # - "Loading" (5 occurrences)
   # - "Submit" (3 occurrences)
   # - "Error" (2 occurrences)
   # - Medical terms: 0 occurrences

   # Conclusion: Add 10 high-value patterns, not 270 low-value ones
   ```

2. **Tiered pattern matching**
   ```typescript
   const RTL_PATTERNS = {
     critical: [
       // P0: Always check (fast, high-value)
       'Loading', 'Error', 'Submit', 'Cancel', 'Delete',
       'Home', 'Profile', 'Settings',
     ],

     standard: [
       // P1: Check on full suite runs (medium-value)
       'Welcome', 'Thank You', 'Confirm', 'Save',
       // ... 50 more
     ],

     comprehensive: [
       // P2: Check on nightly builds only (low-value, slow)
       'Anesthesia', 'Litigation', 'Hematology',
       // ... 240 more domain-specific terms
     ],
   };

   const patternsToCheck = process.env.RTL_CHECK_LEVEL === 'comprehensive'
     ? [...RTL_PATTERNS.critical, ...RTL_PATTERNS.standard, ...RTL_PATTERNS.comprehensive]
     : process.env.CI === 'true'
     ? [...RTL_PATTERNS.critical, ...RTL_PATTERNS.standard]
     : RTL_PATTERNS.critical; // Local dev: fast feedback
   ```

3. **Pattern usage metrics**
   ```typescript
   // Track which patterns actually match
   const patternStats = new Map<string, number>();

   function checkPattern(html: string, pattern: string): boolean {
     const regex = new RegExp(pattern, 'gi');
     const matches = html.match(regex);

     if (matches && matches.length > 0) {
       patternStats.set(pattern, (patternStats.get(pattern) || 0) + matches.length);
       return true;
     }

     return false;
   }

   // After test suite: Report unused patterns
   function reportPatternUsage() {
     const unusedPatterns = RTL_PATTERNS.comprehensive.filter(p => !patternStats.has(p));

     if (unusedPatterns.length > 50) {
       console.warn(`${unusedPatterns.length} patterns never matched - consider removing`);
     }
   }
   ```

**Detection:**
- RTL check duration increases from 200ms to 2000ms after pattern expansion
- Pattern stats show 90% of patterns never match
- Test suite reports issues with medical/legal terms in event planning app

---

### Pitfall 9: CI/CD Pipeline Without Manual Trigger

**What goes wrong:** Team sets up CI/CD to run full test suite on every PR commit. Developers push 5 commits debugging a feature, each triggering 2-hour test run. CI queue backs up, PRs wait 6 hours for test results, team disables automated testing.

**Why it happens:**
- GitHub Actions defaults: `on: [push, pull_request]` runs on every commit
- Full test suite (15 test files, 63 phases) takes 90-120 minutes
- No distinction between "quick smoke test" and "full regression suite"
- Expensive AI API calls on every run

**Consequences:**
- **CI queue congestion**: 10 PRs × 5 commits each × 2 hours = 100 hours of CI time
- **Cost explosion**: Gemini API costs 10x expected (running on every commit)
- **Developer friction**: "CI is too slow, I'll merge without waiting"
- **Disabled automation**: Team turns off automated runs, loses value

**Prevention:**

1. **Tiered CI strategy**
   ```yaml
   # .github/workflows/test-quick.yml
   name: Quick Tests (Smoke)
   on:
     push:
       branches: [main, develop]
     pull_request:

   jobs:
     smoke-test:
       runs-on: ubuntu-latest
       steps:
         - name: Run smoke tests (3 critical suites only)
           run: |
             npm run test:smoke  # auth-flow, marketplace-flow, account-settings
             # ~15 minutes, catches 80% of regressions

   ---
   # .github/workflows/test-full.yml
   name: Full Test Suite
   on:
     schedule:
       - cron: '0 2 * * *'  # Nightly at 2 AM
     workflow_dispatch:      # Manual trigger
     push:
       branches: [release/*] # Only on release branches

   jobs:
     full-test:
       runs-on: ubuntu-latest
       steps:
         - name: Run all 15 test suites
           run: npm run test:all
           # ~120 minutes, full coverage
   ```

2. **Cost budgets per run type**
   ```typescript
   const CI_BUDGETS = {
     smoke: {
       maxCost: 0.50,      // $0.50 per smoke run
       maxDuration: 900,   // 15 minutes
       suites: ['auth-flow', 'marketplace-flow', 'account-settings'],
     },

     full: {
       maxCost: 5.00,      // $5.00 per full run
       maxDuration: 7200,  // 2 hours
       suites: 'all',
     },
   };

   async function enforceRunBudget(runType: 'smoke' | 'full') {
     const budget = CI_BUDGETS[runType];

     orchestrator.on('phaseComplete', (result) => {
       totalCost += result.cost;

       if (totalCost > budget.maxCost) {
         throw new Error(`Budget exceeded: $${totalCost} > $${budget.maxCost}`);
       }
     });
   }
   ```

3. **Smart triggering based on file changes**
   ```yaml
   # Only run visual regression if UI files changed
   - name: Check for UI changes
     id: ui-changes
     run: |
       if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E '\.(tsx|css|scss)$'; then
         echo "ui_changed=true" >> $GITHUB_OUTPUT
       fi

   - name: Run visual regression
     if: steps.ui-changes.outputs.ui_changed == 'true'
     run: npm run test:visual-regression

   # Only run performance tests if critical files changed
   - name: Run performance tests
     if: |
       contains(github.event.pull_request.labels.*.name, 'performance') ||
       contains(github.event.head_commit.message, '[perf]')
     run: npm run test:performance
   ```

**Detection:**
- CI queue shows 20+ pending jobs
- API costs 10x projected ($50/day instead of $5/day)
- PRs labeled "ci: skip" to avoid triggering tests
- Developers merge without waiting for CI

---

## Phase-Specific Research Flags

| Phase Topic | Likely Pitfall | Needs Deep Research |
|-------------|---------------|---------------------|
| Visual Regression Baseline Creation | Baseline pollution (Pitfall 2) | HIGH - Research: baseline review workflows, approval processes |
| PII Masking Implementation | Over-redaction breaking AI (Pitfall 3) | MEDIUM - Research: selective masking strategies |
| CI/CD Integration | Timing assumptions (Pitfall 4) | MEDIUM - Research: CI-specific config patterns |
| Performance Testing | Inconsistent environments (Pitfall 5) | HIGH - Research: percentile-based budgets, network throttling |
| Security Testing | Unauthenticated contexts (Pitfall 6) | MEDIUM - Research: role-based security test patterns |
| Click Validation Expansion | Mass test failures (Pitfall 7) | LOW - Use phased rollout from existing click-validation-example.test.ts |
| Scoring Threshold Tightening | Immediate regression (Pitfall 1) | CRITICAL - Shadow mode implementation required |
| Pattern Expansion | Performance degradation (Pitfall 8) | LOW - Pattern usage metrics simple to add |
| CI Automation Strategy | Cost/queue congestion (Pitfall 9) | MEDIUM - Research: tiered CI workflows |

---

## Success Metrics for Hardening

Hardening is successful when:

1. **63/63 PASS maintained** - No regression from current state
2. **Scoring enforced gradually** - 4-week rollout with shadow mode first
3. **Visual regression baselines reviewed** - 100% of baselines have metadata + 2 reviewers
4. **PII masking preserves context** - AI analysis still catches validation bugs
5. **CI flakiness <15%** - Industry-standard acceptable flakiness rate
6. **Performance tests run nightly** - Not on every PR (too flaky)
7. **Security tests cover authenticated flows** - All 3 roles (customer, vendor, admin)
8. **Click validation in 15/15 files** - Phased rollout over 3 weeks
9. **CI costs within budget** - <$10/day for full suite, <$2/day for smoke tests
10. **Team confidence high** - Developers trust test results, don't skip CI

---

## Sources

**Existing System Analysis:**
- `dawati-tester/vertex-ai-testing/src/orchestrator/test-orchestrator.ts` (lines 110-121: overallStatus calculation)
- `dawati-tester/vertex-ai-testing/src/decision-engine/response-parser.ts` (lines 98-104: AI always returns PASS)
- `dawati-tester/vertex-ai-testing/src/visual-regression/baseline-manager.ts` (lines 31-43: auto-create baselines)
- `dawati-tester/vertex-ai-testing/src/artifact-manager/pii-masker.ts` (lines 32-60: regex-based masking)
- `dawati-tester/src/checklist-validator.ts` (scoring calculation)

**Playwright Best Practices:**
- Playwright official documentation on CI/CD (handling flakiness, timeouts)
- Playwright visual regression with pixelmatch library
- Network emulation and throttling for consistent performance testing

**Domain Knowledge:**
- Production hardening patterns for existing working systems
- Gradual threshold tightening strategies
- Baseline management and review processes (inspired by VRT tooling like Percy, Chromatic)
- PII masking strategies that preserve test effectiveness
