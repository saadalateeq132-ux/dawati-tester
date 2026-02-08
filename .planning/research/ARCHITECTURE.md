# Architecture Patterns: Autonomous Testing Systems

**Domain:** AI-Powered Web Testing Automation
**Researched:** 2026-02-08
**Confidence:** MEDIUM (Based on 2026 industry patterns, WebSearch findings verified where possible)

## Executive Summary

Autonomous testing systems in 2026 follow an **agentic architecture** where AI agents orchestrate test lifecycle activities—planning, execution, analysis, and maintenance. The architecture emphasizes **modular, event-driven components** with clear separation between orchestration (what to do), execution (how to do it), and analysis (what it means).

For a React Native/Expo web app with Playwright + Gemini AI, the recommended architecture uses:
- **Orchestration Layer**: Test planning, scheduling, and workflow coordination
- **Execution Engine**: Playwright browser control and test execution
- **AI Analysis Layer**: Gemini vision for screenshot understanding and validation
- **Reporting System**: Result aggregation and report generation
- **Storage Layer**: Test plans, screenshots, results, and historical data

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│                   (CLI / API / Dashboard)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    ORCHESTRATION LAYER                          │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Test Planner │  │  Scheduler  │  │  Workflow Controller   │ │
│  └──────────────┘  └─────────────┘  └────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
┌───────────▼──────┐  ┌──────▼──────┐  ┌─────▼────────────────┐
│  EXECUTION       │  │   AI ANALYSIS│  │   REPORTING          │
│  ENGINE          │  │   LAYER      │  │   SYSTEM             │
│                  │  │              │  │                      │
│ ┌──────────────┐ │  │ ┌──────────┐│  │ ┌──────────────────┐ │
│ │  Playwright  │ │  │ │  Gemini  ││  │ │ Result Aggregator│ │
│ │  Controller  │─┼──┼─│  Vision  ││  │ └──────────────────┘ │
│ └──────────────┘ │  │ │  API     ││  │ ┌──────────────────┐ │
│ ┌──────────────┐ │  │ └──────────┘│  │ │ Report Generator │ │
│ │  Screenshot  │─┼──┤             │  │ └──────────────────┘ │
│ │  Capture     │ │  │ ┌──────────┐│  │ ┌──────────────────┐ │
│ └──────────────┘ │  │ │ Analysis ││  │ │ Notification Hub │ │
│ ┌──────────────┐ │  │ │ Validator││  │ └──────────────────┘ │
│ │  Browser     │ │  │ └──────────┘│  │                      │
│ │  Manager     │ │  │             │  │                      │
│ └──────────────┘ │  │             │  │                      │
└──────────────────┘  └─────────────┘  └──────────────────────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       STORAGE LAYER                             │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Test Plans   │  │ Screenshots │  │  Test Results          │ │
│  │ (JSON/YAML)  │  │ (Images)    │  │  (JSON + Artifacts)    │ │
│  └──────────────┘  └─────────────┘  └────────────────────────┘ │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │ Baselines    │  │ Reports     │  │  Configuration         │ │
│  │ (Images)     │  │ (HTML/JSON) │  │  (YAML/ENV)            │ │
│  └──────────────┘  └─────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Orchestration Layer

**Purpose:** Coordinates test lifecycle, decides what to test and when

**Components:**

| Component | Responsibility | Key Functions |
|-----------|---------------|---------------|
| **Test Planner** | Converts high-level goals into executable test plans | - Parse test requirements<br>- Generate test scenarios<br>- Prioritize test cases<br>- Adapt plans based on feedback |
| **Scheduler** | Manages test execution timing and sequencing | - Queue management<br>- On-demand triggering<br>- Retry logic<br>- Resource allocation |
| **Workflow Controller** | Orchestrates test execution workflow | - State management<br>- Event routing<br>- Error handling<br>- Progress tracking |

**Design Pattern:** **Observer Pattern** for event propagation, **Strategy Pattern** for adaptive test selection

**Key Decisions:**
- **Agentic Orchestration**: In 2026, autonomous systems use the model to decide what to do next, while orchestration controls whether it should happen
- **Dynamic Prioritization**: AI-driven test orchestration dynamically prioritizes cases, identifies flaky tests, and predicts failure points
- **Event-Driven**: Decouple components through event bus for flexibility and scalability

**Example Structure:**
```
orchestration/
├── planner/
│   ├── TestPlanner.ts          # Main planning logic
│   ├── ScenarioGenerator.ts    # Generate test scenarios
│   └── Prioritizer.ts          # Risk-based prioritization
├── scheduler/
│   ├── JobScheduler.ts         # Queue and timing management
│   ├── RetryManager.ts         # Retry logic
│   └── ResourcePool.ts         # Manage execution resources
└── workflow/
    ├── WorkflowEngine.ts       # State machine for test execution
    ├── EventBus.ts             # Event distribution
    └── StateManager.ts         # Track execution state
```

### 2. Execution Engine

**Purpose:** Executes tests via Playwright, captures screenshots, manages browser lifecycle

**Components:**

| Component | Responsibility | Key Functions |
|-----------|---------------|---------------|
| **Playwright Controller** | Browser automation and test execution | - Execute test steps<br>- Handle interactions<br>- Manage page state<br>- Track execution metrics |
| **Screenshot Capture** | Capture visual evidence at key points | - Full page screenshots<br>- Element screenshots<br>- Viewport management<br>- Image optimization |
| **Browser Manager** | Manage browser instances and contexts | - Launch/close browsers<br>- Context isolation<br>- Parallel execution<br>- Resource cleanup |

**Design Pattern:** **Page Object Model (POM)** for UI abstraction, **Repository Pattern** for test data management

