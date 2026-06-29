/** The principal fields the cutoff needs — a structural subset of `Principal`. */
export type ActiveStatusSubject = { userId: string; tenantId: string };

/** Minimal subset of the Fastify logger this module uses (so tests can stub it). */
type Logger = {
  warn: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
};

export interface ActiveStatusCheckerOptions {
  /** Base origin of user-management (same `USER_MANAGEMENT_URL` the proxy uses). */
  userManagementUrl: string;
  /** Shared S2S secret sent as `x-um-internal-key` (the UM `UM_INTERNAL_API_KEY`). */
  internalApiKey: string;
  /** How long a verdict is trusted before re-checking UM. Default 30s. */
  ttlMs?: number;
  /** Per-call timeout for the UM request. Default 2s. */
  timeoutMs?: number;
  /** Upper bound on cached entries (gateway memory safety). Default 10_000. */
  maxEntries?: number;
  /** Injectable clock (ms). Default `Date.now`. */
  now?: () => number;
  /** Injectable fetch (for tests). Default global `fetch`. Typed as the call signature
   *  this module uses, so a plain test stub need not reproduce `fetch`'s extra props. */
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
  log?: Logger;
}

/** Resolves whether the verified principal may currently operate. */
export type ActiveStatusChecker = (subject: ActiveStatusSubject) => Promise<boolean>;

type CacheEntry = { active: boolean; expiresAt: number };

/** Strip trailing slashes without a backtracking-prone regex (sonarjs/slow-regex). */
function stripTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 0 && s.charCodeAt(end - 1) === 47 /* '/' */) end--;
  return s.slice(0, end);
}

/**
 * Edge ban/revocation cutoff (D13, consumer half). Calls the UM internal active-status
 * endpoint (`GET /api/user-management/internal/users/:id/active?tenant_id=`) to catch
 * users deactivated or banned AFTER their access token was issued, within the token's
 * remaining TTL — bounded further to `ttlMs` by the per-user cache.
 *
 * Fails OPEN by design: any UM error (non-200, unreachable, timeout, malformed body)
 * ALLOWS the request. The degraded mode is exactly the status quo — stale access bounded
 * to the token's own lifetime — and a banned user still cannot obtain a FRESH token
 * (login rejects banned accounts). Failing closed would instead make UM a hard
 * per-request dependency for ALL authenticated traffic: a worse, newly-introduced
 * availability hole. Only a well-formed `{ active: false }` denies. Fail-open verdicts
 * are NOT cached, so recovery is immediate once UM is healthy again.
 */
export function createActiveStatusChecker(
  opts: ActiveStatusCheckerOptions,
): ActiveStatusChecker {
  const ttlMs = opts.ttlMs ?? 30_000;
  const timeoutMs = opts.timeoutMs ?? 2_000;
  const maxEntries = opts.maxEntries ?? 10_000;
  const now = opts.now ?? Date.now;
  const doFetch = opts.fetchImpl ?? fetch;
  const base = stripTrailingSlashes(opts.userManagementUrl);
  const cache = new Map<string, CacheEntry>();

  function remember(userId: string, active: boolean, t: number): void {
    // Bound memory: on a NEW key at the cap, evict the oldest-inserted (FIFO). No
    // expiry sweep — stale entries are never served (the TTL check on read handles
    // that) and are bounded by `maxEntries`, so eviction stays O(1).
    if (cache.size >= maxEntries && !cache.has(userId)) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(userId, { active, expiresAt: t + ttlMs });
  }

  return async function isActive(subject: ActiveStatusSubject): Promise<boolean> {
    const userId = subject.userId;
    const t = now();
    const cached = cache.get(userId);
    if (cached !== undefined && cached.expiresAt > t) {
      return cached.active;
    }

    const url =
      `${base}/api/user-management/internal/users/${encodeURIComponent(userId)}` +
      `/active?tenant_id=${encodeURIComponent(subject.tenantId)}`;
    try {
      const res = await doFetch(url, {
        headers: { 'x-um-internal-key': opts.internalApiKey },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const detail = { status: res.status, userId };
        if (res.status === 401 || res.status === 403) {
          // A rejected S2S key is a MISCONFIGURATION, not a transient blip: it silently
          // disables the cutoff platform-wide. Log at error so a botched key rotation is
          // loud (startup logged the cutoff as ENABLED — only the key's presence is checked).
          opts.log?.error(
            detail,
            'edge ban-check: user-management REJECTED the S2S key (cutoff INEFFECTIVE — check UM_INTERNAL_API_KEY); failing open',
          );
        } else {
          opts.log?.warn(
            detail,
            'edge ban-check: user-management returned non-200; failing open',
          );
        }
        return true; // fail open, do not cache
      }
      const body = (await res.json()) as { active?: unknown };
      if (typeof body.active !== 'boolean') {
        opts.log?.warn(
          { userId },
          'edge ban-check: unexpected active-status body shape; failing open',
        );
        return true; // fail open, do not cache
      }
      remember(userId, body.active, t);
      return body.active;
    } catch (err) {
      opts.log?.warn(
        { err, userId },
        'edge ban-check: user-management unreachable/timed out; failing open',
      );
      return true; // fail open, do not cache
    }
  };
}
