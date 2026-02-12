import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config first to avoid validation errors
vi.mock('./config', () => ({
  config: {
    testResultsDir: 'test-results',
  },
}));

// Mock screenshot-manager
vi.mock('./screenshot-manager', () => ({
  getScreenshots: vi.fn(),
  Screenshot: {},
}));

// Mock ai-analyzer
vi.mock('./ai-analyzer', () => ({
  aggregateIssues: vi.fn(),
  calculateOverallScore: vi.fn(),
  getIssueSummary: vi.fn(),
  AnalysisResult: {},
  Issue: {},
}));

import { generateReport } from './report-generator';
import { getScreenshots } from './screenshot-manager';
import { aggregateIssues, calculateOverallScore, getIssueSummary } from './ai-analyzer';
import { AnalysisResult, Issue } from './ai-analyzer';
import { AuthTestResult } from './auth-tester';
import { NavigationTestResult } from './navigation-tester';
import { ScrollTestResult } from './scroll-tester';
import { RTLCheckResult } from './rtl-checker';
import { VisualDiff, AccessibilityResult, PerformanceMetric } from './types';
import { ChecklistScore } from './checklist-validator';

describe('generateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock objects
  const createMockAnalysisResult = (): AnalysisResult => ({
    screenshot: {
      filename: 'test.png',
      filepath: '/path/to/test.png',
      timestamp: new Date(),
      description: 'Test Screenshot',
      action: 'test',
      url: 'http://test.com',
      device: 'desktop'
    },
    issues: [],
    summary: 'Test Summary',
    scores: { overall: 8, rtl: 10, color: 10, clarity: 10 },
    confidence: 0.9,
    hardcodedText: [],
    imageText: [],
    missingStates: [],
    timestamp: new Date(),
  });

  const createMockIssue = (severity: 'critical' | 'high' | 'medium' | 'low'): Issue => ({
    id: 'ISS-001',
    severity,
    category: 'ui',
    title: 'Test Issue',
    description: 'Test Description',
    suggestion: 'Fix it',
    isBug: true,
  });

  it('should generate a basic report with correct structure', () => {
    // Setup mocks
    const mockIssues = [createMockIssue('high')];
    const mockIssueSummary = { critical: 0, high: 1, medium: 0, low: 0, total: 1 };

    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue(mockIssues);
    vi.mocked(calculateOverallScore).mockReturnValue(8.5);
    vi.mocked(getIssueSummary).mockReturnValue(mockIssueSummary as any);

    const startTime = new Date(Date.now() - 5000); // 5 seconds ago
    const result = generateReport(
      'http://localhost:3000',
      startTime,
      [createMockAnalysisResult()], // analysisResults
      [], // authResults
      [], // navigationResults
      [], // scrollResults
      []  // rtlResults
    );

    expect(result).toBeDefined();
    expect(result.appUrl).toBe('http://localhost:3000');
    expect(result.duration).toBeGreaterThanOrEqual(5);
    expect(result.overallScore).toBe(8.5);
    expect(result.issuesSummary).toEqual(mockIssueSummary);
    expect(result.allIssues).toEqual(mockIssues);
    expect(result.screenshotCount).toBe(0);

    // Verify mocks were called
    expect(aggregateIssues).toHaveBeenCalled();
    expect(calculateOverallScore).toHaveBeenCalled();
    expect(getIssueSummary).toHaveBeenCalled();
    expect(getScreenshots).toHaveBeenCalled();
  });

  it('should handle empty inputs correctly', () => {
    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue([]);
    vi.mocked(calculateOverallScore).mockReturnValue(0);
    vi.mocked(getIssueSummary).mockReturnValue({ critical: 0, high: 0, medium: 0, low: 0, total: 0 } as any);

    const result = generateReport(
      'http://localhost:3000',
      new Date(),
      [], [], [], [], []
    );

    expect(result.overallScore).toBe(0);
    expect(result.allIssues).toEqual([]);
    expect(result.analysisResults).toEqual([]);
    expect(result.authResults).toEqual([]);
    expect(result.navigationResults).toEqual([]);
    expect(result.scrollResults).toEqual([]);
    expect(result.rtlResults).toEqual([]);
    expect(result.visualDiffs).toEqual([]);
    expect(result.accessibilityResults).toEqual([]);
    expect(result.performanceMetrics).toEqual([]);
  });

  it('should correctly calculate visual changes count', () => {
    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue([]);
    vi.mocked(calculateOverallScore).mockReturnValue(0);
    vi.mocked(getIssueSummary).mockReturnValue({ critical: 0, high: 0, medium: 0, low: 0, total: 0 } as any);

    const visualDiffs: VisualDiff[] = [
      { filename: '1.png', baselineExists: true, diffPercentage: 0, hasSignificantChange: false },
      { filename: '2.png', baselineExists: true, diffPercentage: 0.5, hasSignificantChange: true },
      { filename: '3.png', baselineExists: true, diffPercentage: 0.2, hasSignificantChange: true },
    ];

    const result = generateReport(
      'http://localhost:3000',
      new Date(),
      [], [], [], [], [],
      visualDiffs
    );

    expect(result.visualDiffs).toEqual(visualDiffs);
    expect(result.visualChangesCount).toBe(2);
  });

  it('should correctly calculate accessibility summary', () => {
    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue([]);
    vi.mocked(calculateOverallScore).mockReturnValue(0);
    vi.mocked(getIssueSummary).mockReturnValue({ critical: 0, high: 0, medium: 0, low: 0, total: 0 } as any);

    const accessibilityResults: AccessibilityResult[] = [
      {
        page: 'home',
        device: 'mobile',
        timestamp: new Date(),
        passes: 10,
        incomplete: 0,
        violations: [
          { impact: 'critical', id: '1', description: 'desc', help: 'help', helpUrl: 'url', nodes: [] },
          { impact: 'serious', id: '2', description: 'desc', help: 'help', helpUrl: 'url', nodes: [] },
        ]
      },
      {
        page: 'about',
        device: 'desktop',
        timestamp: new Date(),
        passes: 5,
        incomplete: 0,
        violations: [
          { impact: 'critical', id: '3', description: 'desc', help: 'help', helpUrl: 'url', nodes: [] },
        ]
      }
    ];

    const result = generateReport(
      'http://localhost:3000',
      new Date(),
      [], [], [], [], [],
      [], // visualDiffs
      accessibilityResults
    );

    expect(result.accessibilitySummary).toEqual({
      critical: 2,
      serious: 1,
      moderate: 0,
      minor: 0,
      total: 3
    });
  });

  it('should correctly calculate performance summary', () => {
    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue([]);
    vi.mocked(calculateOverallScore).mockReturnValue(0);
    vi.mocked(getIssueSummary).mockReturnValue({ critical: 0, high: 0, medium: 0, low: 0, total: 0 } as any);

    const performanceMetrics: PerformanceMetric[] = [
      { name: 'home', device: 'mobile', pageLoadTimeMs: 1000, timestamp: new Date() },
      { name: 'about', device: 'mobile', pageLoadTimeMs: 2000, timestamp: new Date() },
      { name: 'slow', device: 'mobile', pageLoadTimeMs: 6000, timestamp: new Date() },
    ];

    const result = generateReport(
      'http://localhost:3000',
      new Date(),
      [], [], [], [], [],
      [], // visualDiffs
      [], // accessibilityResults
      performanceMetrics
    );

    expect(result.performanceSummary.avgLoadTimeMs).toBe(3000); // (1000+2000+6000)/3
    expect(result.performanceSummary.maxLoadTimeMs).toBe(6000);
    expect(result.performanceSummary.minLoadTimeMs).toBe(1000);
    expect(result.performanceSummary.totalPages).toBe(3);
    expect(result.performanceSummary.slowPages).toHaveLength(1);
    expect(result.performanceSummary.slowPages[0]).toContain('slow');
  });

  it('should include checklist score and ai status if provided', () => {
    vi.mocked(getScreenshots).mockReturnValue([]);
    vi.mocked(aggregateIssues).mockReturnValue([]);
    vi.mocked(calculateOverallScore).mockReturnValue(0);
    vi.mocked(getIssueSummary).mockReturnValue({ critical: 0, high: 0, medium: 0, low: 0, total: 0 } as any);

    const checklistScore: ChecklistScore = {
      totalItems: 10,
      requiredItems: 5,
      testedItems: 9,
      passingItems: 8,
      failingItems: 1,
      missingItems: 1,
      overallScore: 90,
      requiredScore: 100,
      categories: new Map()
    };

    const aiStatus = {
      enabled: true,
      skippedReason: null
    };

    const result = generateReport(
      'http://localhost:3000',
      new Date(),
      [], [], [], [], [],
      [], [], [], [], // defaults
      checklistScore,
      aiStatus
    );

    expect(result.checklistScore).toEqual(checklistScore);
    expect(result.aiStatus).toEqual(aiStatus);
  });
});
