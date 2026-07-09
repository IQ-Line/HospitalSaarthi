import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../../../src/data-access/in-memory-principal-authorization-repository.js";
import type { PrincipalRoleProjectionRepository } from "../../../src/ports/index.js";
import { DefaultPrincipalService } from "../../../src/services/default-principal-service.js";

const TENANT = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
const USER = "f47ac10b-58cc-4372-a567-0e02b2c3d492";

class StubRoleProjection implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(): Promise<string[]> {
    return ["readonly"];
  }
  clearCache(): void {}
}

function principalService(
  authorization: InMemoryPrincipalAuthorizationRepository,
  userRepository: InMemoryUserRepository,
) {
  return new DefaultPrincipalService({
    userRepository,
    principalRoleProjectionRepository: new StubRoleProjection(),
    principalAuthorizationRepository: authorization,
  });
}

// These assert the principal WIRE shape (sorted `capabilities` array on `principal.attributes`),
// independent of the resolution recipe: the repository double returns the effective keys directly.
// The recipe itself (live role JOIN + grant/deny overrides, ADR-0037) is proven on real Citus in
// data-access/principal-authorization-recipe.integration.test.ts.
describe("principal authorization (integration)", () => {
  it("puts the effective capability keys onto principal.attributes.capabilities, sorted", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, {
      full_name: "Readonly User",
      email: "readonly@hospitalsaarthi.dev",
    });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "users:users:read");
    authorization.seedCapability(TENANT, USER, "users:users:create");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });

    expect(principal.attributes.capabilities).toEqual(["users:users:create", "users:users:read"]);
  });

  it("carries exactly the resolved effective keys, nothing more", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, { full_name: "Readonly User" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "users:users:read");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });

    expect(principal.attributes.capabilities).toEqual(["users:users:read"]);
    expect(principal.attributes.capabilities).not.toContain("users:users:create");
  });

  it("does not attach legacy permissions-map shapes on the principal", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, { full_name: "Test" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "user-roles:user-roles:read");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });
    const attrs = principal.attributes as unknown as Record<string, unknown>;

    expect(attrs).not.toHaveProperty("permissions");
    expect(attrs).not.toHaveProperty("permission_map");
    expect(Array.isArray(attrs.capabilities)).toBe(true);
  });
});
