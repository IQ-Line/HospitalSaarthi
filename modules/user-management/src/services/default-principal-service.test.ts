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

    authorization.seedCapability(T, U, "um:user:create");
    authorization.seedCapability(T, U, "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:create", "um:user:read"]);
  });

  it("returns empty capabilities when no capability grants exist", async () => {
    const { service } = setup();

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual([]);
  });

  it("deduplicates identical capability grants", async () => {
    const { authorization, service } = setup();

    authorization.seedCapability(T, U, "um:user:read");
    authorization.seedCapability(T, U, "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:read"]);
  });

  it("still includes delegated_capabilities from direct grants", async () => {
    const { authorization, service } = setup();

    authorization.seedCapability(T, U, "um:user:create");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.delegated_capabilities).toEqual([]);
    expect(principal.attributes.capabilities).toEqual(["um:user:create"]);
  });
});
