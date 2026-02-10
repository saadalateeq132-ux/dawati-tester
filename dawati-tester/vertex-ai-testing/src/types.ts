/**
 * Complete type definitions for Vertex AI Testing System
 */

export interface TestConfig {
  projectId: string;
  location: string; // 'europe-west1' for Saudi Arabia
  baseUrl: string;
  model: string; // 'gemini-3-flash-001'
  timeout: number;
  retries: number;
  parallel: boolean;
  headless: boolean;
  locale: string;
  timezone: string;
  devices: DeviceConfig[];
  vertexAI: VertexAIConfig;
  rtl: RTLConfig;
  visualRegression: VisualRegressionConfig;
  artifacts: ArtifactConfig;
  reporting: ReportingConfig;
  testLevels: TestLevelsConfig;
  fineTuning?: FineTuningConfig;
}

export interface DeviceConfig {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
}

export interface VertexAIConfig {
  batchSize: number; // 5-10 screenshots per batch
  streaming: boolean;
  functionCalling: boolean;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  rateLimitPerMinute: number;
}

export interface RTLConfig {
  enabled: boolean;
  checkHardcodedStrings: boolean;
  checkCurrency: boolean;
  checkBiDi: boolean;
  checkHijri: boolean;
  checkLayoutExpansion: boolean;
  checkIconAlignment: boolean;
  checkNumberFormatting: boolean;
  checkAccessibility: boolean;
  checkDynamicContent: boolean;
}

export interface TestLevelsConfig {
  level1Visual: boolean;       // Component consistency, element positions
  level2DataValidation: boolean; // Form validation, hardcoded detection
  level3BackendIntegration: boolean; // API monitoring, state management
}

export interface VisualRegressionConfig {
  enabled: boolean;
  threshold: number; // 0.0 - 1.0
  updateBaselines: boolean;
  baselinesDir: string;
}

export interface ArtifactConfig {
  saveScreenshots: boolean;
  saveHTML: boolean;
  saveNetworkLogs: boolean;
  saveConsoleLogs: boolean;
  maskPII: boolean;
  piiPatterns: string[];
  artifactsDir: string;
}

export interface ReportingConfig {
  format: 'html' | 'json' | 'both';
  trackCosts: boolean;
  reportsDir: string;
}

// Test Phase Definitions

export interface TestPhase {
  id: string;
  name: string;
  description: string;
  actions: PhaseAction[];
  validations: PhaseValidation[];
  dependencies?: string[];
  /** Checklist item IDs this phase validates (e.g., ['ACC-F01', 'ACC-F02']) */
  checklistItems?: string[];
  /** Tags for filtering (e.g., ['smoke', 'rtl', 'auth', 'regression']) */
  tags?: string[];
  /** Per-phase timeout override (ms) */
  timeout?: number;
}

/** Per-phase checklist result showing which items this phase covers */
export interface PhaseChecklistResult {
  items: ChecklistItemResult[];
  covered: number;
  passing: number;
  failing: number;
  missing: number;
  score: number; // 0-100%
}

export interface ChecklistItemResult {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'TODO' | 'MISSING' | 'N/A';
}

export interface PhaseAction {
  type: 'navigate' | 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot' | 'resize' | 'back' | 'scroll-to-bottom'
    | 'submit' | 'select' | 'upload' | 'swipe' | 'long-press' | 'assert' | 'store-value' | 'use-value' | 'rotate';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  width?: number;
  height?: number;
  description: string;
  /** For swipe: direction */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** For assert: what to check */
  assertType?: 'visible' | 'hidden' | 'text-contains' | 'url-contains' | 'count';
  /** For assert: expected value */
  expected?: string;
  /** For store-value/use-value: variable key */
  storeKey?: string;
  // Click validation: verify expected result after click
  expectAfterClick?: {
    type: 'element' | 'url' | 'text' | 'not-visible';
    selector?: string;
    expected?: string | RegExp;
    timeout?: number;
    errorMessage?: string;
  };
}

