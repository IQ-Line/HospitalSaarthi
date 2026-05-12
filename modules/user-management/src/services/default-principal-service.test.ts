import { describe, expect, it } from "vitest";
import { InMemoryAbacAttributeRepository } from "../data-access/in-memory-abac-attribute-repository.js";
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

  const abac = new InMemoryAbacAttributeRepository();
  const roleProjection = new StubRoleProjection(["doctor"]);

  const service = new DefaultPrincipalService({
    userRepository: userRepo,
    principalRoleProjectionRepository: roleProjection,
    abacAttributeRepository: abac,
  });

  return { userRepo, abac, service };
}

describe("DefaultPrincipalService — permission slug resolution", () => {
  it("returns permission slugs directly as capabilities", async () => {
    const { abac, service } = setup();

    abac.seedRolePermissionSlug(T, U, "um:user:create");
    abac.seedRolePermissionSlug(T, U, "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:create", "um:user:read"]);
  });

  it("returns empty capabilities when no permission slugs exist", async () => {
    const { service } = setup();

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual([]);
  });

  it("deduplicates identical permission slugs", async () => {
    const { abac, service } = setup();

    abac.seedRolePermissionSlug(T, U, "um:user:read");
    abac.seedRolePermissionSlug(T, U, "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:read"]);
  });

  it("still includes delegated_capabilities from direct grants", async () => {
    const { abac, service } = setup();

    abac.seedRolePermissionSlug(T, U, "um:user:create");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.delegated_capabilities).toEqual([]);
    expect(principal.attributes.capabilities).toEqual(["um:user:create"]);
  });
});
