import { ModuleEntitlementLookupError } from "@hims/user-management";
import type {
  ModuleEntitlementRequestContext,
  TenantModuleEntitlementPort,
} from "@hims/user-management";
import { BoundedTtlCache } from "./bounded-ttl-cache.js";
import {
  fetchJsonWithResilience,
  isBypassCache,
  type ClassifiedUpstreamError,
} from "./http-resilience.js";
import { stripTrailingSlashes } from "../lib/strip-trailing-slashes.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_ENTRIES = 256;
const TENANT_MODULE_IDS_CACHE_PREFIX = "tenant-module-ids:";

type TenantModuleRow = {
  module_id: string;
  is_active?: boolean;
};

type TenantModuleListResponse = {
  data?: TenantModuleRow[];
};

export type HttpConfiguratorTenantModuleEntitlementAdapterOptions = {
  baseUrl: string;
  timeoutMs?: number;
  maxAttempts?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

function tenantCacheKey(tenantId: string): string {
  return `${TENANT_MODULE_IDS_CACHE_PREFIX}${tenantId}`;
}

export class HttpConfiguratorTenantModuleEntitlementAdapter implements TenantModuleEntitlementPort {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly tenantModuleIdsCache: BoundedTtlCache<string[]>;
  private readonly log?: HttpConfiguratorTenantModuleEntitlementAdapterOptions["log"];

  constructor(options: HttpConfiguratorTenantModuleEntitlementAdapterOptions) {
    this.baseUrl = stripTrailingSlashes(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.tenantModuleIdsCache = new BoundedTtlCache<string[]>({
      ttlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
      maxEntries: options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      log: (event, message) =>
        options.log?.(
          { source: "configurator", cache: event.outcome, cacheKey: event.key },
          message,
        ),
    });
    this.log = options.log;
  }

  /** Drops cached tenant module ids (all tenants when `tenantId` omitted). */
  invalidateTenantModuleCache(tenantId?: string): void {
    if (tenantId === undefined) {
      this.tenantModuleIdsCache.invalidate();
      return;
    }
    this.tenantModuleIdsCache.invalidate(tenantCacheKey(tenantId));
  }

  async listTenantEnabledModuleIds(
    tenantId: string,
    context?: ModuleEntitlementRequestContext,
  ): Promise<string[]> {
    const cacheKey = tenantCacheKey(tenantId);
    if (!isBypassCache(context)) {
      const cached = this.tenantModuleIdsCache.get(cacheKey);
      if (cached !== undefined) {
        return [...cached];
      }
    }

    const url = `${this.baseUrl}/api/configurator/v1/tenants/${encodeURIComponent(tenantId)}/modules?is_active=true`;
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-tenant-id": tenantId,
    };
    if (context?.authorization) {
      headers.authorization = context.authorization;
    }

    try {
      const body = await fetchJsonWithResilience<TenantModuleListResponse>({
        url,
        headers,
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        source: "configurator",
        log: this.log,
      });

      const rows = Array.isArray(body.data) ? body.data : [];
      const moduleIds = rows
        .filter((row) => row.is_active !== false)
        .map((row) => row.module_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (!isBypassCache(context)) {
        this.tenantModuleIdsCache.set(cacheKey, moduleIds);
      }

      this.log?.(
        {
          tenantId,
          tenantEnabledModuleCount: moduleIds.length,
          source: "configurator",
          authorizationPresent: Boolean(context?.authorization),
          cachePolicy: context?.cachePolicy ?? "use-cache",
        },
        "Configurator tenant-enabled module ids resolved",
      );
      return moduleIds;
    } catch (err) {
      if (err instanceof ModuleEntitlementLookupError) {
        throw err;
      }
      const classified = err as ClassifiedUpstreamError;
      this.log?.(
        {
          tenantId,
          source: "configurator",
          authorizationPresent: Boolean(context?.authorization),
          upstreamKind: classified.kind,
          status: classified.status,
          err: classified.cause,
        },
        "Configurator tenant-enabled modules lookup failed",
      );
      throw new ModuleEntitlementLookupError("configurator", { cause: err });
    }
  }
}

/** @deprecated Use {@link HttpConfiguratorTenantModuleEntitlementAdapter}. */
export const HttpConfiguratorTenantModulesAdapter = HttpConfiguratorTenantModuleEntitlementAdapter;
