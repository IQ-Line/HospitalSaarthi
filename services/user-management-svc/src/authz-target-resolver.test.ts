import { describe, expect, it, vi } from "vitest";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";

describe("createUserManagementAuthzTargetResolver", () => {
  it("maps GET /capabilities/assignable to capability.read", async () => {
    const getUserProfile = vi.fn();
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/capabilities/assignable",
      routeOptions: { url: "/api/user-management/capabilities/assignable" },
      user: {
        userId: "user-1",
        tenantId: "tenant-a",
        department: "admin",
      },
    } as never);

    expect(target).toEqual({
      kind: "capability",
      id: "assignable",
      action: "capability.read",
      attr: {
        iq_tenant_id: "tenant-a",
        department: "admin",
        required_clearance: 0,
      },
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

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

  it("maps GET /users/:id/roles to user.read on the target user", async () => {
    const getUserProfile = vi.fn().mockResolvedValue({
      org_id: null,
      department: "admin",
      clearance_tier_required: 0,
    });
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
      kind: "user",
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
      action: "user.read",
      attr: {
        iq_tenant_id: "tenant-a",
        department: "admin",
        required_clearance: 0,
        org_id: null,
      },
    });
    expect(getUserProfile).toHaveBeenCalledWith("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d611");
  });

  it("maps GET /auth/principal to auth.read (tenant-only; no users:users:read)", async () => {
    const getUserProfile = vi.fn();
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/auth/principal",
      routeOptions: { url: "/api/user-management/auth/principal" },
      user: {
        userId: "c26740ca-acb9-49be-aeb3-81812f80252d",
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "auth",
      id: "self",
      action: "auth.read",
      attr: {
        iq_tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        department: null,
        required_clearance: 0,
      },
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("maps GET /auth/principal to JWT home tenant even when super-admin sends iq_tenant_id header", async () => {
    const getUserProfile = vi.fn();
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/auth/principal",
      routeOptions: { url: "/api/user-management/auth/principal" },
      headers: { iq_tenant_id: "tenant-other" },
      user: {
        userId: "c26740ca-acb9-49be-aeb3-81812f80252d",
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        roles: ["super-admin"],
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "auth",
      id: "self",
      action: "auth.read",
      attr: {
        iq_tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        department: null,
        required_clearance: 0,
      },
    });
  });

  it("maps POST /users resource tenant from iq_tenant_id header for super-admin", async () => {
    const getUserProfile = vi.fn();
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "POST",
      url: "/api/user-management/users",
      routeOptions: { url: "/api/user-management/users" },
      headers: { iq_tenant_id: "tenant-target" },
      user: {
        userId: "user-1",
        tenantId: "tenant-home",
        roles: ["super-admin"],
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "user",
      id: "new",
      action: "user.create",
      attr: {
        iq_tenant_id: "tenant-target",
        department: null,
        required_clearance: 0,
      },
    });
  });
});
