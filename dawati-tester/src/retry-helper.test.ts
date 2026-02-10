import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, withRetryOrDefault, safeExecute, sleep } from './retry-helper';

// Mock the logger using vi.hoisted to ensure availability in the hoisted vi.mock call
const { mockWarn, mockError, mockInfo } = vi.hoisted(() => ({
  mockWarn: vi.fn(),
  mockError: vi.fn(),
  mockInfo: vi.fn(),
}));

vi.mock('./logger', () => ({
  createChildLogger: () => ({
    warn: mockWarn,
    error: mockError,
    info: mockInfo,
  }),
}));

describe('retry-helper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWarn.mockClear();
    mockError.mockClear();
    mockInfo.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on the first attempt', async () => {
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

      const promise = withRetry(fn, { delayMs: 1000, maxAttempts: 3 });

      // Advance timer to trigger the first retry
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, error: 'fail 1' }),
        expect.stringContaining('failed, retrying...')
      );
    });

    it('should fail after max attempts are exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      const promise = withRetry(fn, { delayMs: 100, maxAttempts: 3 });

      // Attach expectation early to avoid unhandled rejection
      const validation = expect(promise).rejects.toThrow('always fail');

      // Advance timers for all retries
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      await validation;
      expect(fn).toHaveBeenCalledTimes(3);
      expect(mockWarn).toHaveBeenCalledTimes(2); // Retries 1 and 2
      expect(mockError).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'always fail' }),
        'All retry attempts failed'
      );
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const promise = withRetry(fn, { onRetry, delayMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should respect custom delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, { delayMs: 5000 });

      // Advance by 4999ms - should not have retried yet
      await vi.advanceTimersByTimeAsync(4999);
      expect(fn).toHaveBeenCalledTimes(1);

      // Advance by 1ms more - should retry now
      await vi.advanceTimersByTimeAsync(1);
      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetryOrDefault', () => {
    it('should return result if successful', async () => {
      const fn = vi.fn().mockResolvedValue('value');
      const result = await withRetryOrDefault(fn, 'default');
      expect(result).toBe('value');
    });

    it('should return default value if all retries fail', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const promise = withRetryOrDefault(fn, 'default', { maxAttempts: 1 });

      const result = await promise;
      expect(result).toBe('default');
      expect(mockWarn).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'fail' }),
        'Using default value after retry failure'
      );
    });
  });

  describe('safeExecute', () => {
    it('should return success true and result on success', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await safeExecute(fn, 'Error occurred');
      expect(result).toEqual({ success: true, result: 'ok' });
    });

    it('should return success false and error message on failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('boom'));
      const result = await safeExecute(fn, 'Operation failed');

      expect(result).toEqual({ success: false, error: 'boom' });
      expect(mockError).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'boom' }),
        'Operation failed'
      );
    });

    it('should handle non-Error objects thrown', async () => {
      const fn = vi.fn().mockRejectedValue('string error');
      const result = await safeExecute(fn, 'Operation failed');

      expect(result).toEqual({ success: false, error: 'string error' });
    });
  });

  describe('sleep', () => {
      it('should resolve after delay', async () => {
          const promise = sleep(1000);

          // Should not resolve yet
          let resolved = false;
          promise.then(() => { resolved = true; });

          await vi.advanceTimersByTimeAsync(500);
          expect(resolved).toBe(false);

          await vi.advanceTimersByTimeAsync(500);
          expect(resolved).toBe(true);
      });
  });
});
