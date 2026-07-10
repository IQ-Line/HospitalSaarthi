import { normalizeTenantNumericCode } from "./compose.js";
import type { IdentifierOverrides } from "./types.js";

/**
 * Tenant sequence configuration — the numeric tenant code (UHID `TTTTT` segment) plus any custom
 * per-identifier format overrides. This is exactly what the old cross-schema SQL JOIN into
 * `configurator.tenants` + `configurator.sequence_configuration` returned; it is now fetched over
 * HTTP from configurator's own internal route so no consumer touches configurator's schema.
 */
export interface TenantSequenceConfig {
  tenantNumericCode: string;
  identifierOverrides: IdentifierOverrides;
}

export type SequenceConfigLoader = (tenantId: string) => Promise<TenantSequenceConfig>;

export interface HttpSequenceConfigLoaderOptions {
  /** Configurator service origin, e.g. `http://localhost:3001`. */
  configuratorBaseUrl: string;
  /**
   * Value of `CONFIGURATOR_INTERNAL_API_KEY`; sent as `x-configurator-internal-key`.
   * Empty/omitted ⇒ header not sent (configurator skips the gate in non-production dev).
   */
  internalApiKey?: string;
  /**
   * Numeric tenant code used when configurator is unreachable or omits it.
   * Preserves the pre-existing env-fallback behaviour (default "00001").
   */
  fallbackTenantNumericCode?: string;
  /** Cache freshness window. Default 60_000 ms. */
  ttlMs?: number;
  /** Max distinct tenants cached (FIFO eviction). Default 1024. */
  maxEntries?: number;
  /** Per-request timeout. Default 5_000 ms. */
  timeoutMs?: number;
  warn?: (detail: Record<string, unknown>, message: string) => void;
}

type CacheEntry = { value: TenantSequenceConfig; expiresAt: number };

/** Strip trailing slashes without a backtracking-prone regex (sonarjs/slow-regex). */
function stripTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end -= 1;
  return url.slice(0, end);
}

/**
 * HTTP-backed sequence-config loader with a bounded in-memory TTL cache.
 *
 * Built once at service boot (composition layer) and passed into the allocation path, keeping the
 * core `allocateIdentifier`/`nextSequenceValue` primitives free of any HTTP/SQL. On a fetch/parse
 * failure it DEGRADES to platform defaults (fallback numeric code + no custom overrides) and warns
 * — mirroring the existing configurator gateways — rather than failing allocation. Only successful
 * responses are cached, so a transient outage never sticks a degraded value.
 */
export function createHttpSequenceConfigLoader(
  options: HttpSequenceConfigLoaderOptions,
): SequenceConfigLoader {
  const base = stripTrailingSlashes(options.configuratorBaseUrl);
  const internalApiKey = options.internalApiKey?.trim() ?? "";
  const fallbackNumeric = normalizeTenantNumericCode(options.fallbackTenantNumericCode ?? null);
  const ttlMs = options.ttlMs ?? 60_000;
  const maxEntries = options.maxEntries ?? 1024;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const warn = options.warn;

  const cache = new Map<string, CacheEntry>();

  const degrade = (
    tenantId: string,
    reason: string,
    detail: Record<string, unknown> = {},
  ): null => {
    warn?.(
      { tenantId, reason, ...detail },
      "configurator sequence-config unavailable; using platform defaults",
    );
    return null;
  };

  const fallbackConfig = (): TenantSequenceConfig => ({
    tenantNumericCode: fallbackNumeric,
    identifierOverrides: {},
  });

  // Returns the fetched+parsed config, or null (already warned) on any failure —
  // null means "degrade to platform defaults and DON'T cache" so a transient
  // outage never sticks.
  const fetchConfig = async (tenantId: string): Promise<TenantSequenceConfig | null> => {
    const url = `${base}/api/configurator/v1/internal/tenants/${encodeURIComponent(
      tenantId,
    )}/sequence-config`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(internalApiKey ? { "x-configurator-internal-key": internalApiKey } : {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      return degrade(tenantId, "fetch_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!res.ok) return degrade(tenantId, "non_ok_status", { status: res.status });

    let body: { tenant_numeric_code?: unknown; identifier_overrides?: unknown };
    try {
      body = (await res.json()) as typeof body;
    } catch (err) {
      return degrade(tenantId, "parse_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const rawCode = body.tenant_numeric_code;
    return {
      tenantNumericCode:
        rawCode == null || String(rawCode).trim() === ""
          ? fallbackNumeric
          : normalizeTenantNumericCode(String(rawCode)),
      identifierOverrides: (body.identifier_overrides ?? {}) as IdentifierOverrides,
    };
  };

  const evictOldestIfFull = (tenantId: string): void => {
    if (cache.size >= maxEntries && !cache.has(tenantId)) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  };

  return async function loadSequenceConfig(tenantId: string): Promise<TenantSequenceConfig> {
    const now = Date.now();
    const cached = cache.get(tenantId);
    if (cached && now < cached.expiresAt) return cached.value;
    if (cached) cache.delete(tenantId);

    const value = await fetchConfig(tenantId);
    if (!value) return fallbackConfig();

    evictOldestIfFull(tenantId);
    cache.set(tenantId, { value, expiresAt: now + ttlMs });
    return value;
  };
}
