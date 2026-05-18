import { describe, expect, it, vi } from "vitest";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";

describe("createUserManagementAuthzTargetResolver", () => {
  it("maps GET /capabilities/:id to capability.read", async () => {
    const getUserProfile = vi.fn().mockResolvedValue(null);
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/capabilities/f47ac10b-58cc-4372-a567-0e02b2c3d610",
      routeOptions: { url: "/api/user-management/capabilities/:id" },
      params: { id: "f47ac10b-58cc-4372-a567-0e02b2c3d610" },
      user: {
        userId: "user-1",
        tenantId: "tenant-a",
        department: "admin",
      },
    } as never);

    expect(target).toEqual({
      kind: "capability",
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d610",
      action: "capability.read",
      attr: {
        iq_tenant_id: "tenant-a",
        department: "admin",
        required_clearance: 0,
      },
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("maps GET /users/:id/roles to role.read without loading a user profile", async () => {
    const getUserProfile = vi.fn().mockResolvedValue(null);
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/users/f47ac10b-58cc-4372-a567-0e02b2c3d611/roles",
      routeOptions: { url: "/api/user-management/users/:id/roles" },
      params: { id: "f47ac10b-58cc-4372-a567-0e02b2c3d611" },
      user: {
        userId: "user-1",
        tenantId: "tenant-a",
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "role",
      id: "user-roles:f47ac10b-58cc-4372-a567-0e02b2c3d611",
      action: "role.read",
      attr: {
        iq_tenant_id: "tenant-a",
        department: null,
        required_clearance: 0,
      },
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });
});
