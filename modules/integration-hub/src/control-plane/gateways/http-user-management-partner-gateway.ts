import { PartnerOrchestrationError } from "../domain/errors.js";
import type {
  ProvisionPartnerPrincipalResult,
  UserManagementPartnerGateway,
} from "../ports.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function isPartnerPrincipalBody(value: unknown): value is ProvisionPartnerPrincipalResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.full_name === "string" &&
    row.kind === "partner" &&
    typeof row.integration_id === "string" &&
    typeof row.status === "string"
  );
}

export class HttpUserManagementPartnerGateway implements UserManagementPartnerGateway {
  constructor(private readonly userManagementOrigin: string) {}

  private headers(tenantId: string, authorization: string): Record<string, string> {
    return {
      iq_tenant_id: tenantId,
      "Content-Type": "application/json",
      Authorization: authorization,
    };
  }

  private async parseOrThrow(
    integrationId: string,
    res: Response,
  ): Promise<unknown> {
    const text = await res.text();
    let body: unknown = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      throw new PartnerOrchestrationError(
        integrationId,
        res.status,
        body,
        `User Management returned ${res.status}`,
      );
    }
    return body;
  }

  async provisionPartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    input: {
      integration_id: string;
      integration_display_name: string;
      suggested_capability_keys: string[];
    },
  ): Promise<ProvisionPartnerPrincipalResult> {
    const url = joinUrl(
      this.userManagementOrigin,
      "/api/user-management/partner-principals",
    );
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(ctx.tenantId, ctx.authorization),
      body: JSON.stringify({
        integration_id: input.integration_id,
        integration_display_name: input.integration_display_name,
        suggested_capability_keys: input.suggested_capability_keys,
      }),
    });
    const body = await this.parseOrThrow(input.integration_id, res);
    if (!isPartnerPrincipalBody(body)) {
      throw new PartnerOrchestrationError(
        input.integration_id,
        res.status,
        body,
        "User Management provision response is not a partner principal",
      );
    }
    return body;
  }

  async deactivatePartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    integrationId: string,
  ): Promise<ProvisionPartnerPrincipalResult | null> {
    const url = joinUrl(
      this.userManagementOrigin,
      `/api/user-management/partner-principals/${integrationId}/deactivate`,
    );
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(ctx.tenantId, ctx.authorization),
    });
    if (res.status === 404) {
      return null;
    }
    const body = await this.parseOrThrow(integrationId, res);
    if (!isPartnerPrincipalBody(body)) {
      throw new PartnerOrchestrationError(
        integrationId,
        res.status,
        body,
        "User Management deactivate response is not a partner principal",
      );
    }
    return body;
  }

  async reactivatePartnerPrincipal(
    ctx: { tenantId: string; authorization: string },
    integrationId: string,
  ): Promise<ProvisionPartnerPrincipalResult | null> {
    const url = joinUrl(
      this.userManagementOrigin,
      `/api/user-management/partner-principals/${integrationId}/reactivate`,
    );
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(ctx.tenantId, ctx.authorization),
    });
    if (res.status === 404) {
      return null;
    }
    const body = await this.parseOrThrow(integrationId, res);
    if (!isPartnerPrincipalBody(body)) {
      throw new PartnerOrchestrationError(
        integrationId,
        res.status,
        body,
        "User Management reactivate response is not a partner principal",
      );
    }
    return body;
  }
}
