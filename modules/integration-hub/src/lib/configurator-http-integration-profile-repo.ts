import { mapConfiguratorProfileRow } from "./build-abdm-deps.js";
import type { TenantIntegrationProfile } from "./integration-context.js";
import type { IntegrationProfileRepo } from "./integration-profile-repo.js";

const INTERNAL_KEY_HEADER = "x-configurator-internal-key";

export interface ConfiguratorHttpIntegrationProfileRepoConfig {
  baseUrl: string;
  internalApiKey?: string;
  fetchImpl?: typeof fetch;
}

function normalizeBaseUrl(url: string): string {
  // eslint-disable-next-line sonarjs/slow-regex -- single bounded quantifier anchored at end; not ReDoS
  return url.replace(/\/+$/, "");
}

export class ConfiguratorHttpIntegrationProfileRepo implements IntegrationProfileRepo {
  private readonly baseUrl: string;
  private readonly internalApiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ConfiguratorHttpIntegrationProfileRepoConfig) {
    const trimmed = config.baseUrl?.trim();
    if (!trimmed) {
      throw new Error("ConfiguratorHttpIntegrationProfileRepo requires CONFIGURATOR_URL");
    }
    this.baseUrl = normalizeBaseUrl(trimmed);
    this.internalApiKey = config.internalApiKey?.trim() || undefined;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  static fromEnv(fetchImpl?: typeof fetch): ConfiguratorHttpIntegrationProfileRepo {
    return new ConfiguratorHttpIntegrationProfileRepo({
      baseUrl: process.env["CONFIGURATOR_URL"] ?? "",
      internalApiKey: process.env["CONFIGURATOR_INTERNAL_API_KEY"],
      fetchImpl,
    });
  }

  async findActiveByTenantId(iqTenantId: string): Promise<TenantIntegrationProfile | undefined> {
    const url = new URL(
      `${this.baseUrl}/api/configurator/v1/integration-profiles/by-tenant/${encodeURIComponent(iqTenantId)}`,
    );
    url.searchParams.set("integration_kind", "abdm");

    const headers: Record<string, string> = {};
    if (this.internalApiKey) {
      headers[INTERNAL_KEY_HEADER] = this.internalApiKey;
    }

    const res = await this.fetchImpl(url.toString(), { method: "GET", headers });
    if (res.status === 404) return undefined;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = body ? ` ${body}` : "";
      throw new Error(
        `configurator by-tenant profile lookup failed: ${res.status}${detail}`,
      );
    }

    const row = (await res.json()) as Record<string, unknown>;
    return mapConfiguratorProfileRow(row);
  }

  async findActiveByHipId(hipId: string): Promise<TenantIntegrationProfile | undefined> {
    const url = `${this.baseUrl}/api/configurator/v1/integration-profiles/by-hip/${encodeURIComponent(hipId)}`;
    const headers: Record<string, string> = {};
    if (this.internalApiKey) {
      headers[INTERNAL_KEY_HEADER] = this.internalApiKey;
    }

    const res = await this.fetchImpl(url, { method: "GET", headers });
    if (res.status === 404) return undefined;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = body ? ` ${body}` : "";
      throw new Error(
        `configurator by-hip profile lookup failed: ${res.status}${detail}`,
      );
    }

    const row = (await res.json()) as Record<string, unknown>;
    return mapConfiguratorProfileRow(row);
  }
}
