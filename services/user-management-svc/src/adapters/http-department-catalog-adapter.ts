import type {
  DepartmentCatalogPort,
  DepartmentCatalogRequestContext,
} from "@hims/user-management";
import {
  fetchJsonWithResilience,
  type ClassifiedUpstreamError,
} from "./http-resilience.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;

type DepartmentSingleResponse = {
  data?: {
    id: string;
    name: string;
  };
};

export type HttpDepartmentCatalogAdapterOptions = {
  baseUrl: string;
  timeoutMs?: number;
  maxAttempts?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export class HttpDepartmentCatalogAdapter implements DepartmentCatalogPort {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly log?: HttpDepartmentCatalogAdapterOptions["log"];

  constructor(options: HttpDepartmentCatalogAdapterOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.log = options.log;
  }

  async resolveDepartmentName(
    departmentId: string,
    context: DepartmentCatalogRequestContext,
  ): Promise<string | null> {
    const trimmedId = departmentId.trim();
    if (!trimmedId) return null;

    const headers: Record<string, string> = {
      Accept: "application/json",
      iq_tenant_id: context.iqTenantId,
    };
    if (context.authorization) {
      headers.Authorization = context.authorization;
    }

    try {
      const payload = await fetchJsonWithResilience<DepartmentSingleResponse>({
        url: `${this.baseUrl}/api/v1/master-data/departments/${encodeURIComponent(trimmedId)}`,
        headers,
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        source: "master_data",
        log: this.log,
      });
      const name = payload.data?.name?.trim();
      return name || null;
    } catch (err) {
      const failure = err as ClassifiedUpstreamError;
      if (failure.kind === "client_http" && failure.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
