import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist the mock function so it can be used inside vi.mock factory
const { mockError, mockWarn } = vi.hoisted(() => ({
  mockError: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock('./logger', () => ({
  createChildLogger: () => ({
    error: mockError,
    warn: mockWarn,
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import after mocking
import { safeExecute, withRetry, withRetryOrDefault } from './retry-helper';

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

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve successfully on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, { delayMs: 100 });

    // Advance time to trigger retry
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, error: 'fail 1' }),
      expect.stringContaining('failed, retrying')
    );
  });

  it('should throw error after exhausting max attempts', async () => {
    const error = new Error('always fails');
    const fn = vi.fn().mockRejectedValue(error);
    const maxAttempts = 3;
    const delayMs = 100;

    const promise = withRetry(fn, { maxAttempts, delayMs });

    // Attach handler BEFORE advancing timers to avoid unhandled rejection
    const check = expect(promise).rejects.toThrow('always fails');

    // Advance time enough for all retries
    await vi.advanceTimersByTimeAsync(delayMs * maxAttempts);

    await check;

    expect(fn).toHaveBeenCalledTimes(maxAttempts);
    expect(mockWarn).toHaveBeenCalledTimes(maxAttempts - 1);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'always fails' }),
      'All retry attempts failed'
    );
  });

  it('should respect custom options', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const options = {
      maxAttempts: 2,
      delayMs: 50,
      operationName: 'TestOp'
    };

    const promise = withRetry(fn, options);

    // Attach handler BEFORE advancing timers
    const check = expect(promise).rejects.toThrow('fail');

    await vi.advanceTimersByTimeAsync(100);

    await check;

    expect(fn).toHaveBeenCalledTimes(2);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'TestOp' }),
      'TestOp failed, retrying...'
    );
  });
});

describe('withRetryOrDefault', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result when function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetryOrDefault(fn, 'default');
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return default value when function fails after retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const maxAttempts = 3;
    const delayMs = 100;

    const promise = withRetryOrDefault(fn, 'default', { maxAttempts, delayMs });

    // Advance time to exhaust retries
    await vi.advanceTimersByTimeAsync(delayMs * maxAttempts);

    const result = await promise;
    expect(result).toBe('default');

    expect(fn).toHaveBeenCalledTimes(maxAttempts);
    // 1. withRetry logs error on exhaust
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'fail' }),
      'All retry attempts failed'
    );
    // 2. withRetryOrDefault logs warn
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'fail' }),
      'Using default value after retry failure'
    );
  });

  it('should still retry before returning default value', async () => {
    const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');

    const promise = withRetryOrDefault(fn, 'default', { delayMs: 100 });

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    // Should NOT have logged "Using default value..."
    expect(mockWarn).not.toHaveBeenCalledWith(
      expect.anything(),
      'Using default value after retry failure'
    );
  });
});
