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

/**
 * The edge verdict for a verified principal, from a single cached UM read:
 *  - `active`             — false ⇒ banned/deactivated after token issue (401 USER_INACTIVE).
 *  - `mustChangePassword` — true  ⇒ an admin reset the password; the edge restricts the
 *                           principal to the password-change path (403 PASSWORD_CHANGE_REQUIRED).
 */
export type PrincipalStatusVerdict = { active: boolean; mustChangePassword: boolean };

/** Resolves the current operational verdict for the verified principal. */
export type PrincipalStatusChecker = (
  subject: ActiveStatusSubject,
) => Promise<PrincipalStatusVerdict>;

type CacheEntry = PrincipalStatusVerdict & { expiresAt: number };

/** Fail-open / default verdict: allow, and do not force a password change. Never cached. */
const ALLOW: PrincipalStatusVerdict = { active: true, mustChangePassword: false };

/** Strip trailing slashes without a backtracking-prone regex (sonarjs/slow-regex). */
function stripTrailingSlashes(s: string): string {
  let end = s.length;
  while (end > 0 && s.charCodeAt(end - 1) === 47 /* '/' */) end--;
  return s.slice(0, end);
}

/**
 * Edge status cutoff (D13, consumer half). Calls the UM internal status endpoint
 * (`GET /api/user-management/internal/users/:id/active?tenant_id=`) to resolve, from a
 * single cached read, whether a verified principal (a) was deactivated/banned AFTER its
 * access token was issued and (b) must change its password (an admin reset sets the flag
 * AND revokes sessions, but the self-contained access JWT stays valid until expiry — so
 * the flag can only be read authoritatively from UM, never from the stale token claim).
 * Both signals are caught within the token's remaining TTL, bounded further to `ttlMs`.
 *
 * Fails OPEN by design: any UM error (non-200, unreachable, timeout, malformed body)
 * returns {@link ALLOW}. The degraded mode is exactly the status quo — stale access
 * bounded to the token's own lifetime — and a banned user still cannot obtain a FRESH
 * token (login rejects banned accounts). Failing closed would instead make UM a hard
 * per-request dependency for ALL authenticated traffic: a worse, newly-introduced
 * availability hole. Only a well-formed `{ active: false }` denies.
 *
 * Caching: a verdict is cached ONLY when `mustChangePassword === false`. A must-change
 * verdict is deliberately NOT cached — the principal is expected to clear the flag
 * imminently (via the password-change path), and caching `true` would keep blocking them
 * for up to `ttlMs` AFTER they succeed. Re-reading each request for the (rare) flagged
 * principal costs nothing meaningful — they cannot do anything else until it clears — and
 * makes the unblock immediate. Fail-open verdicts are likewise never cached.
 *
 * A missing/non-boolean `must_change_password` in the body degrades to `false` (no forced
 * change) — backward-compatible with a UM that predates the field, and safe (fail-open for
 * the new gate). Only `active` must be a boolean, else the whole verdict fails open.
 */
export function createActiveStatusChecker(
  opts: ActiveStatusCheckerOptions,
): PrincipalStatusChecker {
  const ttlMs = opts.ttlMs ?? 30_000;
  const timeoutMs = opts.timeoutMs ?? 2_000;
  const maxEntries = opts.maxEntries ?? 10_000;
  const now = opts.now ?? Date.now;
  const doFetch = opts.fetchImpl ?? fetch;
  const base = stripTrailingSlashes(opts.userManagementUrl);
  const cache = new Map<string, CacheEntry>();

  function remember(userId: string, verdict: PrincipalStatusVerdict, t: number): void {
    // Only cache a settled, unflagged verdict. A must-change verdict is left uncached so
    // the principal unblocks immediately once they clear the flag (see the doc above).
    if (verdict.mustChangePassword) return;
    // Bound memory: on a NEW key at the cap, evict the oldest-inserted (FIFO). No
    // expiry sweep — stale entries are never served (the TTL check on read handles
    // that) and are bounded by `maxEntries`, so eviction stays O(1).
    if (cache.size >= maxEntries && !cache.has(userId)) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(userId, { ...verdict, expiresAt: t + ttlMs });
  }

  return async function check(subject: ActiveStatusSubject): Promise<PrincipalStatusVerdict> {
    const userId = subject.userId;
    const t = now();
    const cached = cache.get(userId);
    if (cached !== undefined && cached.expiresAt > t) {
      return { active: cached.active, mustChangePassword: cached.mustChangePassword };
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
            'edge status-check: user-management REJECTED the S2S key (cutoff INEFFECTIVE — check UM_INTERNAL_API_KEY); failing open',
          );
        } else {
          opts.log?.warn(
            detail,
            'edge status-check: user-management returned non-200; failing open',
          );
        }
        return ALLOW; // fail open, do not cache
      }
      const body = (await res.json()) as { active?: unknown; must_change_password?: unknown };
      if (typeof body.active !== 'boolean') {
        opts.log?.warn(
          { userId },
          'edge status-check: unexpected status body shape; failing open',
        );
        return ALLOW; // fail open, do not cache
      }
      // A missing/non-boolean flag degrades to false (backward-compatible + safe).
      const verdict: PrincipalStatusVerdict = {
        active: body.active,
        mustChangePassword: body.must_change_password === true,
      };
      remember(userId, verdict, t);
      return verdict;
    } catch (err) {
      opts.log?.warn(
        { err, userId },
        'edge status-check: user-management unreachable/timed out; failing open',
      );
      return ALLOW; // fail open, do not cache
    }
  };
}
