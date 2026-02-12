import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config to avoid environment variable validation errors
vi.mock('./config', () => ({
  config: {
    geminiApiKey: 'test-key',
    dawatiUrl: 'https://test.dawati.app',
    testPhone: '+1234567890',
    testEmail: 'test@example.com',
    testUsers: {
      phone: { newCustomer: '', existingCustomer: '', newVendor: '', existingVendor: '' },
      email: { new: '', existing: '' }
    },
    headless: true,
    slowMo: 0,
    viewportWidth: 1280,
    viewportHeight: 720,
    fullPageScreenshots: true,
    screenshotQuality: 80,
    aiModel: 'gemini-test',
    aiMaxTokens: 100,
    aiTemperature: 0.1,
    testResultsDir: 'test-results',
    testPlansDir: 'test-plans',
    logLevel: 'info'
  },
  default: {
    geminiApiKey: 'test-key',
    dawatiUrl: 'https://test.dawati.app'
  }
}));

import { getIssueSummary, Issue } from './ai-analyzer';

let issueCounter = 0;

// Helper to create a complete Issue object for tests
function createIssue(overrides: Partial<Issue> = {}): Issue {
  const id = `ISS-${String(++issueCounter).padStart(4, '0')}`;
  return {
    id,
    severity: 'medium',
    category: 'ui',
    title: 'Test Issue',
    description: 'Test Description',
    suggestion: 'Test Suggestion',
    isBug: true,
    location: 'Test Location',
    ...overrides,
  };
}

describe('getIssueSummary', () => {
  beforeEach(() => {
    issueCounter = 0;
  });

  it('should return 0 counts and 0 total for an empty array', () => {
    const issues: Issue[] = [];
    const summary = getIssueSummary(issues);

    expect(summary).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    });
  });

  it('should count a single issue correctly', () => {
    const issues = [createIssue({ severity: 'high' })];
    const summary = getIssueSummary(issues);

    expect(summary).toEqual({
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
      total: 1
    });
  });

  it('should count multiple issues of the same severity correctly', () => {
    const issues = [
      createIssue({ severity: 'medium' }),
      createIssue({ severity: 'medium' }),
      createIssue({ severity: 'medium' })
    ];
    const summary = getIssueSummary(issues);

    expect(summary).toEqual({
      critical: 0,
      high: 0,
      medium: 3,
      low: 0,
      total: 3
    });
  });

  it('should count issues of mixed severities correctly', () => {
    const issues = [
      createIssue({ severity: 'critical' }),
      createIssue({ severity: 'critical' }),
      createIssue({ severity: 'high' }),
      createIssue({ severity: 'medium' }),
      createIssue({ severity: 'medium' }),
      createIssue({ severity: 'medium' }),
      createIssue({ severity: 'low' })
    ];
    const summary = getIssueSummary(issues);

    expect(summary).toEqual({
      critical: 2,
      high: 1,
      medium: 3,
      low: 1,
      total: 7
    });
  });
});