**Key Decisions:**
- **Test Isolation**: Each test runs independently with isolated context (storage, session, cookies)
- **Robust Selectors**: Prioritize user-facing attributes (text, aria-label) over CSS/XPath
- **Self-Healing**: Track selector changes and adapt automatically
- **Parallel Execution**: Support concurrent test runs with isolated browser contexts

**Playwright Best Practices (2026):**
1. **Isolation**: Complete independence between tests
2. **User-Facing Selectors**: Text content, role, aria-label (not CSS/XPath)
3. **Auto-Waiting**: Rely on Playwright's built-in wait mechanisms
4. **Page Object Model**: Separate test logic from UI elements
5. **Configuration**: Single playwright.config.ts for all settings

**Example Structure:**
```
execution/
├── playwright/
│   ├── PlaywrightController.ts  # Main execution controller
│   ├── BrowserManager.ts        # Browser lifecycle management
│   ├── ContextManager.ts        # Isolated test contexts
│   └── NavigationHelper.ts      # Navigation utilities
├── capture/
│   ├── ScreenshotCapture.ts     # Screenshot logic
│   ├── VideoRecorder.ts         # Optional video capture
│   └── ArtifactManager.ts       # Manage test artifacts
├── pages/                       # Page Object Models
│   ├── BasePage.ts              # Common page functionality
│   ├── LoginPage.ts             # Example POM
│   └── DashboardPage.ts         # Example POM
└── utils/
    ├── WaitHelpers.ts           # Custom wait utilities
    └── ElementHelpers.ts        # Element interaction helpers
```

### 3. AI Analysis Layer

**Purpose:** Use Gemini AI to understand screenshots, validate UI state, detect anomalies

**Components:**

| Component | Responsibility | Key Functions |
|-----------|---------------|---------------|
| **Gemini Vision API** | Screenshot analysis and interpretation | - Analyze screenshot content<br>- Extract UI elements<br>- Understand layout<br>- Answer visual queries |
| **Analysis Validator** | Validate expected vs actual state | - Compare against baselines<br>- Detect visual regressions<br>- Identify meaningful changes<br>- Ignore insignificant diffs |

**Design Pattern:** **Agentic Vision** (Gemini 3 Flash treats vision as active investigation)

**Key Decisions:**
- **Agentic Vision**: Gemini 3 Flash approaches vision as an agent-like investigation—planning steps, manipulating images, using code to verify details
- **Step-by-Step Analysis**: Formulate plans to zoom in, inspect, and manipulate images rather than single-pass analysis
- **Spatial Understanding**: Leverage Gemini's screen understanding for desktop/mobile OS screens
- **Visual Evidence**: Ground answers in visual evidence rather than assumptions

**Gemini Vision Capabilities (2026):**
- **Agentic Investigation**: Treats image analysis as multi-step process
- **Screen Understanding**: Specialized capability for UI/UX analysis
- **Code Execution**: Can write and run code to verify visual details
- **Automatic Actions**: Future roadmap includes auto-triggering zoom, rotation

**Example Structure:**
```
ai-analysis/
├── gemini/
│   ├── GeminiClient.ts          # API client wrapper
│   ├── VisionAnalyzer.ts        # Screenshot analysis
│   ├── PromptBuilder.ts         # Construct analysis prompts
│   └── ResponseParser.ts        # Parse AI responses
├── validation/
│   ├── VisualValidator.ts       # Compare expected vs actual
│   ├── BaselineManager.ts       # Manage baseline images
│   ├── DiffEngine.ts            # Detect visual differences
│   └── AnomalyDetector.ts       # Identify unexpected UI changes
└── models/
    ├── AnalysisResult.ts        # Result schema
    └── ValidationReport.ts      # Validation schema
```

### 4. Reporting System

**Purpose:** Aggregate results, generate reports, notify stakeholders

**Components:**

| Component | Responsibility | Key Functions |
|-----------|---------------|---------------|
| **Result Aggregator** | Collect and consolidate test results | - Gather execution data<br>- Combine AI analysis<br>- Calculate metrics<br>- Track trends |
| **Report Generator** | Create human-readable reports | - HTML reports<br>- JSON exports<br>- Screenshot galleries<br>- Trend visualizations |
| **Notification Hub** | Alert stakeholders of results | - Email notifications<br>- Slack/webhook integration<br>- Failure alerts<br>- Summary digests |

**Design Pattern:** **Observer Pattern** for test result processing (enables flexible reporting without modifying core logic)

**Key Decisions:**
- **Structured Metrics**: Emit structured data (latency, error codes, timings) into monitoring systems
- **Multiple Formats**: HTML for humans, JSON for systems, screenshots for debugging
- **Real-Time Updates**: Stream results as tests execute (not just final summary)
- **Historical Tracking**: Track trends over time to identify flaky tests and degradation

**Example Structure:**
```
reporting/
├── aggregation/
│   ├── ResultAggregator.ts      # Collect results
│   ├── MetricsCalculator.ts     # Compute statistics
│   └── TrendAnalyzer.ts         # Analyze historical trends
├── generation/
│   ├── HTMLReportGenerator.ts   # Generate HTML reports
│   ├── JSONExporter.ts          # Export JSON data
│   ├── ScreenshotGallery.ts     # Visual report gallery
│   └── TemplateEngine.ts        # Report templates
├── notification/
│   ├── NotificationHub.ts       # Central notification dispatch
│   ├── EmailNotifier.ts         # Email integration
│   ├── SlackNotifier.ts         # Slack integration
│   └── WebhookNotifier.ts       # Generic webhooks
└── templates/
    ├── report.html              # HTML report template
    └── email.html               # Email template
```

### 5. Storage Layer

**Purpose:** Persist test plans, screenshots, results, baselines, and configuration

