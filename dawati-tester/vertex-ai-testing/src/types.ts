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
