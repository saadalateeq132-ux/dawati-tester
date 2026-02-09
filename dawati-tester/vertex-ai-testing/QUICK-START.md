# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Google Cloud account with Vertex AI enabled
- gcloud CLI installed

### Step 1: Setup (2 minutes)

```bash
cd vertex-ai-testing
./SETUP.sh
```

### Step 2: Configure (1 minute)

Edit `.env`:
```bash
GCP_PROJECT_ID=your-project-id-here
BASE_URL=https://dawati-v01.vercel.app
HEADLESS=false
```

Authenticate:
```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### Step 3: Run Test (1 minute)

```bash
npm test
```

### Step 4: View Results (1 minute)

```bash
# Open the latest report
open reports/report-*.html
```

## 📊 What You'll See

### Console Output
```
========================================
🧪 Starting Test Suite: Authentication Flow
========================================

--- Phase: Landing Page ---
[Playwright] Launching browser...
[Playwright] Navigation successful: HTTP 200
[Playwright] Screenshot saved: screenshot-1234567890-Landing-page.png
[Vertex AI] Analyzing single screenshot...
[Decision Engine] Decision: PASS (confidence: 0.95)
✅ Phase complete: Landing Page (passed)

--- Phase: Login Page ---
...

========================================
🎯 Test Suite Complete: PASSED
========================================
Duration: 15.2s
Passed: 5/5
Total Cost: $0.0023
Report: reports/report-1234567890.html
========================================
```

### HTML Report
Beautiful dashboard with:
- ✅ Overall status (PASSED/FAILED/PARTIAL)
- 📊 Phase-by-phase results
- 💰 Cost breakdown ($0.0023)
- 🐛 Issues detected (0 critical, 2 medium)
- 📸 Screenshots gallery
- 📄 Artifacts (HTML, logs, network)

## 🧪 Testing Section by Section

### Test 1: Configuration Loading

```bash
node -e "console.log(require('./dist/config/default-config').loadConfig())"
```

**Expected:** Configuration object with all settings

### Test 2: Playwright (Browser Automation)

Create `test-playwright.ts`:
```typescript
import { BrowserManager } from './src/playwright/browser-manager';
import { loadConfig } from './src/config/default-config';

const config = loadConfig();
const browser = new BrowserManager(config);

await browser.launch();
await browser.executeAction({
  type: 'navigate',
  url: config.baseUrl,
  description: 'Test navigation',
});
const screenshot = await browser.captureScreenshot('test');
console.log('Screenshot saved:', screenshot);
await browser.close();
```

Run:
```bash
npx ts-node test-playwright.ts
```

**Expected:** Browser opens, navigates, takes screenshot, closes

### Test 3: Vertex AI Connection

Create `test-vertex.ts`:
```typescript
import { GeminiClient } from './src/vertex-ai/gemini-client';
import { loadConfig } from './src/config/default-config';

const config = loadConfig();
const client = new GeminiClient(config);

const result = await client.analyzeSingle(
  'artifacts/screenshot-*.png', // Use any screenshot
  'Test Phase'
);

console.log('AI Analysis:', result);
```

Run:
```bash
npx ts-node test-vertex.ts
```

**Expected:** JSON response with decision, issues, RTL checks

### Test 4: RTL Checker

Create `test-rtl.ts`:
```typescript
import { chromium } from 'playwright';
import { RTLIntegration } from './src/rtl-checker/rtl-integration';
import { loadConfig } from './src/config/default-config';

const config = loadConfig();
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(config.baseUrl);

const rtlChecker = new RTLIntegration(page);
const result = await rtlChecker.runComprehensiveChecks();

console.log('RTL Score:', result.overallScore);
console.log('Critical Issues:', result.criticalIssues);

await browser.close();
```

Run:
```bash
npx ts-node test-rtl.ts
```

**Expected:** RTL score (0-10) and list of issues

### Test 5: Visual Regression

Create `test-visual.ts`:
```typescript
import { BaselineManager } from './src/visual-regression/baseline-manager';
import { loadConfig } from './src/config/default-config';

const config = loadConfig();
const baseline = new BaselineManager(config);

// Create baseline
baseline.createBaseline('artifacts/screenshot-1.png', 'homepage');

// Compare (should pass with 0% diff)
const result = await baseline.compareWithBaseline(
  'artifacts/screenshot-1.png',
  'homepage'
);

console.log('Visual Regression:', result);
```

Run:
```bash
npx ts-node test-visual.ts
```

**Expected:** Baseline created, comparison shows 0% difference

### Test 6: Full Integration

Run complete test suite:
```bash
npm test
```

**Expected:** All 5 phases pass, HTML report generated

## 💡 Pro Tips

### Run Headless for CI/CD
```bash
HEADLESS=true npm test
```

### Update Visual Baselines
```bash
UPDATE_BASELINES=true npm test
```

### Custom Test URL
```bash
BASE_URL=https://staging.dawati.com npm test
```

### Debug Mode (Visible Browser)
```bash
HEADLESS=false npm test
```

## 🐛 Troubleshooting

### "Application Default Credentials not found"
```bash
gcloud auth application-default login
```

### "Permission denied" on Vertex AI
Enable Vertex AI API:
```bash
gcloud services enable aiplatform.googleapis.com
```

Add IAM role:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/aiplatform.user"
```

### Playwright browser not found
```bash
npx playwright install chromium
```

### High costs
Reduce batch size in `src/config/default-config.ts`:
```typescript
vertexAI: {
  batchSize: 2, // Smaller batches = more requests but smaller payloads
}
```

### Visual regression always fails
Update baselines after UI changes:
```bash
UPDATE_BASELINES=true npm test
```

## 📚 Next Steps

1. **Customize Test**: Edit `tests/auth-flow.test.ts`
2. **Add More Tests**: Create `tests/checkout-flow.test.ts`, etc.
3. **Configure RTL**: Adjust checks in `src/config/default-config.ts`
4. **Set Up CI/CD**: Run tests on every commit
5. **Monitor Costs**: Check reports for token usage

## 🎯 Testing Checklist

- [ ] Setup script runs successfully
- [ ] .env configured with project ID
- [ ] Google Cloud authenticated
- [ ] Playwright browsers installed
- [ ] Test 1: Configuration loads ✓
- [ ] Test 2: Playwright navigates and captures ✓
- [ ] Test 3: Vertex AI analyzes screenshot ✓
- [ ] Test 4: RTL checker validates layout ✓
- [ ] Test 5: Visual regression compares ✓
- [ ] Test 6: Full integration test passes ✓
- [ ] HTML report generated ✓

## 🔗 Resources

- **Full Documentation**: [README.md](README.md)
- **Implementation Details**: [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)
- **Vertex AI Docs**: https://cloud.google.com/vertex-ai/docs
- **Playwright Docs**: https://playwright.dev
- **Gemini 2.0 Flash**: https://ai.google.dev/gemini-api/docs

---

**Ready to test!** 🚀

Start with `./SETUP.sh` and you'll be running tests in 5 minutes.