**Components:**

| Component | Purpose | Format | Storage Location |
|-----------|---------|--------|------------------|
| **Test Plans** | Test scenarios and steps | JSON/YAML | `data/plans/` |
| **Screenshots** | Captured images during execution | PNG/JPEG | `data/screenshots/` |
| **Baselines** | Expected UI states | PNG/JPEG | `data/baselines/` |
| **Test Results** | Execution outcomes and artifacts | JSON | `data/results/` |
| **Reports** | Generated reports | HTML/JSON | `data/reports/` |
| **Configuration** | System settings | YAML/ENV | `config/` |

**Design Pattern:** **Repository Pattern** for data access abstraction

**Key Decisions:**
- **File-Based Storage**: For MVP, use filesystem (simple, debuggable, no database overhead)
- **Organized Hierarchy**: Clear folder structure by date/run/test
- **Retention Policy**: Auto-cleanup old results (keep last N runs)
- **Backup Strategy**: Optional cloud sync for baselines and critical results

**Example Structure:**
```
data/
├── plans/
│   ├── login-flow.yaml
│   ├── checkout-flow.yaml
│   └── user-registration.yaml
├── screenshots/
│   └── 2026-02-08/
│       └── run-12345/
│           ├── login-step-1.png
│           ├── login-step-2.png
│           └── dashboard-loaded.png
├── baselines/
│   ├── login-page.png
│   ├── dashboard.png
│   └── checkout.png
├── results/
│   └── 2026-02-08/
│       └── run-12345/
│           ├── result.json
│           └── artifacts/
└── reports/
    └── 2026-02-08/
        └── run-12345.html

config/
├── playwright.config.ts
├── gemini.config.yaml
└── .env
```

## Data Flow

### Standard Test Execution Flow

```
1. User Trigger (CLI/API)
   │
   ├─> Orchestration Layer
   │   ├─> Test Planner: Parse test plan, generate scenarios
   │   ├─> Scheduler: Queue test for execution
   │   └─> Workflow Controller: Initialize execution state
   │
   ├─> Execution Engine
   │   ├─> Browser Manager: Launch browser context
   │   ├─> Playwright Controller: Execute test steps
   │   ├─> Screenshot Capture: Capture UI at checkpoints
   │   └─> Emit events: step_complete, screenshot_captured
   │
   ├─> AI Analysis Layer (for each screenshot)
   │   ├─> Gemini Vision API: Analyze screenshot
   │   ├─> Analysis Validator: Compare vs baseline/expectations
   │   └─> Emit events: analysis_complete, validation_result
   │
   ├─> Storage Layer
   │   ├─> Save screenshots to data/screenshots/
   │   ├─> Save analysis results to data/results/
   │   └─> Update test execution state
   │
   └─> Reporting System
       ├─> Result Aggregator: Collect all results
       ├─> Report Generator: Create HTML/JSON reports
       ├─> Notification Hub: Send alerts if failures
       └─> Store report to data/reports/

2. Return results to user
```

### Event-Driven Communication

```
┌──────────────┐
│  Event Bus   │ (Central nervous system)
└──────┬───────┘
       │
       ├─> test.started        → Workflow Controller
       ├─> step.executing      → Execution Engine
       ├─> screenshot.captured → AI Analysis Layer
       ├─> analysis.complete   → Result Aggregator
       ├─> test.completed      → Report Generator
       └─> test.failed         → Notification Hub
```

**Benefits:**
- **Loose Coupling**: Components don't directly depend on each other
- **Extensibility**: Easy to add new listeners (e.g., metrics collector)
- **Testability**: Can test components in isolation
- **Debuggability**: Event log provides audit trail

## File/Folder Structure

### Recommended Project Structure

