import type { ModuleCapabilityResolverPort } from "@hims/configurator";

const DEFAULT_TIMEOUT_MS = 30_000;

type CapabilityRow = {
  id: string;
  module?: string | null;
  is_active?: boolean;
};

type ModuleRow = {
  id: string;
  slug: string;
};

export type HttpModuleCapabilityResolverAdapterOptions = {
  userManagementBaseUrl: string;
  masterDataBaseUrl: string;
  authorization?: string;
  timeoutMs?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

export class HttpModuleCapabilityResolverAdapter
  implements ModuleCapabilityResolverPort
{
  private readonly umBaseUrl: string;
  private readonly mdBaseUrl: string;
  private readonly authorization?: string;
  private readonly timeoutMs: number;
  private readonly log?: HttpModuleCapabilityResolverAdapterOptions["log"];

  constructor(options: HttpModuleCapabilityResolverAdapterOptions) {
    this.umBaseUrl = options.userManagementBaseUrl.replace(/\/+$/, "");
    this.mdBaseUrl = options.masterDataBaseUrl.replace(/\/+$/, "");
    this.authorization = options.authorization;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.log = options.log;
  }

  async resolveCapabilityIdsForModules(
    moduleIds: string[],
    tenantId?: string,
  ): Promise<string[]> {
    if (moduleIds.length === 0) return [];

    if (tenantId) {
      return this.fetchAssignableCapabilities(tenantId);
    }

    const moduleSlugs = await this.resolveModuleSlugsFromIds(moduleIds);
    if (moduleSlugs.size === 0) return [];

    const slugSet = new Set<string>();
    for (const slug of moduleSlugs.values()) {
      slugSet.add(slug);
    }

    const capabilities = await this.fetchAllCapabilities();

    return capabilities
      .filter(
        (c) =>
          c.is_active !== false &&
          c.module != null &&
          slugSet.has(c.module.trim().toLowerCase()),
      )
      .map((c) => c.id);
  }

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = { accept: "application/json" };
    if (this.authorization) h.authorization = this.authorization;
    return h;
  }

  private async resolveModuleSlugsFromIds(
    moduleIds: string[],
  ): Promise<Map<string, string>> {
    const url = `${this.mdBaseUrl}/api/v1/master-data/modules`;
    const res = await fetch(url, {
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      this.log?.(
        { status: res.status, source: "master_data" },
        "Failed to fetch modules for capability resolution",
      );
      throw new Error(
        `Master Data modules fetch failed: HTTP ${res.status}`,
      );
    }

    const body = (await res.json()) as { data?: ModuleRow[] };
    const rows = Array.isArray(body.data) ? body.data : [];

    const idSet = new Set(moduleIds);
    const slugById = new Map<string, string>();
    for (const row of rows) {
      if (idSet.has(row.id)) {
        slugById.set(row.id, row.slug.trim().toLowerCase());
      }
    }

    this.log?.(
      {
        requestedModuleCount: moduleIds.length,
        resolvedSlugCount: slugById.size,
      },
      "Resolved module IDs to slugs for capability resolution",
    );

    return slugById;
  }

  private async fetchAssignableCapabilities(tenantId: string): Promise<string[]> {
    const url = `${this.umBaseUrl}/api/user-management/capabilities/assignable`;
    const headers: Record<string, string> = {
      accept: "application/json",
      iq_tenant_id: tenantId,
    };
    if (this.authorization) headers.authorization = this.authorization;

    this.log?.(
      { url, tenantId },
      "Fetching assignable capabilities for tenant from user-management",
    );

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      this.log?.(
        { status: res.status, source: "user_management", errorBody, tenantId },
        "Failed to fetch assignable capabilities",
      );
      throw new Error(
        `User Management assignable capabilities fetch failed: HTTP ${res.status} — ${errorBody}`,
      );
    }

    const body = (await res.json()) as CapabilityRow[] | { data?: CapabilityRow[] };
    const rows = Array.isArray(body) ? body : (body.data ?? []);
    const ids = rows.filter((c) => c.is_active !== false).map((c) => c.id);

    this.log?.(
      { tenantId, assignableCount: ids.length },
      "Resolved assignable capabilities for tenant",
    );

    return ids;
  }

  private async fetchAllCapabilities(): Promise<CapabilityRow[]> {
    const url = `${this.umBaseUrl}/api/user-management/capabilities`;
    const headers = this.buildHeaders();
    this.log?.(
      { url, hasAuth: !!this.authorization, authPrefix: this.authorization?.slice(0, 12) },
      "Fetching capabilities from user-management",
    );
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      this.log?.(
        { status: res.status, source: "user_management", errorBody },
        "Failed to fetch capabilities for module resolution",
      );
      throw new Error(
        `User Management capabilities fetch failed: HTTP ${res.status} — ${errorBody}`,
      );
    }

    const body = (await res.json()) as
      | CapabilityRow[]
      | { data?: CapabilityRow[] };
    return Array.isArray(body) ? body : (body.data ?? []);
  }
}
