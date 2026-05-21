import { sleep } from "./sleep.js";

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; initialMs?: number; maxMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  let delayMs = options?.initialMs ?? 500;
  const maxMs = options?.maxMs ?? 4_000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt >= maxAttempts) break;
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, maxMs);
    }
  }
  throw lastError;
}
