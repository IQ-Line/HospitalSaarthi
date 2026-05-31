import { describe, expect, it } from "vitest";
import type { ProvisionTenantInput } from "../domain/onboarding.types.js";
import { ConfiguratorError } from "../errors.js";
import { assertTenantOnboardingAllowed } from "./tenant-onboarding-access.js";

function mockRequest(input: {
  user?: { roles: string[]; orgId?: string; userId?: string };
  authorization?: string;
}): Parameters<typeof assertTenantOnboardingAllowed>[0] {
  return {
    headers: input.authorization ? { authorization: input.authorization } : {},
    user: input.user as never,
  } as Parameters<typeof assertTenantOnboardingAllowed>[0];
}

const baseInput: ProvisionTenantInput = {
  organization: {
    name: "Acme",
    slug: "acme",
    type: "standalone_hospital",
  },
  tenant: { name: "Main", slug: "main" },
  plan: { slug: "starter" },
  modules: [{ module_id: "a1000001-0001-4001-8001-000000000001", is_active: true }],
  admin: {
    first_name: "A",
    last_name: "B",
    email: "a@example.com",
    password: "Secret1!",
  },
};

describe("assertTenantOnboardingAllowed", () => {
  it("allows super-admin without organization.id", () => {
    expect(() =>
      assertTenantOnboardingAllowed(
        mockRequest({ user: { roles: ["super-admin"], userId: "u1" } }),
        baseInput,
      ),
    ).not.toThrow();
  });

  it("requires organization.id for tenant-admin scoped to org", () => {
    expect(() =>
      assertTenantOnboardingAllowed(
        mockRequest({
          user: { roles: ["tenant-admin"], orgId: "org-1", userId: "u2" },
        }),
        {
          ...baseInput,
          organization: { ...baseInput.organization, id: "org-1" },
        },
      ),
    ).not.toThrow();
  });

  it("rejects tenant-admin creating a new organisation", () => {
    expect(() =>
      assertTenantOnboardingAllowed(
        mockRequest({
          user: { roles: ["tenant-admin"], orgId: "org-1", userId: "u2" },
        }),
        baseInput,
      ),
    ).toThrow(ConfiguratorError);
  });

  it("rejects tenant-admin targeting another organisation", () => {
    expect(() =>
      assertTenantOnboardingAllowed(
        mockRequest({
          user: { roles: ["tenant-admin"], orgId: "org-1", userId: "u2" },
        }),
        {
          ...baseInput,
          organization: { ...baseInput.organization, id: "org-2" },
        },
      ),
    ).toThrow(ConfiguratorError);
  });

  it("allows super-admin from Bearer JWT when identity plugin did not set request.user", () => {
    const token = `hdr.${Buffer.from(
      JSON.stringify({ sub: "u1", roles: ["super-admin"] }),
    ).toString("base64url")}.sig`;
    expect(() =>
      assertTenantOnboardingAllowed(
        mockRequest({ authorization: `Bearer ${token}` }),
        baseInput,
      ),
    ).not.toThrow();
  });
});
