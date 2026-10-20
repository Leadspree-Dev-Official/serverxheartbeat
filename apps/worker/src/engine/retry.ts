/**
 * Retry utility with exponential backoff and jitter
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
  shouldRetry: (error: any, result?: T) => boolean
): Promise<{ result?: T; error?: any; attempts: number }> {
  const {
    maxRetries = 2,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffFactor = 2,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      const result = await operation(attempt);
      if (!shouldRetry(null, result) || attempt >= maxRetries) {
        return { result, attempts: attempt };
      }
    } catch (err) {
      if (!shouldRetry(err) || attempt >= maxRetries) {
        return { error: err, attempts: attempt };
      }
    }

    attempt++;
    // Add 10-20% jitter
    const jitter = Math.random() * 0.2 * delay;
    const waitTime = Math.min(delay + jitter, maxDelayMs);
    await sleep(waitTime);
    delay *= backoffFactor;
  }
}
