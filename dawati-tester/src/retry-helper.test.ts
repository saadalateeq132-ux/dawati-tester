import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the mock function so it can be used inside vi.mock factory
const { mockError } = vi.hoisted(() => ({
  mockError: vi.fn(),
}));

vi.mock('./logger', () => ({
  createChildLogger: () => ({
    error: mockError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import after mocking
import { safeExecute } from './retry-helper';

describe('safeExecute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success and result when function resolves', async () => {
    const expectedResult = 'success';
    const fn = vi.fn().mockResolvedValue(expectedResult);

    const result = await safeExecute(fn, 'Operation failed');

    expect(result).toEqual({ success: true, result: expectedResult });
    expect(fn).toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it('should return failure and error message when function rejects with Error', async () => {
    const errorMessage = 'Something went wrong';
    const fn = vi.fn().mockRejectedValue(new Error(errorMessage));
    const logMessage = 'Operation failed';

    const result = await safeExecute(fn, logMessage);

    expect(result).toEqual({ success: false, error: errorMessage });
    expect(mockError).toHaveBeenCalledWith({ error: errorMessage }, logMessage);
  });

  it('should return failure and error string when function rejects with non-Error', async () => {
    const errorString = 'Network error';
    const fn = vi.fn().mockRejectedValue(errorString);
    const logMessage = 'Operation failed';

    const result = await safeExecute(fn, logMessage);

    expect(result).toEqual({ success: false, error: errorString });
    expect(mockError).toHaveBeenCalledWith({ error: errorString }, logMessage);
  });
});
