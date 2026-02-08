import { createChildLogger } from './logger';

const log = createChildLogger('retry-helper');

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  operationName?: string;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 2000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxAttempts) {
        log.warn(
          { attempt, maxAttempts: opts.maxAttempts, operation: opts.operationName, error: lastError.message },
          `${opts.operationName || 'Operation'} failed, retrying...`
        );

        if (opts.onRetry) {
          opts.onRetry(attempt, lastError);
        }

        await sleep(opts.delayMs);
      }
    }
  }

  log.error({ error: lastError?.message }, 'All retry attempts failed');
  throw lastError;
}

export async function withRetryOrDefault<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  try {
    return await withRetry(fn, options);
  } catch (error) {
    log.warn({ error: (error as Error).message }, 'Using default value after retry failure');
    return defaultValue;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMsg }, errorMessage);
    return { success: false, error: errorMsg };
  }
}
