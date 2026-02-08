# Technology Stack - Autonomous Web Testing System

**Project:** Dawati Autonomous Testing System
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

## Executive Summary

This stack is optimized for building an autonomous web testing system with AI-powered screenshot analysis. The recommended technologies prioritize modern browser automation (Playwright), fast AI integration (Google Gemini), lightweight performance (Pino logging), and robust reporting (Allure). All recommendations are based on 2025/2026 best practices for on-demand testing systems.

---

## Recommended Stack

### Core Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js** | 24.x LTS (Krypton) | JavaScript runtime | Active LTS through April 2028. Recommended for production applications in 2025. Alternative: v22.x (Maintenance LTS). |
| **TypeScript** | 5.x (latest) | Type safety | Essential for large codebases. Enables strict mode for catching bugs early. Use `"strict": true` in tsconfig. |

**Installation:**
```bash
# Verify Node.js version
node --version  # Should be v24.x or v22.x

# Initialize project
npm init -y
npm install -D typescript @types/node
npx tsc --init
```

**TypeScript Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

### Browser Automation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Playwright** | 1.58.x (latest) | Browser automation & testing | Clear winner over Puppeteer and Selenium. 20% faster execution, cross-browser support (Chromium, Firefox, WebKit), built-in trace viewer, auto-wait mechanisms, and AI-powered test generation (Playwright Agents). Native screenshot comparison built-in. |

**Why Playwright over alternatives:**
- **vs Puppeteer:** Cross-browser support (Puppeteer is Chrome-only), built-in test runner, better debugging tools
- **vs Selenium:** 20% faster, modern async API, auto-wait (no explicit waits needed), built-in trace viewer for time-travel debugging
- **vs Cypress:** Better for E2E scenarios, supports multiple tabs/windows, native mobile emulation

**Installation:**
```bash
npm install -D @playwright/test
npx playwright install  # Installs browser binaries
```

**Key Features for Your Use Case:**
- **Screenshot capture:** `await page.screenshot({ path: 'screenshot.png', fullPage: true })`
- **Visual comparison:** `await expect(page).toHaveScreenshot()`
- **Trace recording:** Built-in traces capture screenshots, DOM snapshots, network logs, console messages
- **Mobile emulation:** Test React Native web view with device emulation
- **Auth state:** `await context.storageState()` to save/reuse authentication

---

### AI Analysis

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Google Gemini SDK** | @google/genai (latest) | Screenshot analysis & AI-powered insights | Official GA SDK. Replaces deprecated @google/generative-ai. Supports Gemini 2.0+ features. Multimodal (image + text analysis). |

**Installation:**
```bash
npm install @google/genai
```

**Configuration:**
```typescript
import { GoogleGenerativeAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",  // Latest fast model
  apiVersion: "v1"  // Use stable endpoints (default is beta)
});
```

**Best Practices:**
- Set `GEMINI_API_KEY` environment variable (auto-detected by SDK)
- Use server-side only (never expose API keys client-side)
- For screenshot analysis: Pass base64-encoded images with `inlineData`
- Rate limiting: Implement exponential backoff for API calls

**Image Analysis Example:**
```typescript
async function analyzeScreenshot(imagePath: string) {
  const imageData = fs.readFileSync(imagePath).toString('base64');

  const result = await model.generateContent([
    { text: "Analyze this screenshot for UI/UX issues..." },
    { inlineData: { data: imageData, mimeType: 'image/png' } }
  ]);

  return result.response.text();
}
```

---

### Configuration Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **dotenv** | 16.x | Environment variables | Simplest solution for most use cases. Node.js 20.6+ has native `--env-file` flag, but dotenv has 45M+ weekly downloads and works universally. Avoid `node-config` unless you need complex multi-environment hierarchies. |

**Installation:**
```bash
npm install dotenv
npm install -D @types/dotenv
```

**Usage:**
```typescript
// Load at entry point
import 'dotenv/config';

// Access variables
const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.TEST_BASE_URL;
```

**Alternative: Native Node.js (v20.6+):**
```bash
node --env-file=.env index.js
```

**Best Practices:**
- Never commit `.env` files (add to `.gitignore`)
- Use `.env.example` with dummy values for documentation
- Validate required variables at startup

---

### Logging & Debugging

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Pino** | 9.x | Structured logging | 5-10x faster than Winston. Async logging, built-in structured JSON output, perfect for high-performance testing. Winston is more popular (12M+ downloads) but slower. Choose Pino for performance-critical autonomous systems. |

**Installation:**
```bash
npm install pino
npm install -D pino-pretty  # Human-readable dev logs
```

**Configuration:**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Usage
logger.info({ testId: 'auth-001', status: 'passed' }, 'Auth test completed');
logger.error({ error: err.message, stack: err.stack }, 'Test failed');
```

**Why Pino over Winston:**
- 5-10x faster (critical for test performance)
- Async by default (non-blocking)
- Built-in structured logging (better for parsing)
- Lower memory footprint

**Playwright Debug Tools:**
```bash
# Run tests with debug mode
PWDEBUG=1 npx playwright test

