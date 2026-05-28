import { describe, expect, it, vi } from "vitest";
import { createUserManagementAuthzTargetResolver } from "./authz-target-resolver.js";

describe("createUserManagementAuthzTargetResolver", () => {
  it("returns null for GET /capabilities/assignable (now inline)", async () => {
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

    expect(target).toBeNull();
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("returns null for GET /capabilities/:id (now inline)", async () => {
    const getUserProfile = vi.fn();
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

    expect(target).toBeNull();
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

  it("returns null for GET /auth/principal (now inline)", async () => {
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

    expect(target).toBeNull();
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("returns null for POST /users (now inline)", async () => {
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

    expect(target).toBeNull();
  });

  it("maps GET /users/:id to user.read on the target user", async () => {
    const getUserProfile = vi.fn().mockResolvedValue({
      org_id: null,
      department: "admin",
      clearance_tier_required: 1,
    });
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "GET",
      url: "/api/user-management/users/f47ac10b-58cc-4372-a567-0e02b2c3d612",
      routeOptions: { url: "/api/user-management/users/:id" },
      params: { id: "f47ac10b-58cc-4372-a567-0e02b2c3d612" },
      user: {
        userId: "user-1",
        tenantId: "tenant-a",
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "user",
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
      action: "user.read",
      attr: {
        iq_tenant_id: "tenant-a",
        department: "admin",
        required_clearance: 1,
        org_id: null,
      },
    });
    expect(getUserProfile).toHaveBeenCalledWith("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d612");
  });

  it("maps POST /users/:id/deactivate to user.deactivate on the target user", async () => {
    const getUserProfile = vi.fn().mockResolvedValue({
      org_id: null,
      department: "admin",
      clearance_tier_required: 0,
    });
    const resolver = createUserManagementAuthzTargetResolver({ getUserProfile });

    const target = await resolver({
      method: "POST",
      url: "/api/user-management/users/f47ac10b-58cc-4372-a567-0e02b2c3d613/deactivate",
      routeOptions: { url: "/api/user-management/users/:id/deactivate" },
      params: { id: "f47ac10b-58cc-4372-a567-0e02b2c3d613" },
      user: {
        userId: "user-1",
        tenantId: "tenant-a",
        department: null,
      },
    } as never);

    expect(target).toEqual({
      kind: "user",
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d613",
      action: "user.deactivate",
      attr: {
        iq_tenant_id: "tenant-a",
        department: "admin",
        required_clearance: 0,
        org_id: null,
      },
    });
    expect(getUserProfile).toHaveBeenCalledWith("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d613");
  });
});
