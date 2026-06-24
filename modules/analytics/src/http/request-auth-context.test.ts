import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { resolveOpdRegistrationBillingReportTenantId } from "./request-auth-context.js";

function requestWith(
  partial: Partial<FastifyRequest> & {
    user?: { tenantId?: string; roles?: string[] };
    tenantId?: string;
  },
): FastifyRequest {
  return partial as FastifyRequest;
}

describe("resolveOpdRegistrationBillingReportTenantId", () => {
  it("binds tenant-admin to JWT home tenant even when header tenant differs", () => {
    const tenantId = resolveOpdRegistrationBillingReportTenantId(
      requestWith({
        tenantId: "other-tenant",
        user: { tenantId: "home-tenant", roles: ["tenant-admin"] },
      }),
    );
    expect(tenantId).toBe("home-tenant");
  });

  it("allows platform super-admin to scope via request tenant header", () => {
    const tenantId = resolveOpdRegistrationBillingReportTenantId(
      requestWith({
        tenantId: "scoped-tenant",
        user: { tenantId: "home-tenant", roles: ["super-admin"] },
      }),
    );
    expect(tenantId).toBe("scoped-tenant");
  });
});