```
autonomous-testing-system/
│
├── src/
│   ├── orchestration/          # Orchestration Layer
│   │   ├── planner/
│   │   ├── scheduler/
│   │   └── workflow/
│   │
│   ├── execution/              # Execution Engine
│   │   ├── playwright/
│   │   ├── capture/
│   │   ├── pages/              # Page Object Models
│   │   └── utils/
│   │
│   ├── ai-analysis/            # AI Analysis Layer
│   │   ├── gemini/
│   │   ├── validation/
│   │   └── models/
│   │
│   ├── reporting/              # Reporting System
│   │   ├── aggregation/
│   │   ├── generation/
│   │   ├── notification/
│   │   └── templates/
│   │
│   ├── storage/                # Storage Layer abstractions
│   │   ├── repositories/
│   │   ├── models/
│   │   └── migrations/
│   │
│   ├── shared/                 # Shared utilities
│   │   ├── events/             # Event bus
│   │   ├── logger/             # Logging
│   │   ├── config/             # Configuration loader
│   │   └── types/              # Shared TypeScript types
│   │
│   └── api/                    # External API (optional)
│       ├── routes/
│       ├── controllers/
│       └── middleware/
│
├── tests/                      # Unit and integration tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── data/                       # Runtime data (gitignored)
│   ├── plans/
│   ├── screenshots/
│   ├── baselines/
│   ├── results/
│   └── reports/
│
├── config/                     # Configuration files
│   ├── playwright.config.ts
│   ├── gemini.config.yaml
│   └── default.yaml
│
├── scripts/                    # Utility scripts
│   ├── setup.sh
│   └── cleanup.sh
│
├── docs/                       # Documentation
│   ├── architecture.md
│   ├── api.md
│   └── guides/
│
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Key Organizational Principles

1. **Layer Separation**: Each architectural layer has its own directory
2. **Feature Grouping**: Related functionality grouped together (not by file type)
3. **Shared Code**: Common utilities in `shared/` to avoid duplication
4. **Data Isolation**: Runtime data separate from code
5. **Configuration Centralization**: All configs in `config/` directory
6. **Test Colocation**: Tests mirror source structure

## Suggested Build Order

### Phase 1: Foundation (Week 1)

**Goal:** Basic infrastructure and Playwright execution

1. **Project Setup**
   - Initialize TypeScript project
   - Install Playwright, core dependencies
   - Configure TypeScript, linting, testing

2. **Storage Layer**
   - File system repository for test plans
   - Basic JSON/YAML parsing
   - Screenshot storage

3. **Execution Engine - Basic**
   - Playwright controller with simple test execution
   - Browser manager with context isolation
   - Screenshot capture at key points

4. **Simple Test Runner**
   - CLI to execute a single test plan
   - Basic logging and console output

**Deliverable:** Can execute a hardcoded test plan with Playwright, capture screenshots

### Phase 2: AI Integration (Week 2)

**Goal:** Add Gemini vision analysis

1. **Gemini Client**
   - API client wrapper
   - Authentication and rate limiting
   - Error handling and retries

2. **AI Analysis Layer**
   - Screenshot analysis with Gemini Vision
   - Prompt engineering for UI validation
   - Parse and structure AI responses

3. **Basic Validation**
   - Compare AI analysis against expected outcomes
   - Simple pass/fail determination

**Deliverable:** Tests can capture screenshots and get AI analysis of what's visible

### Phase 3: Orchestration (Week 3)

**Goal:** Intelligent test planning and execution

1. **Test Planner**
   - Parse YAML test plans
   - Generate test scenarios
   - Basic prioritization

2. **Workflow Controller**
   - State machine for test execution
   - Event bus implementation
   - Error handling and recovery

3. **Scheduler**
   - Job queue management
   - On-demand execution
   - Basic retry logic

**Deliverable:** Can execute multiple test plans with proper orchestration

### Phase 4: Reporting (Week 4)

**Goal:** Comprehensive test reports and notifications

1. **Result Aggregation**
   - Collect execution data
   - Calculate metrics (pass rate, duration, etc.)
   - Store structured results

2. **Report Generation**
   - HTML report with screenshots
   - JSON export for CI/CD integration
   - Screenshot gallery

3. **Notifications**
   - Basic email/webhook notifications
   - Failure alerts

**Deliverable:** Complete test reports with visual evidence and notifications

### Phase 5: Refinement (Week 5+)

**Goal:** Production readiness

1. **Self-Healing**
   - Selector adaptation
   - Automatic retry with variations
   - Learning from failures

2. **Advanced Features**
   - Parallel execution
   - Visual regression baseline management
   - Trend analysis

3. **API Layer** (optional)
   - REST API for remote execution
   - Dashboard for viewing results

**Deliverable:** Production-ready autonomous testing system

## Integration Points

### External System Integration

| Integration | Purpose | Protocol | Direction |
|-------------|---------|----------|-----------|
| **Dawati App** | Target application under test | HTTP/HTTPS | Outbound |
| **Gemini API** | Screenshot analysis and AI vision | REST API | Outbound |
| **CI/CD System** | Trigger tests on deployment | Webhook/API | Inbound |
| **Notification System** | Alert on test completion/failure | SMTP/Webhook | Outbound |
| **Monitoring** | Metrics and observability | StatsD/OpenTelemetry | Outbound |
| **Cloud Storage** | Backup screenshots/reports (optional) | S3/GCS API | Outbound |

### Internal Component Integration

**1. Orchestration ↔ Execution**
- **Protocol:** Event Bus + Direct Function Calls
- **Data Flow:** Test plans → Execution commands → Execution events
- **Example:**
  ```typescript
  // Orchestration triggers execution
  await playwrightController.executeStep(step);

  // Execution emits events
  eventBus.emit('step.complete', { stepId, result });
  ```

**2. Execution ↔ AI Analysis**
- **Protocol:** Async Function Calls + Event Bus
- **Data Flow:** Screenshot → AI analysis request → Analysis result
- **Example:**
  ```typescript
  // Execution captures and sends
  const screenshot = await capture.takeScreenshot();
  const analysis = await geminiVision.analyze(screenshot, prompt);

  // Analysis emits event
  eventBus.emit('analysis.complete', { screenshot, analysis });
  ```

**3. AI Analysis ↔ Reporting**
- **Protocol:** Event Bus
- **Data Flow:** Analysis results → Result aggregation → Report generation
- **Example:**
  ```typescript
  // Analysis emits validation result
  eventBus.emit('validation.complete', { passed, evidence });

  // Reporting listens and aggregates
  resultAggregator.on('validation.complete', (result) => {
    aggregator.add(result);
  });
  ```

**4. All Components ↔ Storage**
- **Protocol:** Repository Pattern (abstraction layer)
- **Data Flow:** CRUD operations via repositories
- **Example:**
  ```typescript
  // Any component can use repository
  const testPlan = await testPlanRepo.findById(planId);
  await screenshotRepo.save(screenshot);
  await resultRepo.create(testResult);
  ```

### Configuration Management

**Environment-Based Configuration:**

```yaml
# config/default.yaml
playwright:
  headless: true
  viewport:
    width: 1280
    height: 720
  timeout: 30000

gemini:
  apiKey: ${GEMINI_API_KEY}
  model: gemini-3-flash
  maxRetries: 3

storage:
  screenshotsPath: ./data/screenshots
  baselinesPath: ./data/baselines
  resultsPath: ./data/results

reporting:
  formats:
    - html
    - json
  notifications:
    enabled: true
    channels:
      - email
```

**Override for different environments:**

```yaml
# config/production.yaml
playwright:
  headless: true

gemini:
  timeout: 60000

