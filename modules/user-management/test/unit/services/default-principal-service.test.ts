import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../../../src/data-access/in-memory-principal-authorization-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import type { PrincipalRoleProjectionRepository, TenantEntitlementResolverPort } from "../../../src/ports/index.js";
import { DefaultPrincipalService } from "../../../src/services/default-principal-service.js";

const T = "tenant-1";
const U = "user-1";

class StubRoleProjection implements PrincipalRoleProjectionRepository {
  constructor(private readonly codes: string[] = []) {}
  async listRoleCodesByUser(): Promise<string[]> {
    return this.codes;
  }
  clearCache(): void {}
}

class StubEntitlementResolver implements TenantEntitlementResolverPort {
  constructor(
    private readonly entitled: readonly string[],
    private readonly revision = "rev-1",
  ) {}

  lastContext: { authorization?: string } | undefined;

  async resolveTenantEntitlement(
    _tenantId: string,
    context?: { authorization?: string },
  ) {
    this.lastContext = context;
    return {
      entitledCapabilityKeys: new Set(this.entitled),
      tenantEntitlementRevision: this.revision,
    };
  }
}

function setup(options?: { entitled?: readonly string[]; intersection?: boolean }) {
  const userRepo = new InMemoryUserRepository();
  userRepo.insertUserWithId(T, U, { full_name: "Test User" });

  const authorization = new InMemoryPrincipalAuthorizationRepository();
  const roleProjection = new StubRoleProjection(["doctor"]);

  const entitled = options?.entitled ?? [
    "users:users:create",
    "users:users:read",
    "opd:visits:read",
  ];

  const service = new DefaultPrincipalService({
    userRepository: userRepo,
    principalRoleProjectionRepository: roleProjection,
    principalAuthorizationRepository: authorization,
    tenantEntitlementResolver: new StubEntitlementResolver(entitled),
    runtimeEntitlementIntersection: options?.intersection ?? true,
  });

  return { userRepo, authorization, service };
}

describe("DefaultPrincipalService — capability resolution", () => {
  it("returns capabilities directly as principal entitlements", async () => {
    const { authorization, service } = setup();

    authorization.seedCapability(T, U, "users:users:create");
    authorization.seedCapability(T, U, "users:users:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["users:users:create", "users:users:read"]);
  });

  it("returns empty capabilities when no capability grants exist", async () => {
    const { service } = setup();

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual([]);
  });

  it("rejects inactive users", async () => {
    const { userRepo, service } = setup();
    await userRepo.updateUser(T, U, { status: "inactive" });

    await expect(service.getPrincipal({ tenantId: T, userId: U })).rejects.toMatchObject({
      code: "USER_ACCOUNT_DISABLED",
    });
  });

  it("deduplicates identical capability grants", async () => {
    const { authorization, service } = setup();

    authorization.seedCapability(T, U, "users:users:read");
    authorization.seedCapability(T, U, "users:users:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["users:users:read"]);
  });

  it("still includes delegated_capabilities from direct grants", async () => {
    const { authorization, service } = setup();

    authorization.seedCapability(T, U, "users:users:create");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.delegated_capabilities).toEqual([]);
    expect(principal.attributes.capabilities).toEqual(["users:users:create"]);
  });

  it("intersects stored grants with tenant entitlement", async () => {
    const { authorization, service } = setup({
      entitled: ["users:users:read"],
    });

    authorization.seedCapability(T, U, "users:users:read");
    authorization.seedCapability(T, U, "opd:visits:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["users:users:read"]);
    expect(principal.attributes.tenant_entitlement_revision).toBe("rev-1");
  });

  it("skips intersection when runtimeEntitlementIntersection is false", async () => {
    const { authorization, service } = setup({
      entitled: ["users:users:read"],
      intersection: false,
    });

    authorization.seedCapability(T, U, "users:users:read");
    authorization.seedCapability(T, U, "opd:visits:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["opd:visits:read", "users:users:read"]);
    expect(principal.attributes.tenant_entitlement_revision).toBeUndefined();
  });

  it("forwards authorization to tenant entitlement resolver", async () => {
    const entitled = ["users:users:read"];
    const resolver = new StubEntitlementResolver(entitled);
    const userRepo = new InMemoryUserRepository();
    userRepo.insertUserWithId(T, U, { full_name: "Test User" });
    const authorization = new InMemoryPrincipalAuthorizationRepository();
    const service = new DefaultPrincipalService({
      userRepository: userRepo,
      principalRoleProjectionRepository: new StubRoleProjection(),
      principalAuthorizationRepository: authorization,
      tenantEntitlementResolver: resolver,
    });

    await service.getPrincipal({
      tenantId: T,
      userId: U,
      authorization: "Bearer test-token",
    });

    expect(resolver.lastContext).toEqual({ authorization: "Bearer test-token" });
  });
});
