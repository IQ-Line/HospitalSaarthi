import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { DefaultPrincipalService } from "./default-principal-service.js";

const T = "tenant-1";
const U = "user-1";

class StubRoleProjection implements PrincipalRoleProjectionRepository {
  constructor(private readonly codes: string[] = []) {}
  async listRoleCodesByUser(): Promise<string[]> {
    return this.codes;
  }
  clearCache(): void {}
}

function setup() {
  const userRepo = new InMemoryUserRepository();
  userRepo.insertUserWithId(T, U, { full_name: "Test User" });

  const authorization = new InMemoryPrincipalAuthorizationRepository();
  const roleProjection = new StubRoleProjection(["doctor"]);

  const service = new DefaultPrincipalService({
    userRepository: userRepo,
    principalRoleProjectionRepository: roleProjection,
    principalAuthorizationRepository: authorization,
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

  it("exposes kind=partner and empty role_codes for partner principals", async () => {
    const userRepo = new InMemoryUserRepository();
    const partnerId = "partner-principal-1";
    userRepo.insertPartnerPrincipal(T, {
      id: partnerId,
      integrationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      fullName: "Smart Report",
    });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(T, partnerId, "registration:registration:read");

    const service = new DefaultPrincipalService({
      userRepository: userRepo,
      principalRoleProjectionRepository: new StubRoleProjection(["doctor"]),
      principalAuthorizationRepository: authorization,
    });

    const principal = await service.getPrincipal({ tenantId: T, userId: partnerId });

    expect(principal.attributes.kind).toBe("partner");
    expect(principal.roles).toEqual([]);
    expect(principal.attributes.capabilities).toEqual(["registration:registration:read"]);
  });
});