storage:
  screenshotsPath: /var/data/screenshots
  cloudSync: true
  cloudBucket: ${GCS_BUCKET}
```

## Architecture Patterns to Follow

### Pattern 1: Event-Driven Architecture

**What:** Components communicate via events rather than direct coupling

**When:** Use throughout system for component communication

**Benefits:**
- Loose coupling between components
- Easy to add new features (just listen to events)
- Built-in audit trail
- Testable in isolation

**Example:**
```typescript
// Event emitter (execution engine)
class PlaywrightController {
  async executeStep(step: TestStep) {
    this.eventBus.emit('step.started', { step });

    const result = await this.execute(step);

    if (result.screenshot) {
      this.eventBus.emit('screenshot.captured', {
        stepId: step.id,
        screenshot: result.screenshot
      });
    }

    this.eventBus.emit('step.complete', { step, result });
  }
}

// Event listener (AI analysis)
class GeminiAnalyzer {
  constructor(eventBus: EventBus) {
    eventBus.on('screenshot.captured', this.analyzeScreenshot.bind(this));
  }

  async analyzeScreenshot(event: ScreenshotEvent) {
    const analysis = await this.gemini.analyze(event.screenshot);
    this.eventBus.emit('analysis.complete', { ...event, analysis });
  }
}
```

### Pattern 2: Page Object Model (POM)

**What:** Encapsulate page structure in classes, separate from test logic

**When:** Use for all Playwright page interactions

**Benefits:**
- Maintainability (UI changes only affect POM, not tests)
- Reusability (multiple tests use same page objects)
- Readability (test intent clearer without locator details)

**Example:**
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  // Locators
  private emailInput = () => this.page.getByLabel('Email');
  private passwordInput = () => this.page.getByLabel('Password');
  private submitButton = () => this.page.getByRole('button', { name: 'Sign In' });

  // Actions
  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitButton().click();
  }

  // Assertions
  async isErrorVisible() {
    return this.page.getByRole('alert').isVisible();
  }
}

// Test using POM
const loginPage = new LoginPage(page);
await loginPage.login('user@example.com', 'password123');
```

### Pattern 3: Repository Pattern

**What:** Abstract data access behind interfaces

**When:** Use for all storage operations

**Benefits:**
- Swap storage implementations (file → database) without changing consumers
- Easier testing (mock repositories)
- Consistent data access patterns

**Example:**
```typescript
// Interface
interface ITestPlanRepository {
  findById(id: string): Promise<TestPlan | null>;
  findAll(): Promise<TestPlan[]>;
  save(plan: TestPlan): Promise<void>;
  delete(id: string): Promise<void>;
}

// File-based implementation
class FileTestPlanRepository implements ITestPlanRepository {
  constructor(private basePath: string) {}

  async findById(id: string): Promise<TestPlan | null> {
    const filePath = path.join(this.basePath, `${id}.yaml`);
    if (!fs.existsSync(filePath)) return null;
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return YAML.parse(content);
  }

  // ... other methods
}

// Usage
const repo: ITestPlanRepository = new FileTestPlanRepository('./data/plans');
const plan = await repo.findById('login-flow');
```

### Pattern 4: Strategy Pattern

**What:** Encapsulate interchangeable algorithms behind interface

**When:** Use for adaptive behaviors (test prioritization, selector strategies)

**Benefits:**
- Easy to switch strategies at runtime
- Easy to add new strategies
- Testable in isolation

**Example:**
```typescript
// Strategy interface
interface ITestPrioritizationStrategy {
  prioritize(tests: TestPlan[]): TestPlan[];
}

// Risk-based strategy
class RiskBasedPrioritization implements ITestPrioritizationStrategy {
  prioritize(tests: TestPlan[]): TestPlan[] {
    return tests.sort((a, b) => b.riskScore - a.riskScore);
  }
}

// Recent changes strategy
class RecentChangesStrategy implements ITestPrioritizationStrategy {
  prioritize(tests: TestPlan[]): TestPlan[] {
    return tests.sort((a, b) => {
      return b.lastModified.getTime() - a.lastModified.getTime();
    });
  }
}

// Usage
class TestPlanner {
  constructor(private strategy: ITestPrioritizationStrategy) {}

  async planTests(tests: TestPlan[]): Promise<TestPlan[]> {
    return this.strategy.prioritize(tests);
  }
}
```

### Pattern 5: Observer Pattern

**What:** Subscribe to state changes and react

**When:** Use for test result processing, notifications

**Benefits:**
- Multiple observers can react to same event
- Add new observers without modifying subject
- Clean separation of concerns

**Example:**
```typescript
// Subject
class TestExecutor {
  private observers: TestObserver[] = [];

  subscribe(observer: TestObserver) {
    this.observers.push(observer);
  }

  async executeTest(test: TestPlan) {
    const result = await this.run(test);

    // Notify all observers
    for (const observer of this.observers) {
      await observer.onTestComplete(result);
    }
  }
}

// Observers
class ReportGenerator implements TestObserver {
  async onTestComplete(result: TestResult) {
    await this.generateReport(result);
  }
}

class NotificationSender implements TestObserver {
  async onTestComplete(result: TestResult) {
    if (result.failed) {
      await this.sendAlert(result);
    }
  }
}

// Usage
const executor = new TestExecutor();
executor.subscribe(new ReportGenerator());
executor.subscribe(new NotificationSender());
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tight Coupling Between Layers

**What:** Direct dependencies between layers (e.g., Execution Engine directly calling Report Generator)

**Why Bad:**
- Changes cascade across system
- Hard to test components in isolation
- Difficult to swap implementations
- Violates separation of concerns

**Instead:** Use Event Bus or Dependency Injection

```typescript
// BAD: Direct coupling
class PlaywrightController {
  async executeStep(step: TestStep) {
    const result = await this.run(step);

    // Directly coupled to reporting
    const reporter = new ReportGenerator();
    await reporter.addResult(result);
  }
}