export interface PhaseValidation {
  type: 'element' | 'text' | 'url' | 'rtl' | 'visual' | 'ai';
  selector?: string;
  expected?: string;
  description: string;
}

// Decision Engine Types

export type DecisionState = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface Decision {
  state: DecisionState;
  confidence: number; // 0.0 - 1.0
  reason: string;
  issues: AIIssue[];
  metadata: {
    timestamp: Date;
    phase: string;
    screenshotPath: string;
    modelUsed: string;
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface AIIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ui' | 'functionality' | 'rtl' | 'accessibility' | 'performance';
  title: string;
  description: string;
  suggestion: string;
  location?: string;
  confidence: number;
}

// Vertex AI Response Types

export interface VertexAIResponse {
  decision: DecisionState;
  confidence: number;
  reason: string;
  issues: AIIssue[];
  rtlIssues: string[];
  hardcodedText: string[];
  imageText: string[];
  currencyIssues: string[];
  dateIssues: string[];
  score: number; // 0-10
}

export interface BatchAnalysisRequest {
  screenshots: string[]; // base64 encoded
  phase: string;
  expectedElements: string[];
  previousDecisions: Decision[];
}

export interface BatchAnalysisResponse {
  analyses: VertexAIResponse[];
  batchId: string;
  tokensUsed: number;
  latencyMs: number;
}

// RTL Checker Types

export interface RTLCheckResult {
  checkName: string;
  passed: boolean;
  score: number; // 0-10
  issues: string[];
  suggestions: string[];
}

export interface ComprehensiveRTLResult {
  overallScore: number;
  checks: RTLCheckResult[];
  criticalIssues: string[];
  summary: string;
}

// Visual Regression Types

export interface VisualRegressionResult {
  passed: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath?: string;
  baselinePath: string;
  currentPath: string;
}

// Artifact Types

export interface TestArtifacts {
  screenshots: string[];
  htmlSnapshots: string[];
  networkLogs: NetworkLog[];
  consoleLogs: ConsoleLog[];
  errors: ErrorLog[];
}

export interface NetworkLog {
  timestamp: Date;
  url: string;
  method: string;
  status: number;
  duration: number;
}

export interface ConsoleLog {
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

export interface ErrorLog {
  timestamp: Date;
  message: string;
  stack?: string;
  phase: string;
}

// Test Result Types

export interface CodeQualityResult {
  score: number; // 0-10
  totalViolations: number;
  violations: Array<{
    file: string;
    line: number;
    category: 'color' | 'text' | 'spacing' | 'rtl' | 'shadow' | 'icon-size';
    severity: 'critical' | 'high' | 'medium' | 'low';
    code: string;
    message: string;
    suggestion: string;
  }>;
  breakdown: {
    colors: { count: number; score: number };
    text: { count: number; score: number };
    spacing: { count: number; score: number };
    rtl: { count: number; score: number };
    shadows: { count: number; score: number };
    iconSizes: { count: number; score: number };
  };
  filesAnalyzed: number;
  summary: string;
}

export interface PhaseResult {
  phase: TestPhase;
  status: 'passed' | 'failed' | 'skipped' | 'unknown';
  duration: number;
  decision: Decision;
  rtlResult?: ComprehensiveRTLResult;
  visualResult?: VisualRegressionResult;
  codeQualityResult?: CodeQualityResult;
  phaseChecklist?: PhaseChecklistResult;
  componentConsistency?: ComponentConsistencyResult;
  formValidation?: FormValidationResult;
  hardcodedDetection?: HardcodedValueDetection;
  backendIntegration?: BackendIntegrationResult;
  performanceResult?: PerformanceResult;
  securityResult?: SecurityResult;
  wcagResult?: WCAGResult;
  imageAssetResult?: ImageAssetResult;
  artifacts: TestArtifacts;
  error?: string;
}

export interface ChecklistScore {
  totalItems: number;
  requiredItems: number;
  testedItems: number;
  passingItems: number;
  failingItems: number;
  missingItems: number;
  overallScore: number; // 0-100%
  requiredScore: number; // P0 coverage
}

export interface TestSuiteResult {
  suiteName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  phaseResults: PhaseResult[];
  overallStatus: 'passed' | 'failed' | 'partial';
  totalPhases: number;
  passedPhases: number;
  failedPhases: number;
  unknownPhases: number;
  skippedPhases: number;
  totalCost: number;
  totalTokens: number;
  summary: string;
  checklistScore?: ChecklistScore;
  trendAnalysis?: TrendAnalysis;
  deviceName?: string;
  browserType?: string;
}

// Cost Tracking Types

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  imageTokens: number;
  totalTokens: number;
  estimatedCost: number; // USD
  model: string;
  phase: string;
}

export interface TotalCostReport {
  phases: CostBreakdown[];
  total: {
    tokens: number;
    cost: number;
  };
  optimization: {
    batchSavings: number;
    potentialSavings: number;
  };
}

// Fine-Tuning Pipeline Types

export type FeedbackLabel = 'correct' | 'incorrect' | 'pending';

export type FeedbackReviewStatus = 'unreviewed' | 'reviewed' | 'exported';

export interface FeedbackRecord {
  id: string;
  timestamp: string;
  suiteName: string;
  phaseId: string;
  phaseName: string;
  screenshotPath: string;
  promptText: string;
  originalResponse: VertexAIResponse;
  modelUsed: string;
  label: FeedbackLabel;
  correctedResponse?: VertexAIResponse;
  reviewerNotes?: string;
  reviewStatus: FeedbackReviewStatus;
  reviewedAt?: string;
  device?: string;
}

export interface FineTuningConfig {
  enabled: boolean;
  feedbackDir: string;
  trainingDataDir: string;
  gcsBucket: string;
  gcsPrefix: string;
  tuningRegion: string;
  tuningBaseModel: string;
  epochs: number;
  learningRateMultiplier: number;
  adapterSize: number;
  tunedModelEndpoint?: string;
  abTestingEnabled: boolean;
  minTrainingExamples: number;
  autopilot: AutopilotConfig;
}

export interface AutopilotConfig {
  enabled: boolean;
  /** Auto-mark as correct when AI confidence >= this threshold */
  autoApproveThreshold: number;
  /** Auto-mark as incorrect when AI confidence <= this threshold */
  autoRejectThreshold: number;
  /** Auto-build dataset + submit tuning when reviewed count reaches this */
  autoTuneAtCount: number;
  /** Auto-switch to tuned model after successful fine-tuning */
  autoSwitchModel: boolean;
  /** Path to persist autopilot state (active tuning job, etc.) */
  stateFilePath: string;
}

export interface AutopilotState {
  /** Currently running tuning job name (if any) */
  activeTuningJob?: string;
  /** Last time auto-review ran */
  lastAutoReviewAt?: string;
  /** Last time dataset was built */
  lastDatasetBuildAt?: string;
  /** Last tuned model endpoint deployed */
  lastTunedEndpoint?: string;
  /** Total auto-approved records */
  totalAutoApproved: number;
  /** Total auto-rejected records */
  totalAutoRejected: number;
  /** Number of tuning jobs completed */
  tuningJobsCompleted: number;
}

export interface TrainingExample {
  systemInstruction: {
    parts: Array<{ text: string }>;
  };
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<
      | { text: string }
      | { fileData: { mimeType: string; fileUri: string } }
    >;
  }>;
}

