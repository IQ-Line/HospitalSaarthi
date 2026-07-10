import { describe, expect, it } from "vitest";
import { createConfiguratorAuthzTargetResolver } from "../../../src/authz/configurator-authz-target-resolver.js";

const PREFIX = "/api/configurator/v1";
const PROBE_UUID = "00000000-0000-0000-0000-000000000000";

type AuthzResolver = ReturnType<typeof createConfiguratorAuthzTargetResolver>;
type ResolverRequest = Parameters<AuthzResolver>[0];

function makeReq(input: {
  method: string;
  pattern: string;
  params?: Record<string, string>;
  body?: unknown;
}): ResolverRequest {
  const url = `${PREFIX}${input.pattern}`;
  return {
    method: input.method,
    url,
    routeOptions: { url },
    params: input.params ?? {},
    ...(input.body !== undefined ? { body: input.body } : {}),
  } as unknown as ResolverRequest;
}

/** Every `authMode:'protected'` route with a concrete param sample + expected Cerbos target. */
const ROUTES: Array<{
  method: string;
  pattern: string;
  params: Record<string, string>;
  expected: { kind: string; id: string; action: string };
}> = [
  { method: "POST", pattern: "/organizations", params: {}, expected: { kind: "configurator:organization", id: "__new__", action: "create" } },
  { method: "GET", pattern: "/organizations", params: {}, expected: { kind: "configurator:organization", id: "list", action: "read" } },
  { method: "GET", pattern: "/organizations/:id", params: { id: "org-9" }, expected: { kind: "configurator:organization", id: "org-9", action: "read" } },
  { method: "PATCH", pattern: "/organizations/:id", params: { id: "org-9" }, expected: { kind: "configurator:organization", id: "org-9", action: "update" } },
  { method: "POST", pattern: "/tenants", params: {}, expected: { kind: "configurator:tenant", id: "__new__", action: "create" } },
  { method: "PATCH", pattern: "/tenants/:id", params: { id: "t-1" }, expected: { kind: "configurator:tenant", id: "t-1", action: "update" } },
  { method: "POST", pattern: "/tenants/:tenantId/modules", params: { tenantId: "t-1" }, expected: { kind: "configurator:tenant_module", id: "t-1", action: "create" } },
  { method: "GET", pattern: "/tenants/:tenantId/modules/:moduleId", params: { tenantId: "t-1", moduleId: "m-1" }, expected: { kind: "configurator:tenant_module", id: "m-1", action: "read" } },
  { method: "PATCH", pattern: "/tenants/:tenantId/modules/:moduleId", params: { tenantId: "t-1", moduleId: "m-1" }, expected: { kind: "configurator:tenant_module", id: "m-1", action: "update" } },
  { method: "DELETE", pattern: "/tenants/:tenantId/modules/:moduleId", params: { tenantId: "t-1", moduleId: "m-1" }, expected: { kind: "configurator:tenant_module", id: "m-1", action: "delete" } },
  { method: "GET", pattern: "/tenants/:tenantId/integration-profiles", params: { tenantId: "t-1" }, expected: { kind: "configurator:tenant_integration_profile", id: "t-1", action: "read" } },
  { method: "POST", pattern: "/tenants/:tenantId/integration-profiles", params: { tenantId: "t-1" }, expected: { kind: "configurator:tenant_integration_profile", id: "t-1", action: "create" } },
  { method: "GET", pattern: "/tenants/:tenantId/integration-profiles/:profileId", params: { tenantId: "t-1", profileId: "p-1" }, expected: { kind: "configurator:tenant_integration_profile", id: "p-1", action: "read" } },
  { method: "PATCH", pattern: "/tenants/:tenantId/integration-profiles/:profileId", params: { tenantId: "t-1", profileId: "p-1" }, expected: { kind: "configurator:tenant_integration_profile", id: "p-1", action: "update" } },
  { method: "DELETE", pattern: "/tenants/:tenantId/integration-profiles/:profileId", params: { tenantId: "t-1", profileId: "p-1" }, expected: { kind: "configurator:tenant_integration_profile", id: "p-1", action: "delete" } },
  { method: "GET", pattern: "/sequence-configurations", params: {}, expected: { kind: "configurator:sequence_configuration", id: "list", action: "read" } },
  { method: "GET", pattern: "/tenants/:tenantId/sequence-configuration", params: { tenantId: "t-1" }, expected: { kind: "configurator:sequence_configuration", id: "t-1", action: "read" } },
  { method: "PUT", pattern: "/tenants/:tenantId/sequence-configuration/identifiers/:identifierType", params: { tenantId: "t-1", identifierType: "mrn" }, expected: { kind: "configurator:sequence_configuration", id: "t-1", action: "update" } },
  { method: "GET", pattern: "/tenants/:tenantId/api-keys", params: { tenantId: "t-1" }, expected: { kind: "configurator:tenant_api_key", id: "t-1", action: "read" } },
  { method: "POST", pattern: "/tenants/:tenantId/api-keys", params: { tenantId: "t-1" }, expected: { kind: "configurator:tenant_api_key", id: "t-1", action: "create" } },
  { method: "PATCH", pattern: "/tenants/:tenantId/api-keys/:apiKeyId", params: { tenantId: "t-1", apiKeyId: "k-1" }, expected: { kind: "configurator:tenant_api_key", id: "k-1", action: "update" } },
  { method: "POST", pattern: "/branding-logos/organization", params: {}, expected: { kind: "configurator:branding", id: "organization", action: "create" } },
  { method: "POST", pattern: "/branding-logos/tenant", params: {}, expected: { kind: "configurator:branding", id: "tenant", action: "create" } },
];

