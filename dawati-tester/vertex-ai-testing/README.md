# Vertex AI Testing System

Production-grade automated testing system combining **Playwright** and **Vertex AI (Gemini 2.0 Flash)** for comprehensive UI testing with RTL/i18n validation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Orchestrator                           │
│  (Coordinates all components, executes test phases)             │
└───────────┬─────────────────────────────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼────┐    ┌─────▼──────┐
│Playwright│    │Vertex AI   │
│Runner    │    │Analyzer    │
│          │    │(Gemini 2.0)│
└───┬──────┘    └─────┬──────┘
    │                 │
    │ Screenshots     │ AI Analysis
    │ DOM State       │ Issue Detection
    │ Artifacts       │ Confidence Score
    │                 │
┌───▼─────────────────▼─────────────┐
│      Decision Engine               │
│  • Response Parser                 │
│  • DOM Validator (prevent hallucination)│
│  • Selector Sanitizer              │
│  • Confidence Calculator           │
└───────────────┬────────────────────┘
                │
        ┌───────┴────────┐
        │                │
    ┌───▼─────┐    ┌────▼────────┐
    │RTL       │    │Visual       │
    │Checker   │    │Regression   │
    │(9 checks)│    │(Baselines)  │
    └──────────┘    └─────────────┘
```

## Features

### ✅ Vertex AI Integration
- **Gemini 2.0 Flash** (latest, fastest model)
- **Batch Processing**: 5-10 screenshots per request = 80% cost reduction
- **Streaming Responses**: Real-time analysis feedback
- **Function Calling**: Guaranteed valid JSON responses
- **Enterprise SLA**: 99.9% uptime, 300+ requests/min
- **Regional Endpoints**: `europe-west1` for low latency to Saudi Arabia

### ✅ Comprehensive RTL/i18n Testing
- **404 Detection**: Catches error pages before testing
- **Hardcoded Strings**: 300+ patterns (English + Arabic)
- **Currency Formatting**: SAR placement validation
- **BiDi Text Handling**: Mixed Arabic/English isolation
- **Hijri Calendar**: Date format validation
- **Layout Expansion**: 30% rule for Arabic text
- **Icon Alignment**: Directional icon flipping
- **Image Text (OCR)**: Detects non-localized text in images

### ✅ Decision Engine with DOM Validation
- **PASS/FAIL/UNKNOWN** state machine
- **DOM Validation**: Prevents AI hallucinations
- **Confidence Scoring**: 0.0-1.0 with validation bonus
- **Selector Sanitization**: Prevents injection attacks

### ✅ Visual Regression
- **Baseline Comparison**: Pixel-perfect diff detection
- **Threshold Configuration**: Adjustable sensitivity
- **Diff Images**: Visual comparison artifacts
- **Baseline Management**: Create, update, delete

### ✅ PII Masking
- Phone numbers (Saudi: +966, 05...)
- Email addresses
- Credit cards
- National IDs
- IBANs
- API keys/tokens
- Custom patterns

### ✅ Rich Reporting
- **HTML Dashboard**: Beautiful interactive report
- **JSON Export**: Machine-readable results
- **Cost Tracking**: Token usage and estimated costs
- **Issue Categorization**: Critical, High, Medium, Low
- **Artifacts**: Screenshots, HTML snapshots, logs

## Setup

### 1. Install Dependencies

```bash
cd vertex-ai-testing
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Configure Google Cloud

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run Tests

```bash
# Run test suite
npm test

# Headless mode
npm run test:headless

# Update visual baselines
npm run test:update-baselines
```

## Project Structure

```
vertex-ai-testing/
├── src/
│   ├── types.ts                    # Type definitions
│   ├── config/
│   │   └── default-config.ts       # Configuration loader
│   ├── playwright/
│   │   └── browser-manager.ts      # Playwright automation
│   ├── vertex-ai/
│   │   └── gemini-client.ts        # Vertex AI client
│   ├── decision-engine/
│   │   └── response-parser.ts      # Response validation
│   ├── rtl-checker/
│   │   └── rtl-integration.ts      # RTL validation (9 checks)
│   ├── visual-regression/
│   │   └── baseline-manager.ts     # Visual diff comparison
│   ├── artifact-manager/
│   │   └── pii-masker.ts           # PII masking
│   ├── reporter/
│   │   └── html-reporter.ts        # Report generation
│   └── orchestrator/
│       └── test-orchestrator.ts    # Main coordinator
├── tests/
│   └── auth-flow.test.ts           # Example test
├── baselines/                       # Visual regression baselines
├── artifacts/                       # Test artifacts (screenshots, logs)
├── reports/                         # Generated reports
├── package.json
├── tsconfig.json
└── README.md
```

