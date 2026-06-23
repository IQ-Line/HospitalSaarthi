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

function isClassifiedUpstreamError(err: unknown): err is ClassifiedUpstreamError {
  return (
    typeof err === "object" && err !== null && "source" in err && "kind" in err
  );
}

function backoffDelayMs(attempt: number): number {
  return 50 * attempt;
}

function shouldRetry(
  failure: ClassifiedUpstreamError,
  attempt: number,
  maxAttempts: number,
): boolean {
  return isRetryableUpstreamFailure(failure) && attempt < maxAttempts;
}

export type FetchJsonWithResilienceOptions = {
  url: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  maxAttempts: number;
  source: UpstreamSource;
  log?: (event: Record<string, unknown>, message: string) => void;
};

type AttemptContext = {
  options: FetchJsonWithResilienceOptions;
  attempt: number;
  maxAttempts: number;
};

/**
 * Runs a single fetch attempt, logging and classifying any HTTP-status or
 * JSON-parse failure. Returns the parsed body on success; throws an
 * already-classified {@link ClassifiedUpstreamError} on failure (a
 * non-ok status or an unparseable body). Transport-level errors (the `fetch`
 * call itself rejecting) propagate as their raw value for the caller to
 * classify, since only the caller has the full attempt context for the
 * "request error" log line.
 */
async function performAttempt<T>(ctx: AttemptContext): Promise<T> {
  const { options, attempt, maxAttempts } = ctx;
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
    throw failure;
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    const failure = classifyUpstreamFailure(options.source, err);
    options.log?.(
      { source: options.source, attempt, maxAttempts, kind: failure.kind, err },
      "Upstream JSON parse failed",
    );
    throw failure;
  }
}

/**
 * Normalizes a thrown attempt error into a classified failure. Errors already
 * classified by {@link performAttempt} pass through untouched; raw transport
 * errors are classified and logged here as a "request error".
 */
function classifyAttemptError(ctx: AttemptContext, err: unknown): ClassifiedUpstreamError {
  if (isClassifiedUpstreamError(err)) {
    return err;
  }
  const { options, attempt, maxAttempts } = ctx;
  const failure = classifyUpstreamFailure(options.source, err);
  options.log?.(
    { source: options.source, attempt, maxAttempts, kind: failure.kind, err },
    "Upstream HTTP request error",
  );
  return failure;
}

export async function fetchJsonWithResilience<T>(
  options: FetchJsonWithResilienceOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts);
  let lastFailure: ClassifiedUpstreamError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const ctx: AttemptContext = { options, attempt, maxAttempts };
    let failure: ClassifiedUpstreamError;
    try {
      return await performAttempt<T>(ctx);
    } catch (err) {
      failure = classifyAttemptError(ctx, err);
    }

    lastFailure = failure;
    if (shouldRetry(failure, attempt, maxAttempts)) {
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    throw failure;
  }

  throw lastFailure ?? classifyUpstreamFailure(options.source, new Error("exhausted_retries"));
}
