/**
 * Complete type definitions for Vertex AI Testing System
 */

export interface TestConfig {
  projectId: string;
  location: string; // 'europe-west1' for Saudi Arabia
  baseUrl: string;
  model: string; // 'gemini-2.0-flash-exp'
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
}

export interface PhaseAction {
  type: 'navigate' | 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  description: string;
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

export interface PhaseResult {
  phase: TestPhase;
  status: 'passed' | 'failed' | 'skipped' | 'unknown';
  duration: number;
  decision: Decision;
  rtlResult?: ComprehensiveRTLResult;
  visualResult?: VisualRegressionResult;
  artifacts: TestArtifacts;
  error?: string;
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