export interface DatasetManifest {
  buildId: string;
  builtAt: string;
  exampleCount: number;
  screenshotCount: number;
  gcsTrainingFileUri: string;
  gcsImageUris: string[];
  feedbackRecordIds: string[];
  validation: DatasetValidationResult;
}

export interface DatasetValidationResult {
  valid: boolean;
  exampleCount: number;
  errors: string[];
  warnings: string[];
  labelDistribution: {
    pass: number;
    fail: number;
    unknown: number;
  };
}

export type TuningJobStatus =
  | 'JOB_STATE_PENDING'
  | 'JOB_STATE_RUNNING'
  | 'JOB_STATE_SUCCEEDED'
  | 'JOB_STATE_FAILED'
  | 'JOB_STATE_CANCELLED';

export interface TuningJob {
  name: string;
  state: TuningJobStatus;
  createTime: string;
  endTime?: string;
  baseModel: string;
  trainingDatasetUri: string;
  tunedModelEndpoint?: string;
  tunedModelDisplayName?: string;
  error?: string;
  hyperParameters: {
    epochCount: number;
    learningRateMultiplier: number;
    adapterSize: number;
  };
}

export interface ABTestResult {
  phaseId: string;
  baseModelResponse: VertexAIResponse;
  tunedModelResponse: VertexAIResponse;
  baseModelLatencyMs: number;
  tunedModelLatencyMs: number;
  baseModelTokens: number;
  tunedModelTokens: number;
  selectedModel: 'base' | 'tuned';
  agreement: 'agree' | 'disagree';
}