/** Params → PROBE_UUID for every `:segment`, mirroring the authzPlugin onReady probe. */
function probeParams(pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const seg of pattern.split("/")) {
    if (seg.startsWith(":")) params[seg.slice(1)] = PROBE_UUID;
  }
  return params;
}

describe("createConfiguratorAuthzTargetResolver", () => {
  const resolve = createConfiguratorAuthzTargetResolver();

  it.each(ROUTES)("$method $pattern → correct Cerbos target", async ({ method, pattern, params, expected }) => {
    const target = await resolve(makeReq({ method, pattern, params }));
    expect(target).toMatchObject(expected);
  });

  it.each([...ROUTES, {
    method: "POST",
    pattern: "/tenant-onboarding",
    params: {},
    expected: { kind: "configurator:tenant_onboarding", id: "__new__", action: "create" },
  }])(
    "$method $pattern → non-null for the onReady PROBE request (no body)",
    async ({ method, pattern }) => {
      const target = await resolve(makeReq({ method, pattern, params: probeParams(pattern) }));
      expect(target).not.toBeNull();
    },
  );

  it("folds HEAD into GET", async () => {
    const target = await resolve(makeReq({ method: "HEAD", pattern: "/organizations", params: {} }));
    expect(target).toMatchObject({ kind: "configurator:organization", id: "list", action: "read" });
  });

  it("tenant-onboarding attaches org_id from the request body", async () => {
    const target = await resolve(
      makeReq({ method: "POST", pattern: "/tenant-onboarding", body: { organization: { id: "org-1" } } }),
    );
    expect(target).toEqual({
      kind: "configurator:tenant_onboarding",
      id: "__new__",
      action: "create",
      attr: { org_id: "org-1" },
    });
  });

  it("tenant-onboarding omits org_id attr entirely when the body has no organization.id (probe-safe)", async () => {
    const target = await resolve(makeReq({ method: "POST", pattern: "/tenant-onboarding" }));
    expect(target).toEqual({ kind: "configurator:tenant_onboarding", id: "__new__", action: "create" });
    expect(target).not.toHaveProperty("attr");
  });

  it.each([
    { method: "GET", pattern: "/tenants" },
    { method: "GET", pattern: "/tenants/t-1" },
    { method: "GET", pattern: "/tenants/t-1/modules" },
    { method: "GET", pattern: "/branding-logos/ready" },
    { method: "GET", pattern: "/branding-logos/download" },
    { method: "GET", pattern: "/integration-profiles/by-hip/HIP-1" },
    { method: "GET", pattern: "/internal/tenants/t-1/enabled-module-ids" },
    { method: "GET", pattern: "/nonexistent" },
  ])("public / internal / unknown route $method $pattern → null (not gated by the resolver)", async ({ method, pattern }) => {
    const target = await resolve(makeReq({ method, pattern, params: {} }));
    expect(target).toBeNull();
  });
});
