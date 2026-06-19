import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  assertTenantHeaderAllowedForPrincipal,
  resolveEffectiveTenantId,
} from "./resolve-effective-tenant-id.js";

function mockRequest(user: {
  tenantId: string;
  roles?: string[];
}): FastifyRequest {
  return {
    user,
    headers: {},
  } as unknown as FastifyRequest;
}

describe("resolveEffectiveTenantId", () => {
  it("uses JWT tenant for normal users", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["clerk"] });
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-home");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(false);
  });

  it("allows super-admin to scope via iq_tenant_id header", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["super-admin"] });
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("allows cross-tenant header when super-admin role is only on cerbosPrincipal", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: [] });
    (request as FastifyRequest & { cerbosPrincipal?: { roles: string[] } }).cerbosPrincipal = {
      roles: ["super-admin"],
    };
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("reads iq_tenant_id when the header value is a string array (proxy/ingress)", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["super-admin"] });
    request.headers["iq_tenant_id"] = ["tenant-other"];
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("falls back to x-tenant-id when iq_tenant_id is absent", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["super-admin"] });
    request.headers["x-tenant-id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("uses tenantId from API key auth without JWT", () => {
    const request = {
      authViaApiKey: true,
      tenantId: "983934e8-f61c-4514-b8ec-df5ac7a6f02b",
      headers: { iq_tenant_id: "other-tenant" },
    } as unknown as FastifyRequest;
    expect(resolveEffectiveTenantId(request)).toBe("983934e8-f61c-4514-b8ec-df5ac7a6f02b");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("allows cross-tenant header when super-admin is only in cerbosPrincipal.attributes.role_codes", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: [] });
    (
      request as FastifyRequest & {
        cerbosPrincipal?: { roles: string[]; attributes: { role_codes: string[] } };
      }
    ).cerbosPrincipal = {
      roles: ["__hims_authenticated__"],
      attributes: { role_codes: ["super-admin"] },
    };
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });
});