# Generate trace (built-in)
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

**Trace Viewer Features:**
- Time-travel debugging with DOM snapshots
- Network logs and console messages
- Before/after screenshots for each action
- Film strip timeline of test execution
- Interactive DOM inspection with DevTools

---

### Report Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Playwright HTML Reporter** | Built-in | Basic HTML reports | Zero-config built-in reporter. Good for simple stakeholder reports. Includes screenshots, traces, test timing. |
| **Allure Reporter** | allure-playwright 3.x | Advanced reporting (recommended) | Most popular open-source reporter. Historical tracking across runs, flakiness detection, step-level execution details, automatic screenshot/video/trace attachments. Essential for production testing systems tracking trends over time. |

**Built-in HTML Reporter (Simple):**
```typescript
// playwright.config.ts
export default {
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/html' }]
  ]
};
```

**Allure Reporter (Recommended):**
```bash
npm install -D allure-playwright allure-commandline
```

```typescript
// playwright.config.ts
export default {
  reporter: [
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true
    }]
  ]
};
```

**Generate and view Allure report:**
```bash
# Run tests
npx playwright test

# Generate report
npx allure generate allure-results -o allure-report --clean

# Open report
npx allure open allure-report
```

**Why Allure over built-in:**
- **Historical tracking:** Compare results across test runs
- **Flakiness detection:** Identifies unstable tests automatically
- **Step-level details:** Clear navigation through test actions
- **Trend analysis:** Tracks pass rates, duration over time
- **Better for scale:** Built-in reporter becomes unwieldy with 100+ tests

**Alternative: Monocart Reporter**
- Lighter than Allure, more powerful than built-in
- Good middle ground if Allure feels too heavy

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 3.x | Runtime validation | Validate test configuration, API responses, AI outputs. TypeScript types at compile + runtime. |
| **axios** | 1.x | HTTP client | If testing requires API calls outside Playwright. Playwright has built-in `request` context, prefer that first. |
| **date-fns** | 3.x | Date manipulation | Timestamp formatting for reports, test scheduling logic. |
| **fast-glob** | 3.x | File pattern matching | Find test files, organize screenshots, build custom reports. |

**Installation:**
```bash
npm install zod date-fns fast-glob
npm install -D @types/node
```

**Example: Validate test config with Zod**
```typescript
import { z } from 'zod';

const TestConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(3),
  geminiApiKey: z.string().min(1)
});

const config = TestConfigSchema.parse({
  baseUrl: process.env.TEST_BASE_URL,
  timeout: 30000,
  retries: 2,
  geminiApiKey: process.env.GEMINI_API_KEY
});
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Runtime** | Node.js 24 LTS | Deno, Bun | Playwright has mature Node.js support. Bun/Deno ecosystem still maturing. Stick with proven Node.js LTS. |
| **Automation** | Playwright | Puppeteer | Puppeteer is Chrome-only. Playwright supports Firefox, WebKit, better for cross-browser testing. |
| **Automation** | Playwright | Selenium | Selenium is 20% slower, requires WebDriver setup. Playwright has better modern API and debugging tools. |
| **Automation** | Playwright | Cypress | Cypress struggles with multi-tab scenarios, authentication flows. Playwright better for complex E2E. |
| **AI SDK** | @google/genai | @google/generative-ai | Deprecated. Use @google/genai (GA since May 2025). |
| **AI Provider** | Google Gemini | OpenAI GPT-4 Vision | You already use Gemini. Gemini 2.0 Flash is fast and cost-effective. Stick with it. |
| **Config** | dotenv | node-config | node-config adds complexity. Use dotenv for simplicity. Only use node-config if you need hierarchical multi-env configs. |
| **Logging** | Pino | Winston | Winston is slower (5-10x) despite being more popular. Pino's async performance critical for test runners. |
| **Logging** | Pino | Bunyan | Bunyan maintenance has slowed. Pino has more active development and better ecosystem. |
| **Reporting** | Allure | Playwright HTML | Built-in HTML reporter lacks historical tracking, flakiness detection. Allure essential for production. |
| **Reporting** | Allure | Custom HTML | Don't build custom unless you have unique needs. Allure covers 90% of use cases. |

---

## Installation Script

```bash
# Core dependencies
npm install @google/genai pino dotenv zod date-fns

# Dev dependencies
npm install -D typescript @types/node
npm install -D @playwright/test
npm install -D allure-playwright allure-commandline
npm install -D pino-pretty

# Install Playwright browsers
npx playwright install chromium firefox webkit

# Initialize TypeScript
npx tsc --init