## Writing Tests

### Test Phase Structure

```typescript
import { TestPhase } from '../src/types';

const phase: TestPhase = {
  id: 'unique-id',
  name: 'Phase Name',
  description: 'What this phase tests',

  actions: [
    {
      type: 'navigate',
      url: 'https://example.com',
      description: 'Navigate to page',
    },
    {
      type: 'click',
      selector: 'button[type="submit"]',
      description: 'Click submit button',
    },
    {
      type: 'fill',
      selector: 'input[name="email"]',
      value: 'test@example.com',
      description: 'Enter email',
    },
    {
      type: 'screenshot',
      description: 'Capture final state',
    },
  ],

  validations: [
    {
      type: 'element',
      selector: '.success-message',
      description: 'Success message should appear',
    },
    {
      type: 'rtl',
      description: 'RTL layout should be correct',
    },
    {
      type: 'visual',
      description: 'Should match baseline',
    },
    {
      type: 'ai',
      description: 'No issues detected',
    },
  ],

  dependencies: ['previous-phase-id'], // Optional
};
```

### Running Test Suite

```typescript
import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { loadConfig } from '../src/config/default-config';

const config = loadConfig();
const orchestrator = new TestOrchestrator(config);

const phases: TestPhase[] = [
  // ... your phases
];

const result = await orchestrator.runTestSuite('Test Suite Name', phases);
process.exit(result.overallStatus === 'passed' ? 0 : 1);
```

## Configuration

Edit `src/config/default-config.ts` or override via environment variables:

```typescript
{
  projectId: 'your-gcp-project',
  location: 'europe-west1',        // Closest to Saudi Arabia
  model: 'gemini-2.0-flash-exp',   // Latest Gemini model

  vertexAI: {
    batchSize: 5,                  // Analyze 5 screenshots per request
    streaming: true,               // Real-time feedback
    temperature: 0.1,              // Low = consistent results
  },

  rtl: {
    enabled: true,
    checkHardcodedStrings: true,
    checkCurrency: true,
    checkBiDi: true,
    checkHijri: true,
    checkLayoutExpansion: true,
    checkIconAlignment: true,
  },

  visualRegression: {
    enabled: true,
    threshold: 0.02,               // 2% difference allowed
  },

  artifacts: {
    maskPII: true,                 // Mask sensitive data
  },
}
```

## Cost Optimization

### Batch Processing (80% Savings)

Instead of sending 10 individual requests:
- **Individual**: 10 requests × $0.001 = $0.010
- **Batch (5 per request)**: 2 requests × $0.001 = $0.002
- **Savings**: 80%

Configure batch size in `default-config.ts`:

```typescript
vertexAI: {
  batchSize: 5, // Analyze 5-10 screenshots per request
}
```

### Committed Use Discounts

For high-volume testing, consider Vertex AI committed use discounts:
- 1-year: 20% off
- 3-year: 30% off

## Troubleshooting

### "Application Default Credentials not found"

```bash
gcloud auth application-default login
```

### "Permission denied" errors

Ensure your GCP account has these roles:
- `Vertex AI User`
- `Storage Object Viewer` (if using GCS)

### Visual regression always fails

Update baselines:

```bash
npm run test:update-baselines
```

### High token costs

- Reduce `batchSize` if screenshots are large
- Enable PII masking to reduce content size
- Use lower resolution screenshots

## Best Practices

1. **Start with small batch size** (2-3) then increase to 5-10
2. **Enable PII masking** before sending to AI
3. **Use specific selectors** for better DOM validation
4. **Create baselines** for stable screens (dashboard, etc.)
5. **Monitor costs** via reporting dashboard
6. **Run tests in parallel** for multiple flows (auth, checkout, etc.)
7. **Update baselines** after intentional UI changes

## License

MIT

## Support

For issues or questions, please file an issue in the repository.
