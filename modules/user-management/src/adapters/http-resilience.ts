export type UpstreamSource = "configurator" | "master_data";

export type UpstreamFailureKind =
  | "timeout"
  | "transient_http"
  | "client_http"
  | "malformed_payload"
  | "network";

export type ClassifiedUpstreamError = {
  source: UpstreamSource;
  kind: UpstreamFailureKind;
  status?: number;
  cause?: unknown;
};

const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);

export function isBypassCache(context?: { cachePolicy?: string }): boolean {
  return context?.cachePolicy === "bypass-cache";
}

export function classifyUpstreamFailure(
  source: UpstreamSource,
  err: unknown,
  status?: number,
): ClassifiedUpstreamError {
  if (err instanceof Error && err.name === "TimeoutError") {
    return { source, kind: "timeout", cause: err };
  }
  if (typeof status === "number") {
    if (TRANSIENT_HTTP_STATUSES.has(status)) {
      return { source, kind: "transient_http", status, cause: err };
    }
    if (status >= 400 && status < 500) {
      return { source, kind: "client_http", status, cause: err };
    }
    if (status >= 500) {
      return { source, kind: "transient_http", status, cause: err };
    }
  }
  if (err instanceof SyntaxError) {
    return { source, kind: "malformed_payload", cause: err };
  }
  return { source, kind: "network", cause: err };
}

export function isRetryableUpstreamFailure(failure: ClassifiedUpstreamError): boolean {
  return (
    failure.kind === "timeout" ||
    failure.kind === "network" ||
    failure.kind === "transient_http"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type FetchJsonWithResilienceOptions = {
  url: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  maxAttempts: number;
  source: UpstreamSource;
  log?: (event: Record<string, unknown>, message: string) => void;
};

function isClassifiedUpstreamError(err: unknown): err is ClassifiedUpstreamError {
  return (
    typeof err === "object" && err !== null && "source" in err && "kind" in err
  );
}

type AttemptOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; failure: ClassifiedUpstreamError; retryable: boolean };

/**
 * Performs a single HTTP round-trip and classifies any failure. Failures are
 * returned (never thrown) so the retry loop has one uniform decision point.
 * `retryable` is only true for non-2xx responses whose classification is
 * retryable — JSON parse failures and request-level errors are reported with
 * `retryable: false`, matching the original throw-immediately behaviour.
 */
async function attemptFetchJson<T>(
  options: FetchJsonWithResilienceOptions,
  attempt: number,
  maxAttempts: number,
): Promise<AttemptOutcome<T>> {
  try {
    const response = await fetch(options.url, {
      method: "GET",
      headers: options.headers,
      signal: AbortSignal.timeout(options.timeoutMs),
    });

    if (!response.ok) {
      const failure = classifyUpstreamFailure(options.source, undefined, response.status);
      options.log?.(
        {
          source: options.source,
          attempt,
          maxAttempts,
          status: response.status,
          kind: failure.kind,
        },
        "Upstream HTTP request failed",
      );
      return { ok: false, failure, retryable: isRetryableUpstreamFailure(failure) };
    }

    try {
      return { ok: true, value: (await response.json()) as T };
    } catch (err) {
      const failure = classifyUpstreamFailure(options.source, err);
      options.log?.(
        { source: options.source, attempt, maxAttempts, kind: failure.kind, err },
        "Upstream JSON parse failed",
      );
      return { ok: false, failure, retryable: false };
    }
  } catch (err) {
    if (isClassifiedUpstreamError(err)) {
      return { ok: false, failure: err, retryable: false };
    }
    const failure = classifyUpstreamFailure(options.source, err);
    options.log?.(
      { source: options.source, attempt, maxAttempts, kind: failure.kind, err },
      "Upstream HTTP request error",
    );
    return { ok: false, failure, retryable: isRetryableUpstreamFailure(failure) };
  }
}

export async function fetchJsonWithResilience<T>(
  options: FetchJsonWithResilienceOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts);
  let lastFailure: ClassifiedUpstreamError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const outcome = await attemptFetchJson<T>(options, attempt, maxAttempts);
    if (outcome.ok) {
      return outcome.value;
    }
    lastFailure = outcome.failure;
    if (outcome.retryable && attempt < maxAttempts) {
      await sleep(50 * attempt);
      continue;
    }
    throw outcome.failure;
  }

  throw lastFailure ?? classifyUpstreamFailure(options.source, new Error("exhausted_retries"));
}