// GOOD: Event-driven
class PlaywrightController {
  constructor(private eventBus: EventBus) {}

  async executeStep(step: TestStep) {
    const result = await this.run(step);

    // Emit event, don't know who listens
    this.eventBus.emit('step.complete', { result });
  }
}
```

### Anti-Pattern 2: Fragile Selectors

**What:** Using CSS selectors or XPath that break with UI changes

**Why Bad:**
- High maintenance burden
- Flaky tests
- False failures

**Instead:** Use semantic, user-facing selectors

```typescript
// BAD: Fragile selectors
await page.click('#btn-submit-form-123');
await page.locator('div > ul > li:nth-child(2) > a').click();
await page.locator('//div[@class="container"]/button[1]').click();

// GOOD: Semantic selectors
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email address').fill('user@example.com');
await page.getByText('Welcome back').isVisible();
```

### Anti-Pattern 3: Testing Too Much in One Test

**What:** Single test that validates entire user journey with many assertions

**Why Bad:**
- First failure hides subsequent issues
- Hard to debug which part failed
- Long execution time
- Violates test isolation

**Instead:** Break into focused, atomic tests

```typescript
// BAD: Mega test
test('complete user journey', async () => {
  // Login
  await loginPage.login(email, password);
  expect(await dashboard.isVisible()).toBe(true);

  // Create item
  await dashboard.createItem('New Item');
  expect(await dashboard.itemExists('New Item')).toBe(true);

  // Edit item
  await dashboard.editItem('New Item', 'Updated Item');
  expect(await dashboard.itemExists('Updated Item')).toBe(true);

  // Delete item
  await dashboard.deleteItem('Updated Item');
  expect(await dashboard.itemExists('Updated Item')).toBe(false);
});

// GOOD: Focused tests
test('user can login', async () => {
  await loginPage.login(email, password);
  expect(await dashboard.isVisible()).toBe(true);
});

test('user can create item', async () => {
  await setupLoggedInState();
  await dashboard.createItem('New Item');
  expect(await dashboard.itemExists('New Item')).toBe(true);
});
```

### Anti-Pattern 4: No Test Isolation

**What:** Tests depend on state from previous tests

**Why Bad:**
- Order-dependent tests (pass when run alone, fail in suite)
- Cascading failures
- Hard to debug
- Can't run tests in parallel

**Instead:** Each test sets up its own state

```typescript
// BAD: Shared state
let userId: string;

test('create user', async () => {
  userId = await api.createUser({ name: 'Test User' });
  expect(userId).toBeDefined();
});

test('update user', async () => {
  // Depends on previous test!
  await api.updateUser(userId, { name: 'Updated' });
});

// GOOD: Isolated tests
test('create user', async () => {
  const userId = await api.createUser({ name: 'Test User' });
  expect(userId).toBeDefined();

  // Cleanup
  await api.deleteUser(userId);
});

test('update user', async () => {
  // Creates its own user
  const userId = await api.createUser({ name: 'Test User' });
  await api.updateUser(userId, { name: 'Updated' });

  const user = await api.getUser(userId);
  expect(user.name).toBe('Updated');

  // Cleanup
  await api.deleteUser(userId);
});
```

### Anti-Pattern 5: Hardcoded Waits

**What:** Using fixed delays like `await page.waitForTimeout(5000)`

**Why Bad:**
- Flaky tests (sometimes too short, often too long)
- Wastes time
- Doesn't reflect real user experience
- Masks underlying issues

**Instead:** Use Playwright's auto-waiting and explicit waits

```typescript
// BAD: Hardcoded waits
await page.click('button');
await page.waitForTimeout(3000);  // Hope it's enough
await page.locator('.result').textContent();

// GOOD: Explicit waits
await page.click('button');
await page.waitForSelector('.result', { state: 'visible' });
await page.locator('.result').textContent();

// BETTER: Playwright auto-waits
await page.click('button');
// Playwright automatically waits for .result to be visible
const text = await page.locator('.result').textContent();
```

### Anti-Pattern 6: Overfitting Baselines

**What:** Visual baselines that fail on insignificant pixel differences

**Why Bad:**
- High false positive rate
- Maintenance burden updating baselines
- Lost trust in visual testing

**Instead:** Use AI vision to understand meaningful changes

```typescript
// BAD: Pixel-perfect comparison
const baseline = await loadBaseline('login-page.png');
const screenshot = await page.screenshot();
const diff = pixelCompare(baseline, screenshot);
if (diff > 0) {
  throw new Error('Visual regression detected');
}

// GOOD: AI-powered semantic comparison
const screenshot = await page.screenshot();
const analysis = await gemini.analyze(screenshot, {
  prompt: `Compare this screenshot to the baseline login page.
           Ignore trivial differences like timestamps or dynamic content.
           Report only meaningful UI changes like:
           - Missing buttons or form fields
           - Layout shifts
           - Color/branding changes`
});

if (analysis.hasMeaningfulChanges) {
  throw new Error(`Visual regression: ${analysis.description}`);
}
```

### Anti-Pattern 7: Ignoring Flaky Tests

**What:** Rerunning flaky tests without investigating root cause

**Why Bad:**
- Undermines confidence in test suite
- Wastes CI/CD time
- Masks real issues
- Technical debt accumulates

**Instead:** Track, investigate, and fix flaky tests

```typescript
// BAD: Blind retry
test('flaky test', async () => {
  // Sometimes passes, sometimes fails
  await doUnreliableThing();
});

