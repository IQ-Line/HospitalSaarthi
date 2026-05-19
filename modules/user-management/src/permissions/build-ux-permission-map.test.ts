import { describe, expect, it } from "vitest";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { buildUxPermissionMap } from "./build-ux-permission-map.js";

describe("buildUxPermissionMap", () => {
  it("keeps role-template administration separate from user-access administration", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(
      "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      { full_name: "Vishal" },
    );

    const allowed = new Set(["user.read", "role.read", "role.assign"]);
    const request = {
      checkResource: async (
        _kind: string,
        _id: string,
        action: string,
      ) => ({
        isAllowed: (candidate: string) => candidate === action && allowed.has(action),
      }),
      user: {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        userId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
    } as const;

    const map = await buildUxPermissionMap(
      request as never,
      {
        userRepository,
        getTenantId: (req) => req.user.tenantId,
        getUserId: (req) => req.user.userId,
      },
    );

    expect(map["user-management"]?.roles?.read).toBe(true);
    expect(map["user-management"]?.roles?.create).toBe(false);
    expect(map["user-management"]?.roles?.update).toBe(false);
    expect(map["user-management"]?.roles?.delete).toBe(false);
    expect(map["user-management"]?.roles?.write).toBe(false);
    expect(map["user-management"]?.capabilities?.read).toBe(false);
    expect(map["user-management"]?.userAccess?.read).toBe(true);
    expect(map["user-management"]?.userAccess?.write).toBe(true);
  });
});
