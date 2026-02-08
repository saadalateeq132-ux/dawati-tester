# Domain Pitfalls: Autonomous AI-Powered Testing Systems

**Domain:** AI-Powered Autonomous Web Testing (React Native/Expo, Playwright, Gemini AI)
**Researched:** 2026-02-08
**Confidence:** MEDIUM-HIGH (verified via multiple 2026 sources)

## Executive Summary

Building autonomous testing systems with AI introduces complexity across five critical dimensions: AI reliability (hallucinations, inconsistent performance), automation stability (flaky tests, timeout management), authentication flows (OAuth token management), visual verification (screenshot consistency), and system integration (rate limits, reporting). The most dangerous pitfall is **treating AI-generated test assertions as ground truth without validation**—autonomous systems can confidently assert incorrect behaviors, creating false confidence in broken features.

---

## Critical Pitfalls

Mistakes that cause rewrites, production incidents, or fundamental system failures.

### Pitfall 1: AI Hallucination in Test Assertions

**What goes wrong:** AI models confidently generate test assertions that are factually incorrect, leading to false positives (tests pass when features are broken) or false negatives (tests fail when features work correctly). Gemini and other LLMs produce hallucinations as a core behavior—not a bug that can be patched.

**Why it happens:** LLMs are trained to generate plausible-sounding text, not to verify facts. When analyzing screenshots or application state, they may "see" UI elements that don't exist or misinterpret user flows based on learned patterns rather than actual observation.

**Consequences:**
- **False confidence in broken features**: Tests pass while critical bugs ship to production
- **Test suite becomes noise**: Developers stop trusting automated test results
- **Wasted debugging time**: Teams chase phantom issues reported by hallucinating AI
- **Regulatory/compliance risk**: For financial or healthcare apps, false test results create audit trails of non-existent validation

**Prevention:**
1. **Multi-layer verification**: Never rely on a single AI inference
   ```typescript
   // BAD: Single AI call determines pass/fail
   const result = await gemini.analyze(screenshot);
   expect(result.passed).toBe(true);

   // GOOD: Multiple verification layers
   const aiAnalysis = await gemini.analyze(screenshot);
   const domState = await page.evaluate(() => document.readyState);
   const expectedElements = await page.locator('[data-testid="success"]').count();

   if (aiAnalysis.passed && domState === 'complete' && expectedElements > 0) {
     // Higher confidence in pass
   }
   ```

2. **Hallucination rate monitoring**: Track how often AI assertions contradict deterministic checks
   - Measure **precision** (how many detected issues are real) and **recall** (how many real issues are detected)
   - Set alert thresholds: >10% hallucination rate = investigation required
   - Use metrics: accuracy, intent recognition, hallucination detection with configurable thresholds

3. **Confidence scoring**: Require AI to provide confidence scores, reject low-confidence assertions
   ```typescript
   if (aiAnalysis.confidence < 0.85) {
     logger.warn('Low confidence AI result, falling back to deterministic check');
     return performTraditionalAssertion();
   }
   ```

4. **Human-in-the-loop for critical paths**: OAuth flows, payment processing, data deletion—always require human review of AI-generated test results

**Detection:**
- Tests that pass consistently in CI but fail in production
- AI assertions that contradict Playwright's deterministic DOM queries
- Developers manually verifying "passed" tests and finding failures