// ─── Level 1: Visual & UX Testing Types ──────────────────────────

export interface ComponentConsistencyResult {
  score: number; // 0-10
  totalChecks: number;
  inconsistencies: ComponentInconsistency[];
  elementPositions: ElementPosition[];
  summary: string;
}

export interface ComponentInconsistency {
  component: string; // e.g., 'back-button', 'header', 'tab-bar', 'primary-button'
  property: string;  // e.g., 'position', 'size', 'color', 'icon-direction'
  pageA: string;
  pageB: string;
  valueA: string;
  valueB: string;
  diffPercent: number;
  severity: 'high' | 'medium' | 'low';
}

export interface ElementPosition {
  element: string;
  page: string;
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

// ─── Level 2: Data Validation & Component Testing Types ──────────

export interface FormValidationResult {
  score: number; // 0-10
  totalFields: number;
  validFields: number;
  violations: FormViolation[];
  summary: string;
}

export interface FormViolation {
  field: string;
  type: 'email' | 'phone' | 'password' | 'name' | 'date' | 'file' | 'required' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface HardcodedValueDetection {
  score: number; // 0-10
  hardcodedStrings: DetectedHardcoded[];
  mockData: DetectedHardcoded[];
  placeholders: DetectedHardcoded[];
  disconnectedElements: DetectedHardcoded[];
  summary: string;
}

export interface DetectedHardcoded {
  value: string;
  location: string;
  type: 'english-string' | 'arabic-string' | 'mock-data' | 'placeholder' | 'disconnected' | 'hardcoded-color' | 'number-format' | 'currency-format';
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

// ─── Level 3: Backend Integration Types ──────────────────────────

export interface BackendIntegrationResult {
  score: number; // 0-10
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  apiResults: APICheckResult[];
  stateManagement: StateManagementResult;
  summary: string;
}

export interface APICheckResult {
  url: string;
  method: string;
  status: number;
  latencyMs: number;
  passed: boolean;
  error?: string;
}

export interface StateManagementResult {
  sessionPersistence: boolean;
  backNavDataLoss: boolean;
  formStatePersistence: boolean;
  issues: string[];
}

// ─── Enhanced Detection Types ────────────────────────────────────

export interface NumberFormatIssue {
  value: string;
  location: string;
  format: 'western' | 'arabic-eastern';
  severity: 'medium';
  suggestion: string;
}

export interface AccessibilityIssue {
  element: string;
  type: 'missing-lang' | 'missing-aria' | 'low-contrast' | 'missing-label';
  severity: 'medium' | 'high';
  suggestion: string;
}

// ─── Performance Types ───────────────────────────────────────────

export interface PerformanceResult {
  score: number; // 0-10
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint (ms)
    fcp: number; // First Contentful Paint (ms)
    cls: number; // Cumulative Layout Shift
    tti: number; // Time to Interactive (ms)
  };
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    growthDetected: boolean;
  };
  resourceCount: {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
    total: number;
  };
  consoleErrors: ConsoleErrorResult;
  summary: string;
}

export interface ConsoleErrorResult {
  score: number; // 0-10
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
}

// ─── Security Types ──────────────────────────────────────────────

export interface SecurityResult {
  score: number; // 0-10
  xssVulnerabilities: SecurityVulnerability[];
  csrfProtection: boolean;
  sensitiveDataExposure: SecurityVulnerability[];
  authProtection: SecurityVulnerability[];
  summary: string;
}

export interface SecurityVulnerability {
  type: 'xss' | 'csrf' | 'sensitive-data' | 'auth' | 'injection' | 'open-redirect';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  suggestion: string;
}

// ─── Accessibility WCAG Types ────────────────────────────────────

export interface WCAGResult {
  score: number; // 0-10
  violations: WCAGViolation[];
  passes: number;
  focusOrder: boolean;
  keyboardNavigable: boolean;
  contrastRatio: { passing: number; failing: number };
  summary: string;
}

export interface WCAGViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  nodes: number; // Number of affected elements
  wcagCriteria: string; // e.g. 'WCAG 2.1 AA 1.4.3'
}

