import { describe, expect, it, vi } from "vitest";
import { InMemoryAbacAttributeRepository } from "../data-access/in-memory-abac-attribute-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { InMemoryMasterDataPermissions } from "../integrations/in-memory-master-data-permissions.js";
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
  const mdPerms = new InMemoryMasterDataPermissions();
  const roleProjection = new StubRoleProjection(["doctor"]);

  const service = new DefaultPrincipalService({
    userRepository: userRepo,
    principalRoleProjectionRepository: roleProjection,
    abacAttributeRepository: abac,
    masterDataPermissions: mdPerms,
  });

  return { userRepo, abac, mdPerms, service };
}

describe("DefaultPrincipalService — permission resolution", () => {
  it("resolves permission UUIDs to capability slugs via Master Data", async () => {
    const { abac, mdPerms, service } = setup();

    abac.seedRolePermission(T, U, "perm-aaa");
    abac.seedRolePermission(T, U, "perm-bbb");
    mdPerms.seed("perm-aaa", "um:user:create");
    mdPerms.seed("perm-bbb", "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:create", "um:user:read"]);
  });

  it("drops unresolved permission IDs silently from capabilities", async () => {
    const { abac, mdPerms, service } = setup();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    abac.seedRolePermission(T, U, "perm-known");
    abac.seedRolePermission(T, U, "perm-unknown");
    mdPerms.seed("perm-known", "um:user:list");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:list"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("could not be resolved"),
      expect.objectContaining({ unresolvedIds: ["perm-unknown"] }),
    );

    warnSpy.mockRestore();
  });

  it("returns empty capabilities when no permission IDs exist", async () => {
    const { service } = setup();

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual([]);
  });

  it("deduplicates slugs when multiple permission UUIDs map to the same slug", async () => {
    const { abac, mdPerms, service } = setup();

    abac.seedRolePermission(T, U, "perm-1");
    abac.seedRolePermission(T, U, "perm-2");
    mdPerms.seed("perm-1", "um:user:read");
    mdPerms.seed("perm-2", "um:user:read");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.capabilities).toEqual(["um:user:read"]);
  });

  it("still includes delegated_capabilities from direct grants", async () => {
    const { abac, mdPerms, service } = setup();

    abac.seedRolePermission(T, U, "perm-x");
    mdPerms.seed("perm-x", "um:user:create");

    const principal = await service.getPrincipal({ tenantId: T, userId: U });

    expect(principal.attributes.delegated_capabilities).toEqual([]);
    expect(principal.attributes.capabilities).toEqual(["um:user:create"]);
  });
});