**Sources:**
- [AI Hallucinations Testing | TestFort](https://testfort.com/blog/ai-hallucination-testing-guide)
- [What are AI Hallucinations? - testRigor](https://testrigor.com/blog/ai-hallucinations/)
- [TestMu AI Recognized in Forrester Wave on Autonomous Testing Q4 2025](https://www.financialcontent.com/article/bizwire-2026-2-2-testmu-ai-formerly-lambdatest-recognized-in-independent-research-on-autonomous-testing-platforms-q4-2025)

---

### Pitfall 2: Gemini API Rate Limit Chaos

**What goes wrong:** Tests fail randomly in CI/CD with 429 errors (rate limit exceeded), but the root cause varies: per-minute limits, daily quotas, or project-level exhaustion across multiple API keys. Teams waste hours debugging "flaky tests" that are actually quota issues.

**Why it happens:**
- **December 2025 quota cuts**: Google slashed free tier limits by 50-92%. Gemini 2.5 Flash dropped from 250 RPD to 20-50 RPD; Gemini 2.5 Pro dropped from 50 RPD to 25 RPD, and RPM limits fell from 15 to 5 for Pro models
- **Misunderstanding rate limit scopes**: Developers assume rate limits are per API key, but they're actually **per Google Cloud project**—creating 3 API keys doesn't triple your quota
- **Conflating different 429 types**: RPM limits (reset in 60 seconds) vs RPD limits (reset at midnight PT) require different handling strategies

**Consequences:**
- Test suites that work fine with 5 tests fail when scaled to 50 tests
- CI/CD pipelines randomly fail, forcing manual reruns
- Emergency quota upgrade requests during critical releases
- Burning through paid quota unexpectedly

**Prevention:**
1. **Distinguish between limit types in error handling**
   ```typescript
   try {
     const response = await gemini.analyze(screenshot);
   } catch (error) {
     if (error.code === 429) {
       const limitType = error.details?.limitType; // RPM vs RPD

       if (limitType === 'REQUESTS_PER_MINUTE') {
         // Wait 60 seconds and retry
         await sleep(60000);
         return retry();
       } else if (limitType === 'REQUESTS_PER_DAY') {
         // Can't recover until midnight PT
         throw new FatalTestError('Daily quota exhausted, cannot continue');
       }
     }
   }
   ```

2. **Implement exponential backoff with jitter**
   ```typescript
   async function callGeminiWithBackoff(request, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await gemini.call(request);
       } catch (error) {
         if (error.code === 429 && i < maxRetries - 1) {
           const backoff = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           const jitter = Math.random() * 1000;   // Random 0-1s
           await sleep(backoff + jitter);
         } else {
           throw error;
         }
       }
     }
   }
   ```

3. **Monitor quota consumption proactively**
   - Track RPM/RPD usage per test run
   - Alert when approaching 80% of daily quota
   - Consider upgrading to paid tier early (free tier is insufficient for CI/CD)

4. **Batch and cache intelligently**
   - Cache AI analysis results for identical screenshots (15-minute cache)
   - Batch multiple screenshot analyses into single API call when possible
   - Skip AI analysis for obviously passing states (e.g., HTTP 200 + expected URL)

**Detection:**
- Sporadic 429 errors in CI logs
- Tests that pass early in the day but fail later (hitting daily quota)
- Multiple API keys showing same rate limit errors (project-level limits)

**Sources:**
- [Gemini API Rate Limits Official Docs](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio Quota Issues – 2026 Guide](https://help.apiyi.com/en/google-ai-studio-rate-limit-solution-guide-en.html)
- [Gemini API Free Tier: Complete Guide 2026](https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier)
- [Fix Gemini 2.5 Pro Rate Limit Errors](https://www.arsturn.com/blog/gemini-2-5-pro-rate-limit-exceeded-a-practical-guide-to-fixing-it)

---

### Pitfall 3: OAuth Testing Without Token Refresh Strategy

**What goes wrong:** Tests authenticate successfully at the start, but fail 30 minutes later when access tokens expire. Teams implement workarounds like "re-authenticate before every test," which works locally but creates race conditions in parallel CI execution.

**Why it happens:**
- OAuth best practices mandate short-lived access tokens (15-30 minutes)
- Tests assume authentication is one-time setup, not ongoing session management
- Refresh token rotation (security best practice) invalidates old refresh tokens, breaking naive retry logic

**Consequences:**
- Tests pass locally (run in <15 minutes) but fail in CI (queued, taking 45+ minutes)
- Parallel test execution causes token conflicts (one test invalidates another's tokens)
- Flaky authentication that's nearly impossible to reproduce consistently
- Security team rejects test approach due to insecure token storage

**Prevention:**
1. **Implement centralized token manager with refresh logic**
   ```typescript
   class OAuthTokenManager {
     private accessToken: string;
     private refreshToken: string;
     private expiresAt: number;

     async getValidToken(): Promise<string> {
       if (Date.now() >= this.expiresAt - 60000) { // Refresh 1 min early
         await this.refreshAccessToken();
       }
       return this.accessToken;
     }

     private async refreshAccessToken() {
       const response = await fetch('/oauth/token', {
         method: 'POST',
         body: JSON.stringify({
           grant_type: 'refresh_token',
           refresh_token: this.refreshToken
         })
       });

       const data = await response.json();
       this.accessToken = data.access_token;
       this.refreshToken = data.refresh_token; // Handle rotation
       this.expiresAt = Date.now() + (data.expires_in * 1000);
     }
   }
   ```

2. **Use OAuth mock servers for test environments**
   - Tools like [oauth2-mock-server](https://github.com/axa-group/oauth2-mock-server) provide controllable OAuth flows
   - Configure token expiration times for test scenarios (e.g., 5 minutes for expiry tests)
   - Avoid hitting production OAuth providers in CI

3. **Test token refresh explicitly**
   ```typescript
   test('handles token expiration gracefully', async () => {
     // Set token to expire in 10 seconds
     await mockOAuthServer.setTokenExpiry(10);

     await page.goto('/dashboard'); // Uses valid token
     await sleep(15000);             // Wait for expiration
     await page.click('[data-testid="load-data"]'); // Should auto-refresh

     // Verify app didn't error, auto-refreshed token
     await expect(page.locator('[data-testid="data-loaded"]')).toBeVisible();
   });
   ```

4. **Secure token storage in tests**
   - Never commit OAuth tokens to git
   - Use environment variables or secure secret management (e.g., GitHub Secrets)
   - Implement automated checks to reject hardcoded tokens in code

**Detection:**
- Tests that fail after X minutes with "401 Unauthorized" errors
- Different behavior between local runs and CI runs
- Authentication errors in parallel test execution

**Sources:**
- [How to Test OAuth Authentication - Testim](https://www.testim.io/blog/how-to-test-oauth-authentication/)
- [OAuth Refresh Token Explained | Curity](https://curity.io/resources/learn/oauth-refresh/)
- [Refresh Token Rotation Best Practices 2026](https://www.serverion.com/uncategorized/refresh-token-rotation-best-practices-for-developers/)
- [Testing for OAuth Weaknesses - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/05-Testing_for_OAuth_Weaknesses)

---

### Pitfall 4: Screenshot Test Flakiness Cascade

**What goes wrong:** Screenshot comparison tests that pass 95% of the time suddenly fail with "1,247 pixels differ" errors. Engineers spend hours investigating, only to discover the culprit is font rendering differences, animation timing, or a blinking cursor captured mid-frame.

**Why it happens:**
- **OS-dependent font rendering**: Each OS (Windows, macOS, Linux) renders fonts differently; even OS updates change font smoothing
- **Animation and dynamic content**: Dates, times, spinners, and CSS animations introduce non-deterministic visual states
- **Race conditions**: Screenshots captured before lazy-loaded images fully render
- **Mouse/focus states**: Blinking text cursors or hover states captured at different moments

**Consequences:**
- Teams lose trust in visual regression tests ("it's always flaky")
- Engineers waste hours on false positive investigations
- Real visual regressions get ignored in the noise
- Screenshot tests disabled or removed from CI pipeline

**Prevention:**
1. **Standardize execution environment**
   ```dockerfile
   # Run tests in Docker for consistent OS/font rendering
   FROM mcr.microsoft.com/playwright:v1.40.0-focal

   # Install specific font versions
   RUN apt-get update && apt-get install -y \
       fonts-liberation \
       fonts-roboto

   # Run tests
   CMD ["npx", "playwright", "test"]
   ```

2. **Hide dynamic content before screenshots**
   ```typescript
   await page.addStyleTag({
     content: `
       /* Hide dynamic elements */
       [data-testid="timestamp"],
       [data-testid="loading-spinner"],
       .blinking-cursor {
         visibility: hidden !important;
       }

       /* Disable animations */
       * {
         animation: none !important;
         transition: none !important;
       }
     `
   });

   await page.screenshot({ path: 'stable-screenshot.png' });
   ```

3. **Wait for stability before capture**
   ```typescript
   // Wait for lazy-loaded images
   await page.waitForLoadState('networkidle');

   // Wait for specific element to be stable
   await page.locator('[data-testid="dashboard"]').waitFor({
     state: 'visible',
     timeout: 5000
   });

   // Additional stability wait
   await page.waitForTimeout(500); // Allow animations to settle

   await page.screenshot({ path: 'screenshot.png' });
   ```

4. **Use element-level screenshots, not full-page**
   ```typescript
   // BAD: Full page includes dynamic headers, footers, ads
   await page.screenshot({ path: 'full-page.png', fullPage: true });

   // GOOD: Capture specific stable component
   const element = page.locator('[data-testid="product-card"]');
   await element.screenshot({ path: 'product-card.png' });
   ```

5. **Set reasonable pixel difference thresholds**
   ```typescript
   await expect(page).toHaveScreenshot('expected.png', {
     maxDiffPixels: 100,           // Allow small differences
     maxDiffPixelRatio: 0.01,      // 1% of pixels can differ
     threshold: 0.2                // Per-pixel color difference tolerance
   });
   ```

6. **Run screenshot tests in CI, not locally**
   - Local environments vary too much (different GPUs, monitors, OS versions)
   - CI provides consistent environment for baseline screenshots
   - Update baselines only through CI process

**Detection:**
- Screenshot diffs showing only font rendering or color shift differences
- Tests that pass/fail seemingly randomly with same code
- Pixel differences always in same UI regions (dates, animations)

**Sources:**
- [Why Screenshot Image Comparison Tools Fail - Applitools](https://applitools.com/blog/why-screenshot-image-comparison-tools-fail/)
- [Stabilize Flaky Tests for Visual Testing - Argos](https://argos-ci.com/blog/screenshot-stabilization)
- [Flaky Visual Regression Tests - Shakacode](https://www.shakacode.com/blog/flaky-visual-regression-tests-and-what-to-do-about-them/)
- [Operating System Independent Screenshot Testing with Playwright and Docker](https://adequatica.medium.com/operating-system-independent-screenshot-testing-with-playwright-and-docker-6e2251a9eb32)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or maintainability issues.

### Pitfall 5: Fragile Playwright Selectors

**What goes wrong:** Tests break frequently when UI changes, even minor CSS class renames. Teams spend 40% of maintenance time updating selectors.

**Why it happens:** Using CSS selectors that depend on implementation details (class names, DOM structure) rather than semantic meaning.

**Prevention:**
```typescript
// BAD: Fragile selectors
await page.click('.btn.btn-primary.submit-button');
await page.fill('div > form > div:nth-child(2) > input');

// GOOD: Semantic selectors
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email address').fill('test@example.com');
await page.getByTestId('checkout-button').click();
```

**Best practices:**
1. Prefer `getByRole` (uses accessibility tree, survives layout changes)
2. Use `data-testid` attributes for non-semantic elements
3. Avoid CSS selectors with multiple parent-child levels
4. Never use `nth-child()` or positional selectors

**Sources:**
- [15 Playwright Selector Best Practices 2026](https://www.browserstack.com/guide/playwright-selectors-best-practices)
- [Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices)

---

### Pitfall 6: Misusing Playwright's Auto-Wait

**What goes wrong:** Developers add explicit `page.waitForTimeout(5000)` calls, defeating Playwright's intelligent auto-waiting and making tests slower and more brittle.

**Why it happens:** Misunderstanding how Playwright's auto-wait mechanism works. Coming from Selenium background where explicit waits are required.

**Prevention:**
```typescript
// BAD: Fixed waits
await page.click('[data-testid="submit"]');
await page.waitForTimeout(5000); // Hope data loads in 5 seconds
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// GOOD: Let Playwright auto-wait
await page.click('[data-testid="submit"]');
// Playwright automatically waits up to 30s for element to be visible
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// GOOD: Wait for specific network condition
await page.click('[data-testid="submit"]');
await page.waitForResponse(resp =>
  resp.url().includes('/api/submit') && resp.status() === 200
);
```

**Key concepts:**
- Playwright auto-waits for elements to be **actionable** (visible, enabled, stable)
- Timeouts are upper bounds, not fixed delays
- Use `waitForResponse`, `waitForLoadState('networkidle')` for specific conditions
- Avoid `waitForTimeout` except for debugging

**Sources:**
- [Dealing with Waits and Timeouts in Playwright - Checkly](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/)
- [Understanding Playwright Timeout 2026](https://www.browserstack.com/guide/playwright-timeout)

---

### Pitfall 7: Insufficient Test Isolation

**What goes wrong:** Tests pass when run individually but fail when run in parallel. Shared state (cookies, localStorage, database records) leaks between tests.

**Why it happens:** Not using fresh browser contexts for each test. Sharing global state across tests.

**Prevention:**
```typescript
// GOOD: Each test gets fresh context
test.beforeEach(async ({ browser }) => {
  const context = await browser.newContext({
    // Isolated storage
    storageState: undefined,
  });
  const page = await context.newPage();
  return { page, context };
});

test.afterEach(async ({ context }) => {
  await context.close(); // Clean up
});

// GOOD: Database isolation
test.beforeEach(async () => {
  await db.beginTransaction(); // Start transaction
});

test.afterEach(async () => {
  await db.rollback(); // Rollback changes
});
```

**Sources:**
- [Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices)

---

### Pitfall 8: AI System Integration Blindness

**What goes wrong:** Teams integrate Gemini AI into existing CI/CD without considering tool compatibility. Tests can't run because Gemini API isn't accessible from CI environment, or results don't integrate with existing test reporting tools.

**Why it happens:** AI testing tools are often self-contained solutions. Legacy CI/CD systems don't have native AI integration.

**Prevention:**
1. **Plan integration architecture early**
   - How will CI/CD authenticate to Gemini API?
   - Where will API keys be stored securely?
   - How will AI analysis results feed into existing reports (JUnit XML, Allure)?

2. **Create abstraction layer for AI calls**
   ```typescript
   interface TestAnalyzer {
     analyze(screenshot: Buffer): Promise<AnalysisResult>;
   }

   class GeminiAnalyzer implements TestAnalyzer {
     async analyze(screenshot: Buffer): Promise<AnalysisResult> {
       // Gemini-specific implementation
     }
   }

   // Easy to swap or mock for testing
   const analyzer: TestAnalyzer = new GeminiAnalyzer();
   ```

3. **Test the testing system**
   - Write tests that verify AI integration works in CI environment
   - Mock Gemini responses for fast feedback loop
   - Have fallback to deterministic tests if AI unavailable

**Sources:**
- [Top 5 Challenges in AI-Based Testing](https://medium.com/@jignect/top-5-challenges-in-ai-based-testing-how-to-overcome-them-2d273ebe1ccf)
- [Top Challenges in AI-Driven Quality Assurance](https://testrigor.com/blog/top-challenges-in-ai-driven-quality-assurance/)

---

### Pitfall 9: Playwright Can't Test Native Mobile

**What goes wrong:** Teams assume Playwright can test React Native apps on iOS/Android. They invest weeks building tests only to discover Playwright strictly tests **web** applications—not native mobile apps.

**Why it happens:** React Native's name confusion (it's not React for the web). Marketing materials emphasize "React Native Web" without clarifying limitations.

**Prevention:**
1. **Understand what Playwright can/cannot test:**
   - ✅ React Native Web (Expo web builds running in browser)
   - ✅ Mobile web views in browser (emulated mobile viewports)
   - ❌ Native iOS/Android apps (.ipa, .apk files)
   - ❌ Native mobile components (platform-specific UI)

2. **For native mobile testing, use:**
   - **Detox**: React Native's official E2E testing framework for native apps
   - **Appium**: Cross-platform native mobile testing
   - **Maestro**: Modern mobile UI testing

3. **Hybrid approach for universal apps:**
   ```typescript
   // For web builds (Playwright)
   if (process.env.PLATFORM === 'web') {
     await page.goto('http://localhost:19006');
   }

   // For native builds (Detox)
   if (process.env.PLATFORM === 'native') {
     await device.launchApp();
   }
   ```

**Sources:**
- [Universal E2E Testing with Detox and Playwright](https://ignitecookbook.com/docs/recipes/UniversalE2ETesting/)
- [Best Mobile E2E Testing Frameworks 2026](https://www.qawolf.com/blog/best-mobile-app-testing-frameworks-2026)
- [Master Mobile Web Testing with Playwright](https://dev.to/artshllaku/master-mobile-web-testing-with-playwright-a-beginners-guide-2a9d)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable with small changes.

### Pitfall 10: Not Reporting Test Results

**What goes wrong:** Tests run in CI, but results aren't captured in readable format. Teams have to read console logs to understand what failed.

**Prevention:**
```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html'],                           // HTML report for human review
    ['junit', { outputFile: 'results.xml' }], // For CI integration
    ['json', { outputFile: 'results.json' }]  // For custom dashboards
  ]
});
```

**Best practices:**
- Generate reports that integrate with existing CI (GitHub Actions, Jenkins, etc.)
- Include screenshots/videos of failures in reports
- Track metrics: pass rate, execution time, flakiness rate

**Sources:**
- [5 Common Mistakes in Playwright Automation](https://thumbtube.com/blog/5-common-mistakes-to-avoid-in-playwright-automation-testing/)
- [Test Automation Reporting: Features, Tools, and Best Practices](https://testomat.io/blog/test-automation-reporting/)

---

### Pitfall 11: Timeout Errors in CI vs Local

**What goes wrong:** Tests pass locally but timeout in CI with "Timeout 30000ms exceeded" errors.

**Why it happens:** CI environments have slower network, CPU, different browser versions.

**Prevention:**
1. **Increase timeouts for CI**
   ```typescript
   // playwright.config.ts
   export default defineConfig({
     timeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
     expect: {
       timeout: process.env.CI ? 10000 : 5000,
     }
   });
   ```

2. **Use retries strategically**
   ```typescript
   export default defineConfig({
     retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
   });
   ```

3. **Avoid `networkidle` in CI**
   ```typescript
   // BAD: Can hang in CI
   await page.goto(url, { waitUntil: 'networkidle' });

   // GOOD: More reliable
   await page.goto(url, { waitUntil: 'domcontentloaded' });
   await page.waitForSelector('[data-testid="main-content"]');
   ```

**Sources:**
- [Debugging Playwright Timeouts: A Practical Checklist](https://currents.dev/posts/debugging-playwright-timeouts)
- [How to Fix Playwright Timeout Error](https://medium.com/@dinusha-s/how-to-fix-playwright-timeout-error-a1676350df9a)

---

### Pitfall 12: Ignoring AI Data Quality Requirements

**What goes wrong:** AI-powered test analysis provides inconsistent or low-quality results because it was trained/tuned on insufficient or low-quality test data.

**Why it happens:** Teams treat AI as magic—expecting it to work without proper training data, historical test results, or feedback loops.

**Prevention:**
1. **Collect quality training data:**
   - Historical test screenshots (labeled with pass/fail)
   - Edge cases and failure scenarios
   - Domain-specific UI patterns (your app's design system)

2. **Implement feedback loop:**
   ```typescript
   // After AI analysis
   const aiResult = await gemini.analyze(screenshot);

   // Get human validation for low-confidence results
   if (aiResult.confidence < 0.7) {
     const humanReview = await requestHumanReview(screenshot, aiResult);

     // Use validated result to improve AI
     await trainingDataStore.save({
       screenshot,
       aiPrediction: aiResult,
       actualResult: humanReview,
       confidence: aiResult.confidence
     });
   }
   ```

3. **Monitor AI performance metrics:**
   - Accuracy (% of correct predictions)
   - Precision (true positives / all positives)
   - Recall (true positives / all actual positives)
   - Hallucination rate (false assertions / total assertions)

**Sources:**
- [Top 5 Challenges in AI-Based Testing](https://medium.com/@jignect/top-5-challenges-in-ai-based-testing-how-to-overcome-them-2d273ebe1ccf)
- [AI Is Disrupting Test Automation](https://www.virtuosoqa.com/post/ai-test-automation-future)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Initial Setup** | Using latest Gemini API without checking quota limits | Start with paid tier or implement robust rate limit handling from day 1 |
| **OAuth Implementation** | Testing only "happy path" login, not token refresh | Test token expiration, refresh flow, and rotation explicitly |
| **Screenshot Capture** | Not standardizing environment, leading to flaky comparisons | Use Docker for consistent OS/font rendering; hide dynamic content |
| **AI Integration** | Treating AI assertions as ground truth | Always validate AI results with deterministic checks (multi-layer verification) |
| **CI/CD Integration** | Tests work locally but fail in CI due to timeouts | Configure CI-specific timeouts; use retries; avoid `networkidle` |
| **Report Generation** | No structured reporting, relying on console logs | Implement multiple report formats (HTML, JUnit, JSON) from start |
| **Scaling Tests** | Parallel execution breaks due to shared state | Ensure test isolation with fresh contexts; use transactions for DB tests |

---

## React Native/Expo Specific Pitfalls

### Pitfall 13: Web vs Native Build Confusion

**What goes wrong:** Tests written for Expo web build don't work on native builds (or vice versa), creating maintenance burden of separate test suites.

**Prevention:**
- **Clarify scope early**: Is this for web builds only, native only, or both?
- **If web-only**: Use Playwright, optimize for browser testing
- **If native-only**: Use Detox or Appium, not Playwright
- **If universal**: Maintain separate test suites with shared test scenarios

```typescript
// Shared test scenarios
const testScenarios = [
  { name: 'Login flow', steps: [...] },
  { name: 'OAuth redirect', steps: [...] }
];

// Platform-specific implementations
// tests/web/auth.spec.ts (Playwright)
testScenarios.forEach(scenario => {
  test(scenario.name, async ({ page }) => {
    // Playwright implementation
  });
});

// tests/native/auth.e2e.ts (Detox)
testScenarios.forEach(scenario => {
  test(scenario.name, async () => {
    // Detox implementation
  });
});
```

**Sources:**
- [Universal E2E Testing with Detox and Playwright](https://ignitecookbook.com/docs/recipes/UniversalE2ETesting/)

---

## Playwright Gotchas Summary

| Gotcha | Why It Happens | Quick Fix |
|--------|---------------|-----------|
| **Tests fail with "element not found"** | Using legacy `.click()` instead of auto-waiting locators | Use `page.getByRole()`, `page.getByTestId()` |
| **Flaky tests in CI** | Different environment (network, CPU, browser version) | Increase timeouts for CI; use retries; standardize with Docker |
| **`networkidle` hangs** | Page continuously polls APIs | Use `domcontentloaded` + explicit element waits |
| **Selectors break on UI changes** | CSS selectors tied to implementation | Use semantic selectors (role, label, testid) |
| **Tests pollute each other** | Shared browser context | Fresh context per test with `browser.newContext()` |
| **Screenshots differ by 1px** | Font rendering differences across OS | Run in Docker; set `maxDiffPixels` threshold |
| **TimeoutError: 30000ms exceeded** | Auto-wait timeout too short for slow operation | Configure per-action timeout or global timeout |

---

## Gemini API Gotchas Summary

| Gotcha | Why It Happens | Quick Fix |
|--------|---------------|-----------|
| **Random 429 errors** | Hit rate limit (RPM or RPD) | Implement exponential backoff with jitter |
| **Multiple API keys don't increase quota** | Rate limits are per project, not per key | Use single key; upgrade to paid tier for more quota |
| **Tests pass early, fail later** | Hit daily quota (RPD) after X requests | Monitor quota usage; implement early warning alerts |
| **Can't distinguish recoverable vs fatal 429** | All 429s look the same without parsing details | Check `limitType` in error details; handle RPM vs RPD differently |
| **Free tier insufficient for CI** | December 2025 cuts reduced free quota by 50-92% | Budget for paid tier from day 1 |

---

## OAuth Testing Gotchas Summary

| Gotcha | Why It Happens | Quick Fix |
|--------|---------------|-----------|
| **Tests fail after 30 min** | Access token expired | Implement token refresh manager |
| **Parallel tests break auth** | Refresh token rotation invalidates shared tokens | Each test gets own OAuth session |
| **Can't test error conditions** | Production OAuth doesn't allow controlled failures | Use OAuth mock server for tests |
| **Tokens leak to git** | Hardcoded for "temporary" testing | Environment variables + git pre-commit hooks to block tokens |
| **Different behavior local vs CI** | CI environment restrictions on OAuth callback URLs | Configure OAuth provider with CI-specific redirect URLs |

---

## Key Takeaways

1. **AI is a tool, not a replacement for verification**: Always validate AI assertions with deterministic checks. Track hallucination rates.

2. **Gemini API rate limits will bite you**: Budget for paid tier. Implement proper error handling and backoff strategies from day 1.

3. **OAuth testing requires session management**: Token refresh is not optional. Test token expiration explicitly.

4. **Screenshot testing is fragile by nature**: Standardize environment (Docker), hide dynamic content, set pixel difference thresholds.

5. **Playwright is not magic**: Auto-wait is powerful but not universal. Understand its limitations. Use semantic selectors.

6. **Test isolation prevents 90% of flakiness**: Fresh contexts, database transactions, no shared global state.

7. **CI is not the same as local**: Different timeouts, retries, network conditions. Configure specifically for CI.

8. **React Native Web ≠ React Native Native**: Playwright can't test native mobile apps. Plan your testing strategy accordingly.

9. **Trust is earned through validation**: 67% of engineers want human review of AI-generated tests. Build verification into your workflow.

10. **Report or regret**: Structured reporting (HTML, JUnit, JSON) saves hours of debugging. Implement from day 1.

---

## Sources Referenced

### AI Testing and Autonomous Systems
- [Testing Can't Keep Up with AI Systems - Computerworld](https://www.computerworld.com/article/4127206/testing-cant-keep-up-with-rapidly-advancing-ai-systems-ai-safety-report.html)
- [Top 5 Challenges in AI-Based Testing - JigNect on Medium](https://medium.com/@jignect/top-5-challenges-in-ai-based-testing-how-to-overcome-them-2d273ebe1ccf)
- [Common AI Agent Development Mistakes](https://www.wildnetedge.com/blogs/common-ai-agent-development-mistakes-and-how-to-avoid-them)
- [Top Challenges in AI-Driven Quality Assurance - testRigor](https://testrigor.com/blog/top-challenges-in-ai-driven-quality-assurance/)
- [AI Hallucinations Testing Guide - TestFort](https://testfort.com/blog/ai-hallucination-testing-guide)
- [What are AI Hallucinations - testRigor](https://testrigor.com/blog/ai-hallucinations/)
- [TestMu AI Recognized in Forrester Wave Q4 2025](https://www.financialcontent.com/article/bizwire-2026-2-2-testmu-ai-formerly-lambdatest-recognized-in-independent-research-on-autonomous-testing-platforms-q4-2025)
- [Autonomous Quality Engineering: AI Testing in 2026](https://fintech.global/2026/01/27/autonomous-quality-engineering-ai-testing-in-2026/)

### Playwright Best Practices and Gotchas
- [15 Playwright Selector Best Practices 2026 - BrowserStack](https://www.browserstack.com/guide/playwright-selectors-best-practices)
- [15 Best Practices for Playwright Testing 2026 - BrowserStack](https://www.browserstack.com/guide/playwright-best-practices)
- [Why Playwright Sucks for End-to-End Tests - testRigor](https://testrigor.com/blog/why-playwright-sucks-for-end-to-end-tests/)
- [5 Common Mistakes to Avoid in Playwright Automation](https://thumbtube.com/blog/5-common-mistakes-to-avoid-in-playwright-automation-testing/)
- [Understanding Playwright Timeout 2026 - BrowserStack](https://www.browserstack.com/guide/playwright-timeout)
- [Dealing with Waits and Timeouts in Playwright - Checkly](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/)
- [Debugging Playwright Timeouts - Currents](https://currents.dev/posts/debugging-playwright-timeouts)
- [How to Fix Playwright Timeout Error - Medium](https://medium.com/@dinusha-s/how-to-fix-playwright-timeout-error-a1676350df9a)

### Gemini API Rate Limits
- [Gemini API Rate Limits Official Documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio Quota Issues – 2026 Complete Guide](https://help.apiyi.com/en/google-ai-studio-rate-limit-solution-guide-en.html)
- [Gemini API Free Tier: Complete Guide 2026](https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier)
- [Gemini API Rate Limits Explained: Complete 2026 Guide](https://www.aifreeapi.com/en/posts/gemini-api-rate-limit-explained)
- [Fix Gemini 2.5 Pro Rate Limit Errors](https://www.arsturn.com/blog/gemini-2-5-pro-rate-limit-exceeded-a-practical-guide-to-fixing-it)

### OAuth Testing
- [How to Test OAuth Authentication - Testim](https://www.testim.io/blog/how-to-test-oauth-authentication/)
- [Testing for OAuth Weaknesses - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/05-Testing_for_OAuth_Weaknesses)
- [Run Automated Integration Tests - Microsoft Identity Platform](https://learn.microsoft.com/en-us/entra/identity-platform/test-automate-integration-testing)
- [OAuth Refresh Token Explained - Curity](https://curity.io/resources/learn/oauth-refresh/)
- [Refresh Token Rotation: Best Practices for Developers](https://www.serverion.com/uncategorized/refresh-token-rotation-best-practices-for-developers/)
- [OAuth2 Mock Server - GitHub](https://github.com/axa-group/oauth2-mock-server)

### Screenshot Testing
- [Why Screenshot Image Comparison Tools Fail - Applitools](https://applitools.com/blog/why-screenshot-image-comparison-tools-fail/)
- [Stabilize Flaky Tests for Visual Testing - Argos](https://argos-ci.com/blog/screenshot-stabilization)
- [Flaky Visual Regression Tests - Shakacode](https://www.shakacode.com/blog/flaky-visual-regression-tests-and-what-to-do-about-them/)
- [Operating System Independent Screenshot Testing with Playwright and Docker](https://adequatica.medium.com/operating-system-independent-screenshot-testing-with-playwright-and-docker-6e2251a9eb32)

### React Native / Expo Testing
- [Universal E2E Testing with Detox and Playwright - Ignite Cookbook](https://ignitecookbook.com/docs/recipes/UniversalE2ETesting/)
- [Best Mobile E2E Testing Frameworks in 2026 - QA Wolf](https://www.qawolf.com/blog/best-mobile-app-testing-frameworks-2026)
- [Master Mobile Web Testing with Playwright - DEV Community](https://dev.to/artshllaku/master-mobile-web-testing-with-playwright-a-beginners-guide-2a9d)

### Test Reporting
- [Test Automation Reporting: Features, Tools, and Best Practices](https://testomat.io/blog/test-automation-reporting/)
- [How to Report On Test Automation - TestRail](https://www.testrail.com/blog/report-test-automation/)
- [Allure Report Official Site](https://allurereport.org/)
