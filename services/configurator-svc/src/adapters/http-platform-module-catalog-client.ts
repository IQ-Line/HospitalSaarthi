import type { PlatformModuleCatalogPort } from "@hims/configurator";
import { stripTrailingSlashes } from "../lib/strip-trailing-slashes.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const INTERNAL_KEY_HEADER = "x-master-data-internal-key";

type CatalogRow = { id?: string; is_deleted?: boolean };

export type HttpPlatformModuleCatalogClientOptions = {
  baseUrl: string;
  internalApiKey: string;
  timeoutMs?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

/**
 * D3 hand-written HTTP adapter for Master Data's global module catalog.
 *
 * Calls the internal S2S route `GET /api/v1/master-data/internal/modules` (shared-secret gated) and
 * returns the set of VALID (non-deleted) module ids. Every call fetches authoritatively — there is
 * deliberately NO cache here: the configurator entitlement route already sits behind User
 * Management's per-tenant TTL cache, and its result drives a STICKY deactivation, so a stale cache
 * could permanently deactivate a not-yet-cached valid module. The proper cache (event-bust on
 * catalog change, not TTL-only) is deferred to Phase 5 with the event bridge; a plain fetch is the
 * correct, simplest behaviour until then.
 *
 * THROWS on a non-2xx or malformed response so a transient failure never masquerades as an empty
 * catalog. An empty `data: []` is returned as an empty set — a legitimately-empty catalog is a valid
 * state to REPRESENT; whether acting on an empty catalog is safe is the caller's decision (the
 * use-case refuses to mass-deactivate against an empty set).
 */
export class HttpPlatformModuleCatalogClient implements PlatformModuleCatalogPort {
  private readonly baseUrl: string;
  private readonly internalApiKey: string;
  private readonly timeoutMs: number;
  private readonly log?: HttpPlatformModuleCatalogClientOptions["log"];

  constructor(options: HttpPlatformModuleCatalogClientOptions) {
    this.baseUrl = stripTrailingSlashes(options.baseUrl);
    this.internalApiKey = options.internalApiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.log = options.log;
  }

  async listValidModuleIds(): Promise<Set<string>> {
    // Path is coupled to master-data's DEFAULT api_prefix (MASTER_DATA_API_PREFIX must stay
    // `/api/v1/master-data`); mirrors the sibling http-module-capability-resolver-adapter.
    const url = `${this.baseUrl}/api/v1/master-data/internal/modules`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        [INTERNAL_KEY_HEADER]: this.internalApiKey,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      this.log?.(
        { status: res.status, source: "master_data" },
        "Failed to fetch internal module catalog from Master Data",
      );
      throw new Error(`Master Data internal modules fetch failed: HTTP ${res.status}`);
    }

    const body = (await res.json()) as { data?: unknown };
    if (!Array.isArray(body.data)) {
      throw new Error("Master Data internal modules response missing `data` array");
    }

    const validIds = new Set<string>();
    for (const row of body.data as CatalogRow[]) {
      if (row && typeof row.id === "string" && row.is_deleted !== true) {
        validIds.add(row.id);
      }
    }
    return validIds;
  }
}
