import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Page } from 'playwright';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Use vi.hoisted for hoisted mocks like createChildLogger if needed,
// but since we mock the module, standard mock works fine usually.
vi.mock('./logger', () => ({
  createChildLogger: () => mockLogger,
}));

// Mock device manager
vi.mock('./device-manager', () => ({
  getCurrentDevice: () => 'Desktop 1280x720',
}));

// Mock AxeBuilder
const mockAnalyze = vi.fn();
const mockWithTags = vi.fn().mockReturnThis();

vi.mock('@axe-core/playwright', () => {
  return {
    default: class {
      constructor() {
        return {
          withTags: mockWithTags,
          analyze: mockAnalyze,
        };
      }
    },
  };
});

// Import the module under test
import { AccessibilityChecker } from './accessibility-checker';

describe('AccessibilityChecker', () => {
  let checker: AccessibilityChecker;
  let mockPage: Page;

  beforeEach(() => {
    checker = new AccessibilityChecker(['critical', 'serious', 'moderate']);
    mockPage = {} as Page;
    mockAnalyze.mockReset();
    mockWithTags.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  it('should initialize with empty results', () => {
    expect(checker.getResults()).toEqual([]);
  });

  it('should run accessibility check and store results', async () => {
    const mockViolations = [
      {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Ensure contrast ratio',
        help: 'Elements must have sufficient color contrast',
        helpUrl: 'https://deque.com/rules/color-contrast',
        nodes: [{ html: '<div>', target: ['div'] }],
      },
    ];

    mockAnalyze.mockResolvedValue({
      violations: mockViolations,
      passes: [],
      incomplete: [],
    });

    const result = await checker.runCheck(mockPage, 'homepage');

    expect(mockWithTags).toHaveBeenCalledWith(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    expect(mockAnalyze).toHaveBeenCalled();
    expect(result.violations).toHaveLength(1);
    expect(result.page).toBe('homepage');
    expect(checker.getResults()).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalled(); // Should warn if violations found
  });

  it('should filter violations based on impact levels', async () => {
    // Re-initialize with only critical
    checker = new AccessibilityChecker(['critical']);

    const mockViolations = [
      { id: 'v1', impact: 'critical', nodes: [] },
      { id: 'v2', impact: 'serious', nodes: [] }, // Should be filtered out
    ];

    mockAnalyze.mockResolvedValue({
      violations: mockViolations,
      passes: [],
      incomplete: [],
    });

    const result = await checker.runCheck(mockPage, 'test-page');

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].id).toBe('v1');
  });

  it('should return violation summary correctly', async () => {
    const mockViolations1 = [{ id: 'v1', impact: 'critical', nodes: [] }];
    const mockViolations2 = [
      { id: 'v2', impact: 'serious', nodes: [] },
      { id: 'v3', impact: 'moderate', nodes: [] },
    ];

    // Mock two checks
    mockAnalyze
      .mockResolvedValueOnce({ violations: mockViolations1, passes: [], incomplete: [] })
      .mockResolvedValueOnce({ violations: mockViolations2, passes: [], incomplete: [] });

    await checker.runCheck(mockPage, 'page1');
    await checker.runCheck(mockPage, 'page2');

    const summary = checker.getViolationSummary();

    expect(summary.total).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.serious).toBe(1);
    expect(summary.moderate).toBe(1);
  });

  it('should clear results', async () => {
    mockAnalyze.mockResolvedValue({ violations: [], passes: [], incomplete: [] });
    await checker.runCheck(mockPage, 'page1');
    expect(checker.getResults()).toHaveLength(1);

    checker.clearResults();
    expect(checker.getResults()).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    mockAnalyze.mockRejectedValue(new Error('Axe failed'));

    const result = await checker.runCheck(mockPage, 'error-page');

    expect(result.violations).toEqual([]);
    expect(checker.getResults()).toHaveLength(1); // Should store empty result
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