// playwright.config.ts
export default {
  retries: 3,  // Just retry and hope it works
};

// GOOD: Track and fix
test('formerly flaky test', async () => {
  // Fixed by using proper wait
  await page.waitForLoadState('networkidle');
  await doReliableThing();
});

// Track flaky tests
class FlakyTestTracker {
  async recordTestRun(testName: string, passed: boolean) {
    const history = await this.getHistory(testName);
    history.push({ passed, timestamp: Date.now() });

    const flakyRate = this.calculateFlakyRate(history);
    if (flakyRate > 0.1) {
      await this.alertTeam(`Test "${testName}" is flaky (${flakyRate * 100}% failure rate)`);
    }
  }
}
```

## Scalability Considerations

### At 100 Tests

**Approach:** Single-process execution, file-based storage

**Architecture:**
- Simple CLI runner
- Sequential execution
- Local file storage
- Manual execution

**Constraints:**
- Execution time: ~1 hour for full suite
- Storage: ~10GB for screenshots
- Resources: Single machine sufficient

**Optimizations:**
- Parallel execution (multiple browser contexts)
- Playwright's built-in parallelization

### At 1,000 Tests

**Approach:** Parallel execution, better orchestration, cloud storage

**Architecture:**
- Job queue for test scheduling
- Parallel worker processes
- Cloud storage for artifacts
- CI/CD integration

**Constraints:**
- Execution time: ~2-3 hours for full suite (with parallelization)
- Storage: ~100GB for screenshots
- Resources: Multi-core machine or distributed workers

**Optimizations:**
- Selective test execution (only run affected tests)
- Smart prioritization (risk-based, recent changes)
- Screenshot compression
- Incremental result storage

### At 10,000+ Tests

**Approach:** Distributed execution, database-backed, sophisticated orchestration

**Architecture:**
- Distributed worker pool (Kubernetes, cloud functions)
- Database for metadata (PostgreSQL, MongoDB)
- Object storage for artifacts (S3, GCS)
- Advanced orchestration (AI-driven prioritization)
- Real-time monitoring and observability

**Constraints:**
- Execution time: ~3-4 hours for full suite (with smart selection)
- Storage: ~1TB for screenshots
- Resources: Cloud infrastructure with auto-scaling

**Optimizations:**
- Predictive test selection (ML model predicts which tests will fail)
- Visual diffing (only analyze screenshots that changed)
- Test impact analysis (skip tests unaffected by code changes)
- Distributed caching
- Progressive test execution (fast tests first, slow tests later)

## Technology Stack Recommendations

Based on project context (React Native/Expo web app with Playwright + Gemini):

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Playwright requires Node.js, LTS for stability |
| **Language** | TypeScript | 5.x | Type safety, better tooling, Playwright TypeScript support |
| **Test Runner** | Playwright Test | Latest | Built-in test runner with parallelization, retries |
| **Browser Automation** | Playwright | Latest | Best-in-class for modern web apps, cross-browser |
| **AI Vision** | Gemini 3 Flash | Latest | Agentic vision for UI analysis, Google's newest model |
| **Configuration** | dotenv + YAML | Latest | Environment variables + structured config |
| **Event Bus** | EventEmitter2 | Latest | Enhanced Node.js EventEmitter with namespaces |
| **Logging** | Winston | Latest | Structured logging, multiple transports |
| **Report Generation** | Handlebars | Latest | Template-based HTML generation |
| **Testing** | Jest | Latest | Unit testing for non-Playwright code |

**Installation:**

```bash
# Core dependencies
npm install playwright @playwright/test
npm install @google/generative-ai  # Gemini SDK
npm install typescript tsx @types/node

# Configuration
npm install dotenv yaml
npm install eventemitter2

# Logging and reporting
npm install winston
npm install handlebars

# Testing
npm install -D jest @types/jest ts-jest

# Development
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier
```

## React Native/Expo Specific Considerations

### Web vs Native Testing

**For Dawati (React Native/Expo web app):**

- **Web Target**: Playwright is ideal for web builds (`expo start --web`)
- **Native Apps**: Playwright does NOT support native iOS/Android apps
  - For native: Would need Appium or Maestro
  - For web: Playwright is perfect choice

**Architecture Implication:**

```
Dawati App
├── Web Build (Expo web)
│   └── Test with Playwright ✅
│       └── Autonomous system works as designed
│
└── Native Build (iOS/Android)
    └── Playwright NOT compatible ❌
        └── Would need different execution engine