// ─── Image & Asset Types ─────────────────────────────────────────

export interface ImageAssetResult {
  score: number; // 0-10
  brokenImages: string[];
  missingAltText: string[];
  fontLoadingStatus: { fontFamily: string; loaded: boolean }[];
  oversizedImages: { src: string; sizeMB: number }[];
  summary: string;
}

// ─── Trend Tracking Types ────────────────────────────────────────

export interface TrendHistoryEntry {
  timestamp: string;
  suite: string;
  device: string;
  passRate: number;
  avgRTLScore: number;
  avgColorScore: number;
  avgCodeQuality: number;
  avgLevel1Score: number;
  avgLevel2Score: number;
  avgLevel3Score: number;
  avgPerformanceScore: number;
  avgSecurityScore: number;
  avgWCAGScore: number;
  duration: number;
  cost: number;
  phaseCount: number;
}

export interface TrendAnalysis {
  degradation: string[];
  improvements: string[];
  stable: string[];
  sparklines: Record<string, number[]>;
}

// ─── Network Simulation Types ────────────────────────────────────

export interface NetworkProfile {
  name: string;
  downloadKbps: number;
  uploadKbps: number;
  latencyMs: number;
}

export interface NetworkSimulationResult {
  profile: string;
  pagesLoaded: number;
  avgLoadTimeMs: number;
  failedLoads: number;
  offlineBehavior: 'graceful' | 'error-page' | 'no-handling';
  summary: string;
}

// ─── Extended Phase & Config Types ───────────────────────────────

export interface ExtendedTestConfig extends TestConfig {
  performance: PerformanceConfig;
  security: SecurityConfig;
  wcag: WCAGConfig;
  network: NetworkConfig;
  trends: TrendConfig;
}

export interface PerformanceConfig {
  enabled: boolean;
  lcpThreshold: number; // ms
  fcpThreshold: number; // ms
  clsThreshold: number;
  ttiThreshold: number; // ms
  memoryLeakDetection: boolean;
  consoleErrorThreshold: number;
}

export interface SecurityConfig {
  enabled: boolean;
  checkXSS: boolean;
  checkCSRF: boolean;
  checkSensitiveData: boolean;
  checkAuth: boolean;
}

export interface WCAGConfig {
  enabled: boolean;
  level: 'A' | 'AA' | 'AAA';
  checkFocusOrder: boolean;
  checkKeyboardNav: boolean;
  checkContrast: boolean;
}

export interface NetworkConfig {
  enabled: boolean;
  profiles: NetworkProfile[];
  testOffline: boolean;
}

export interface TrendConfig {
  enabled: boolean;
  historyFile: string;
  maxEntries: number;
  degradationThreshold: number; // % drop that triggers alert
}
