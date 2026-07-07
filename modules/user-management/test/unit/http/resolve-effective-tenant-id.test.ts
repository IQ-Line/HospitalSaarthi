import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  assertTenantHeaderAllowedForPrincipal,
  isPlatformSuperAdminRequest,
  resolveEffectiveTenantId,
} from "../../../src/http/resolve-effective-tenant-id.js";

function mockRequest(user: {
  tenantId: string;
  roles?: string[];
  scopes?: string[];
}): FastifyRequest {
  return {
    user,
    headers: {},
  } as unknown as FastifyRequest;
}

function withCerbosScopes(request: FastifyRequest, scopes: string[]): FastifyRequest {
  (request as { cerbosPrincipal?: { attributes: { scopes: string[] } } }).cerbosPrincipal = {
    attributes: { scopes },
  };
  return request;
}

describe("resolveEffectiveTenantId", () => {
  it("uses JWT tenant for normal users", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["clerk"] });
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-home");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(false);
  });

  it("allows a platform operator (JWT scope:platform) to scope via iq_tenant_id header", () => {
    const request = mockRequest({ tenantId: "tenant-home", scopes: ["platform"] });
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("allows cross-tenant header when platform scope is only on cerbosPrincipal.attributes.scopes", () => {
    const request = withCerbosScopes(
      mockRequest({ tenantId: "tenant-home", roles: [] }),
      ["platform"],
    );
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("reads iq_tenant_id when the header value is a string array (proxy/ingress)", () => {
    const request = mockRequest({ tenantId: "tenant-home", scopes: ["platform"] });
    request.headers["iq_tenant_id"] = ["tenant-other"];
    expect(resolveEffectiveTenantId(request)).toBe("tenant-other");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(true);
  });

  it("falls back to x-tenant-id when iq_tenant_id is absent", () => {
    const request = mockRequest({ tenantId: "tenant-home", scopes: ["platform"] });
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

  it("DENIES cross-tenant for a tenant user who merely holds a role named 'super-admin' (string is dead)", () => {
    const request = mockRequest({ tenantId: "tenant-home", roles: ["super-admin"] });
    request.headers["iq_tenant_id"] = "tenant-other";
    expect(resolveEffectiveTenantId(request)).toBe("tenant-home");
    expect(assertTenantHeaderAllowedForPrincipal(request).ok).toBe(false);
  });
});

describe("isPlatformSuperAdminRequest", () => {
  it("is true for a JWT scope:platform claim", () => {
    expect(
      isPlatformSuperAdminRequest(mockRequest({ tenantId: "t", scopes: ["platform"] })),
    ).toBe(true);
  });

  it("is false for an ordinary tenant principal", () => {
    expect(
      isPlatformSuperAdminRequest(mockRequest({ tenantId: "t", roles: ["clerk", "nurse"] })),
    ).toBe(false);
  });

  it("is true when platform scope is only in cerbosPrincipal.attributes.scopes", () => {
    const request = withCerbosScopes(mockRequest({ tenantId: "t", roles: [] }), ["platform"]);
    expect(isPlatformSuperAdminRequest(request)).toBe(true);
  });

  it("is FALSE for a role named 'super-admin' without the platform scope (string is dead)", () => {
    expect(
      isPlatformSuperAdminRequest(mockRequest({ tenantId: "t", roles: ["super-admin"] })),
    ).toBe(false);
  });

  it("is false when there is no principal at all", () => {
    expect(isPlatformSuperAdminRequest({ headers: {} } as unknown as FastifyRequest)).toBe(false);
  });
});