```

### Testing Strategy for Expo Web

1. **Target the web build** (`expo start --web`)
2. **Run Playwright against `localhost:19006`** (default Expo web port)
3. **Test PWA version** if using Expo PWA features
4. **Consider responsive testing** (mobile viewports in browser)

**Example configuration:**

```typescript
// playwright.config.ts
export default {
  use: {
    baseURL: 'http://localhost:19006',  // Expo web default
    viewport: { width: 375, height: 667 },  // iPhone viewport
  },

  webServer: {
    command: 'npx expo start --web',
    port: 19006,
    reuseExistingServer: true,
  },
};
```

### SDK 55+ New Architecture

**Important:** React Native New Architecture (always enabled in SDK 55+) affects:

- **Performance**: Faster rendering (60fps, 40% faster startup)
- **Memory**: 20-30% reduction
- **Testing implications**: More stable, predictable rendering
  - Better for screenshot consistency
  - Faster test execution
  - More reliable timing

**No architecture changes needed**, but beneficial for:
- Reduced flakiness
- Faster test execution
- Better screenshot stability

## Confidence Assessment

| Aspect | Confidence | Source |
|--------|-----------|--------|
| **General Architecture Patterns** | MEDIUM | WebSearch + industry patterns |
| **Playwright Best Practices** | HIGH | Official Playwright docs via WebSearch |
| **Gemini Vision Integration** | MEDIUM | Google blog posts (recent, authoritative) |
| **Event-Driven Architecture** | HIGH | Established pattern, widely documented |
| **Storage Patterns** | HIGH | Standard repository pattern |
| **React Native/Expo Specifics** | MEDIUM | Official Expo docs via WebSearch |
| **Scalability Recommendations** | MEDIUM | Industry patterns, not project-specific |

**Overall Confidence: MEDIUM**

**Verification Notes:**
- Playwright best practices verified from official documentation (2026)
- Gemini agentic vision confirmed from Google Developer Blog (February 2026)
- React Native New Architecture details from Expo official documentation
- General autonomous testing patterns from multiple 2026 sources
- Some details (exact Gemini API usage) would benefit from hands-on verification

## Open Questions for Future Investigation

1. **Gemini API Rate Limits**: What are actual rate limits for Gemini 3 Flash vision API?
2. **Screenshot Optimization**: What's optimal compression without losing analysis quality?
3. **Baseline Management**: How to version baselines with app updates?
4. **Flaky Test Detection**: What's the best threshold for flaky test alerts?
5. **Cost Optimization**: What's the cost per test execution with Gemini API?
6. **Multi-Environment**: How to handle staging vs production testing?
7. **Native Testing**: If native apps needed, would we need a separate execution engine?

## Sources

**Autonomous Testing Ecosystem:**
- [What Is Autonomous Testing? Benefits, Tools & Best Practices](https://testgrid.io/blog/autonomous-testing/)
- [10 Best Test Automation Trends to look out for in 2026](https://www.accelq.com/blog/key-test-automation-trends/)
- [Software Testing Basics for 2026: What's Changed and Why it Matters](https://momentic.ai/blog/software-testing-basics)
- [Automated Testing 2026: Scale Quality Without Slowing Speed](https://itidoltechnologies.com/blog/automated-testing-2026-scale-quality-without-slowing-speed/)

**AI Testing Architecture:**
- [The 2026 Guide to AI Agent Architecture Components](https://procreator.design/blog/guide-to-ai-agent-architecture-components/)
- [Building a Future-Proof Test Automation Architecture](https://www.accelq.com/blog/test-automation-architecture/)
- [How AI is Transforming Software Test Automation in 2026](https://breakingac.com/news/2026/jan/09/how-ai-is-transforming-software-test-automation-in-2026/)
- [12 AI Test Automation Tools QA Teams Actually Use in 2026](https://testguild.com/7-innovative-ai-test-automation-tools-future-third-wave/)

**Playwright Best Practices:**
- [15 Best Practices for Playwright testing in 2026](https://www.browserstack.com/guide/playwright-best-practices)
- [Best Practices | Playwright](https://playwright.dev/docs/best-practices)
- [The Complete Guide to Automated Testing with Playwright Framework](https://testgrid.io/blog/playwright-testing/)
- [Best Practices for Writing Scalable Playwright Test Scripts](https://www.frugaltesting.com/blog/best-practices-for-writing-scalable-playwright-test-scripts)

**Gemini Vision & AI Analysis:**
- [Introducing Agentic Vision in Gemini 3 Flash](https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/)
- [Google Supercharges Gemini 3 Flash with Agentic Vision](https://www.infoq.com/news/2026/02/google-gemini-agentic-vision/)
- [Gemini 3 Pro: the frontier of vision AI](https://blog.google/technology/developers/gemini-3-pro-vision/)
- [14 Best AI Testing Tools & Platforms in 2026](https://www.virtuosoqa.com/post/best-ai-testing-tools)

**Visual Testing:**
- [Top 7 Visual Testing Tools for 2026](https://testrigor.com/blog/visual-testing-tools/)
- [19 Best Visual Testing Tools for 2026](https://www.testmuai.com/blog/visual-testing-tools/)
- [How AI in Visual Testing is transforming the Testing Landscape](https://www.browserstack.com/guide/how-ai-in-visual-testing-is-evolving)

**Orchestration & Architecture Patterns:**
- [Enterprise Agentic AI Architecture Guide 2026](https://www.kellton.com/kellton-tech-blog/enterprise-agentic-ai-architecture)
- [Top 10+ Agentic Orchestration Frameworks & Tools in 2026](https://aimultiple.com/agentic-orchestration)
- [Choosing Your AI Orchestration Stack for 2026](https://thenewstack.io/choosing-your-ai-orchestration-stack-for-2026/)

**React Native/Expo:**
- [React Native's New Architecture - Expo Documentation](https://docs.expo.dev/guides/new-architecture/)
- [React Native in 2026: What's New and What to Expect](https://www.euroshub.com/blogs/react-native-2026-whats-new-and-what-to-expect)
- [Unit testing with Jest - Expo Documentation](https://docs.expo.dev/develop/unit-testing/)
- [What's New in Expo SDK 55](https://medium.com/@onix_react/whats-new-in-expo-sdk-55-6eac1553cee8)

**Anti-Patterns:**
- [Keep Your Automated Testing Simple and Avoid Anti-Patterns](https://www.mabl.com/blog/keep-your-automated-testing-simple)
- [Avoiding Test Automation Pitfalls: 5 Common Anti-Patterns](https://www.testdevlab.com/blog/5-test-automation-anti-patterns-and-how-to-avoid-them)
- [Top 10 Software Test Automation Anti-patterns - Ways To Avoid](https://blog.qasource.com/top-10-test-automation-anti-patterns-and-ways-to-avoid-them)
- [Software Testing Anti-patterns](https://blog.codepipes.com/testing/software-testing-antipatterns.html)
