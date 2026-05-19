import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { DefaultPrincipalService } from "../services/default-principal-service.js";

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

describe("principal authorization (integration)", () => {
  it("builds principal.attributes.capabilities from user_capabilities snapshot only", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, {
      full_name: "Readonly User",
      email: "readonly@hospitalsaarthi.dev",
    });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "um:user:read");
    authorization.seedCapability(TENANT, USER, "um:user:create");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });

    expect(principal.attributes.capabilities).toEqual(["um:user:create", "um:user:read"]);
  });

  it("proves role_capabilities are not merged when only user_capabilities are seeded", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, { full_name: "Readonly User" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "um:user:read");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });

    expect(principal.attributes.capabilities).toEqual(["um:user:read"]);
    expect(principal.attributes.capabilities).not.toContain("um:user:create");
  });

  it("does not attach legacy permissions-map shapes on the principal", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER, { full_name: "Test" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability(TENANT, USER, "um:role:read");

    const service = principalService(authorization, userRepository);
    const principal = await service.getPrincipal({ tenantId: TENANT, userId: USER });
    const attrs = principal.attributes as Record<string, unknown>;

    expect(attrs).not.toHaveProperty("permissions");
    expect(attrs).not.toHaveProperty("permission_map");
    expect(Array.isArray(attrs.capabilities)).toBe(true);
  });
});
