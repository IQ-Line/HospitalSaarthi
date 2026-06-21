import type { TenantAdminProvisioningPort } from "@hims/configurator";

const DEFAULT_TIMEOUT_MS = 30_000;

export type HttpTenantAdminProvisioningAdapterOptions = {
  userManagementBaseUrl: string;
  authorization?: string;
  timeoutMs?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

export class HttpTenantAdminProvisioningAdapter
  implements TenantAdminProvisioningPort
{
  private readonly umBaseUrl: string;
  private readonly authorization?: string;
  private readonly timeoutMs: number;
  private readonly log?: HttpTenantAdminProvisioningAdapterOptions["log"];
  private _deferredPassword?: string;

  constructor(options: HttpTenantAdminProvisioningAdapterOptions) {
    this.umBaseUrl = options.userManagementBaseUrl.replace(/\/+$/, "");
    this.authorization = options.authorization;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.log = options.log;
  }

  private buildHeaders(tenantId: string): Record<string, string> {
    const h: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
      iq_tenant_id: tenantId,
    };
    if (this.authorization) h.authorization = this.authorization;
    return h;
  }

  async createAuthAccount(input: {
    platformUserId: string;
    tenantId: string;
    fullName: string;
    password: string;
  }): Promise<{ authUserId: string }> {
    // In the HTTP adapter model, user-management-svc's POST /users creates
    // both the auth account and the user record in a single call.
    // We defer everything to provisionUser() which has the role context.
    // Store the password so provisionUser can use it.
    this._deferredPassword = input.password;

    this.log?.(
      { platformUserId: input.platformUserId },
      "Auth account creation deferred to provisionUser (HTTP adapter)",
    );

    return { authUserId: input.platformUserId };
  }

  async createSystemRole(
    tenantId: string,
    input: {
      code: string;
      role_type: string;
      display_name: string;
      is_system: boolean;
    },
  ): Promise<{
    id: string;
    code: string;
    display_name: string;
    is_system: boolean;
  }> {
    const url = `${this.umBaseUrl}/api/user-management/roles`;

    this.log?.(
      { tenantId, roleCode: input.code },
      "Creating system role via user-management",
    );

    const res = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(tenantId),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      this.log?.(
        { status: res.status, errorBody, roleCode: input.code },
        "System role creation failed",
      );
      throw new Error(
        `Role creation failed: HTTP ${res.status} — ${errorBody}`,
      );
    }

    return (await res.json()) as {
      id: string;
      code: string;
      display_name: string;
      is_system: boolean;
    };
  }

  async replaceRoleCapabilities(
    tenantId: string,
    roleId: string,
    capabilityIds: string[],
  ): Promise<void> {
    const url = `${this.umBaseUrl}/api/user-management/roles/${encodeURIComponent(roleId)}/capabilities`;

    this.log?.(
      { tenantId, roleId, capabilityCount: capabilityIds.length },
      "Assigning capabilities to role via user-management",
    );

    const res = await fetch(url, {
      method: "PUT",
      headers: this.buildHeaders(tenantId),
      body: JSON.stringify({ capability_ids: capabilityIds }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      this.log?.(
        { status: res.status, errorBody, roleId },
        "Role capability assignment failed",
      );
      throw new Error(
        `Role capability assignment failed: HTTP ${res.status} — ${errorBody}`,
      );
    }
  }

  async provisionUser(
    tenantId: string,
    input: {
      userId: string;
      fullName: string;
      username: string;
      email?: string | null;
      phone?: string | null;
      orgId?: string | null;
      authUserId: string;
      roleId: string;
      roleCapabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<{ id: string; email: string | null; full_name: string }> {
    const url = `${this.umBaseUrl}/api/user-management/users`;
    const password = this._deferredPassword;
    if (!password) {
      throw new Error("provisionUser called before createAuthAccount — no password available");
    }
    // Username-primary (ADR-0003): username is always sent; email is optional contact data.
    const body = {
      full_name: input.fullName,
      username: input.username,
      email: input.email ?? undefined,
      password,
      phone: input.phone ?? undefined,
      org_id: input.orgId ?? undefined,
      role_template_ids: [input.roleId],
      role_template_capability_ids: input.roleCapabilityIds,
    };

    this.log?.(
      { tenantId, username: input.username, roleId: input.roleId },
      "Provisioning admin user via user-management",
    );

    const res = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(tenantId),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      this.log?.(
        { status: res.status, errorBody, email: input.email },
        "Admin user provisioning failed",
      );
      throw new Error(
        `User provisioning failed: HTTP ${res.status} — ${errorBody}`,
      );
    }

    return (await res.json()) as {
      id: string;
      email: string | null;
      full_name: string;
    };
  }
}
