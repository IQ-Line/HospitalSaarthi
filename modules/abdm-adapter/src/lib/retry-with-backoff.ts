import { AbdmGatewayError } from "./gateway-errors.js";
import { sleep } from "./sleep.js";

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialMs?: number;
    maxMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  let delayMs = options?.initialMs ?? 500;
  const maxMs = options?.maxMs ?? 4_000;
  const shouldRetry =
    options?.shouldRetry ??
    ((err: unknown) => {
      if (err instanceof AbdmGatewayError) {
        return err.statusCode >= 500;
      }
      return true;
    });
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!shouldRetry(e) || attempt >= maxAttempts) break;
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, maxMs);
    }
  }
  throw lastError;
}
