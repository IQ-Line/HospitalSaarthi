import type { PartnerPrincipalGateway, PartnerPrincipalUser } from "../ports.js";
import { PartnerOrchestrationError } from "../domain/integration-errors.js";

export type HttpUserManagementPartnerGatewayConfig = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export class HttpUserManagementPartnerGateway implements PartnerPrincipalGateway {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpUserManagementPartnerGatewayConfig) {
    const trimmed = config.baseUrl?.trim();
    if (!trimmed) {
      throw new Error("HttpUserManagementPartnerGateway requires USER_MANAGEMENT_URL");
    }
    this.baseUrl = normalizeBaseUrl(trimmed);
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  static fromEnv(fetchImpl?: typeof fetch): HttpUserManagementPartnerGateway {
    return new HttpUserManagementPartnerGateway({
      baseUrl:
        process.env["USER_MANAGEMENT_URL"] ??
        process.env["USER_MANAGEMENT_SVC_URL"] ??
        "http://localhost:3005",
      fetchImpl,
    });
  }

  private headers(authorizationHeader: string, tenantId: string): Record<string, string> {
    return {
      Authorization: authorizationHeader,
      "Content-Type": "application/json",
      iq_tenant_id: tenantId,
    };
  }

  private async parseUserResponse(res: Response): Promise<PartnerPrincipalUser> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : `User Management returned ${res.status}`;
      throw new PartnerOrchestrationError(message);
    }
    const user = body as Record<string, unknown>;
    if (typeof user.id !== "string" || typeof user.full_name !== "string") {
      throw new PartnerOrchestrationError("Invalid partner principal response from User Management");
    }
    return {
      id: user.id,
      full_name: user.full_name,
      status: typeof user.status === "string" ? user.status : "active",
    };
  }

  async provision(input: {
    tenantId: string;
    integrationId: string;
    integrationDisplayName: string;
    capabilityKeys: string[];
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/user-management/partner-principals`, {
      method: "POST",
      headers: this.headers(input.authorizationHeader, input.tenantId),
      body: JSON.stringify({
        integration_id: input.integrationId,
        integration_display_name: input.integrationDisplayName,
        capability_keys: input.capabilityKeys,
      }),
    });
    return this.parseUserResponse(res);
  }

  async deactivate(input: {
    tenantId: string;
    integrationId: string;
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser | null> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/api/user-management/partner-principals/${encodeURIComponent(input.integrationId)}/deactivate`,
      {
        method: "POST",
        headers: this.headers(input.authorizationHeader, input.tenantId),
      },
    );
    if (res.status === 404) return null;
    return this.parseUserResponse(res);
  }

  async reactivate(input: {
    tenantId: string;
    integrationId: string;
    authorizationHeader: string;
  }): Promise<PartnerPrincipalUser | null> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/api/user-management/partner-principals/${encodeURIComponent(input.integrationId)}/reactivate`,
      {
        method: "POST",
        headers: this.headers(input.authorizationHeader, input.tenantId),
      },
    );
    if (res.status === 404) return null;
    return this.parseUserResponse(res);
  }
}
