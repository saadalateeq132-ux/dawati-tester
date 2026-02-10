import { describe, it, expect } from 'vitest';
import { calculateOverallScore, aggregateIssues, getIssueSummary, AnalysisResult, Issue } from './ai-analyzer';

// Helper to create a partial AnalysisResult for testing
const createResult = (score: number, issues: Issue[] = []): AnalysisResult => ({
  score,
  issues,
  // Mock other required fields minimally
  screenshot: { filename: 'test.png' } as any,
  summary: 'Test Summary',
  rtlIssues: [],
  hardcodedText: [],
  imageText: [],
  missingStates: [],
  timestamp: new Date(),
});

// Helper to create an Issue
const createIssue = (severity: Issue['severity']): Issue => ({
  id: 'test-id',
  severity,
  category: 'ui',
  title: 'Test Issue',
  description: 'Test Description',
  suggestion: 'Fix it',
  screenshot: 'test.png',
});

describe('ai-analyzer', () => {
  describe('calculateOverallScore', () => {
    it('should return 0 for empty results', () => {
      expect(calculateOverallScore([])).toBe(0);
    });

    it('should return the score for a single result', () => {
      const result = createResult(8.5);
      expect(calculateOverallScore([result])).toBe(8.5);
    });

    it('should calculate the average score for multiple results', () => {
      const results = [
        createResult(10),
        createResult(5),
        createResult(0)
      ];
      // (10 + 5 + 0) / 3 = 5
      expect(calculateOverallScore(results)).toBe(5);
    });

    it('should round to 1 decimal place', () => {
      const results = [
        createResult(10),
        createResult(10),
        createResult(5)
      ];
      // (10 + 10 + 5) / 3 = 8.333... -> 8.3
      expect(calculateOverallScore(results)).toBe(8.3);
    });

    it('should handle scores slightly outside expected range (robustness)', () => {
      // Verify current behavior for out-of-range inputs
      const results = [createResult(100)];
      expect(calculateOverallScore(results)).toBe(100);

      const negative = [createResult(-5)];
      expect(calculateOverallScore(negative)).toBe(-5);
    });
  });

  describe('aggregateIssues', () => {
    it('should return empty array for empty results', () => {
      expect(aggregateIssues([])).toEqual([]);
    });

    it('should aggregate issues from multiple results', () => {
      const r1 = createResult(5, [createIssue('high')]);
      const r2 = createResult(5, [createIssue('low')]);

      const aggregated = aggregateIssues([r1, r2]);
      expect(aggregated).toHaveLength(2);
      expect(aggregated.map(i => i.severity)).toContain('high');
      expect(aggregated.map(i => i.severity)).toContain('low');
    });

    it('should sort issues by severity (critical > high > medium > low)', () => {
      const issues = [
        createIssue('low'),
        createIssue('critical'),
        createIssue('medium'),
        createIssue('high')
      ];
      const result = createResult(5, issues);

      const aggregated = aggregateIssues([result]);

      // The function modifies the array in place or returns a new one?
      // Based on code: pushes all to new array, then sorts.
      expect(aggregated.map(i => i.severity)).toEqual(['critical', 'high', 'medium', 'low']);
    });
  });

  describe('getIssueSummary', () => {
    it('should return correct counts for empty list', () => {
      const summary = getIssueSummary([]);
      expect(summary).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      });
    });

    it('should count severities correctly', () => {
      const issues = [
        createIssue('critical'),
        createIssue('critical'),
        createIssue('high'),
        createIssue('low')
      ];

      const summary = getIssueSummary(issues);
      expect(summary.critical).toBe(2);
      expect(summary.high).toBe(1);
      expect(summary.medium).toBe(0);
      expect(summary.low).toBe(1);
      expect(summary.total).toBe(4);
    });
  });
});