# Create .env file
cat > .env << 'EOF'
# Gemini API
GEMINI_API_KEY=your_key_here

# Test Configuration
TEST_BASE_URL=https://your-app.com
NODE_ENV=development
LOG_LEVEL=info
EOF

# Add .env to .gitignore
echo ".env" >> .gitignore
echo "test-results/" >> .gitignore
echo "allure-results/" >> .gitignore
echo "allure-report/" >> .gitignore
```

---

## Project Structure Recommendation

```
autonomous-testing/
├── src/
│   ├── config/
│   │   └── test.config.ts          # Centralized config with Zod
│   ├── core/
│   │   ├── browser.ts              # Playwright browser setup
│   │   ├── ai-analyzer.ts          # Gemini screenshot analysis
│   │   └── logger.ts               # Pino logger instance
│   ├── tests/
│   │   ├── auth/                   # Auth flow tests
│   │   ├── navigation/             # Navigation tests
│   │   └── ui-ux/                  # UI/UX tests
│   └── utils/
│       ├── screenshot.ts           # Screenshot helpers
│       └── report-generator.ts     # Custom report logic
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Template for .env
├── playwright.config.ts             # Playwright configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json
```

---

## Version Matrix

**Current as of 2026-02-08:**

| Package | NPM Version | Notes |
|---------|-------------|-------|
| node | 24.11.0 | Active LTS (Krypton) |
| typescript | 5.7.x | Latest stable |
| @playwright/test | 1.58.0 | Latest (Jan 30, 2026) |
| @google/genai | Latest GA | Use v1 API endpoints |
| pino | 9.x | Latest major version |
| dotenv | 16.x | Stable, widely used |
| allure-playwright | 3.x | Latest major version |
| zod | 3.x | Latest stable |

**Update Strategy:**
- **Node.js:** Stick with Active LTS (v24) or Maintenance LTS (v22)
- **Playwright:** Update monthly (frequent releases with fixes)
- **Gemini SDK:** Update quarterly (check for Gemini 2.x features)
- **Others:** Update every 6 months unless security issues

---

## Sources

### High Confidence (Official Documentation)
- [Node.js Releases](https://nodejs.org/en/about/previous-releases) - LTS versions and EOL dates
- [Playwright Documentation](https://playwright.dev/docs/intro) - Official Playwright docs
- [Google Gemini API Libraries](https://ai.google.dev/gemini-api/docs/libraries) - Official SDK docs
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig/strict.html) - Official TypeScript config

### Medium Confidence (Industry Comparisons)
- [Playwright vs Puppeteer vs Selenium (2025)](https://www.browserbase.com/blog/recommending-playwright) - Browser automation comparison
- [Pino vs Winston Comparison](https://betterstack.com/community/comparisons/pino-vs-winston/) - Logging library comparison
- [Allure Report Documentation](https://allurereport.org/docs/playwright/) - Allure Playwright integration
- [Playwright Trace Viewer Guide](https://playwright.dev/docs/trace-viewer) - Debugging features

### Low Confidence (General Best Practices)
- [Node.js LTS Explained (2025)](https://jesuspaz.com/articles/node-lts-versioning-explained) - LTS versioning guide
- [Should You Still Use dotenv in 2025?](https://infisical.com/blog/stop-using-dotenv-in-nodejs-v20.6.0+) - Configuration management
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052) - TypeScript recommendations

---

## Next Steps

1. **Set up base project:**
   - Initialize Node.js 24 LTS project
   - Configure TypeScript with strict mode
   - Install Playwright and run first test

2. **Integrate Gemini:**
   - Set up @google/genai SDK
   - Test screenshot analysis with sample image
   - Implement retry logic for API calls

3. **Configure reporting:**
   - Set up Allure reporter
   - Generate first test report
   - Configure historical tracking

4. **Add logging:**
   - Set up Pino with pino-pretty for development
   - Add structured logging to test lifecycle
   - Configure log levels per environment

5. **Build test suite:**
   - Auth flows (login, logout, session persistence)
   - Navigation tests (routing, deep linking)
   - UI/UX tests (layout, responsive, accessibility)
   - Scrolling behavior tests

---

## Key Takeaways

- **Playwright is the clear winner** for browser automation in 2025 (cross-browser, fast, great debugging)
- **Node.js 24 LTS (Krypton)** is the recommended runtime (Active LTS through April 2028)
- **@google/genai is the official GA SDK** for Gemini (replaces deprecated @google/generative-ai)
- **Pino is faster than Winston** (5-10x) and better for performance-critical test systems
- **Allure Reporter is essential** for production testing systems needing historical tracking
- **dotenv is sufficient** for configuration management (avoid node-config complexity unless needed)
- **TypeScript strict mode is mandatory** for catching bugs early in autonomous systems

This stack prioritizes **performance, maintainability, and modern best practices** for building autonomous testing systems in 2025/2026.
