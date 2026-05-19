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
});
