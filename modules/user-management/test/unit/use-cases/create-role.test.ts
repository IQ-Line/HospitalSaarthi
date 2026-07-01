import { describe, expect, it } from "vitest";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { createRole } from "../../../src/use-cases/create-role.js";

// createRole does not publish events, so a real (unconnected) bus simply satisfies the dep.
function makeDeps(roleRepository = new InMemoryRoleRepository()) {
  return { roleRepository, eventBus: new InProcessEventBus() };
}

const ctx = {
  tenantId: "tenant-a",
  actorId: "actor-1",
  correlationId: "c1",
  canManageSystemFlag: false,
};
const superAdminCtx = { ...ctx, canManageSystemFlag: true };

describe("createRole", () => {
  it("allows multiple roles with the same role_type and different codes", async () => {
    const roleRepository = new InMemoryRoleRepository();
    const deps = makeDeps(roleRepository);

    const first = await createRole(deps, ctx, {
      code: "doctor",
      role_type: "doctor",
      display_name: "ER Doctor",
    });
    const second = await createRole(deps, ctx, {
      code: "doctor-cardiology",
      role_type: "doctor",
      display_name: "Cardiology Doctor",
    });

    expect(first.role_type).toBe("doctor");
    expect(second.role_type).toBe("doctor");
    expect(first.code).not.toBe(second.code);
    expect(await roleRepository.listRoles("tenant-a")).toHaveLength(2);
  });

  it("rejects creating a role whose code is the reserved platform super-admin code", async () => {
    const deps = makeDeps();
    await expect(
      createRole(deps, ctx, { code: "super-admin", role_type: "admin", display_name: "X" }),
    ).rejects.toMatchObject({ issue: "role_code_reserved", code: "ROLE_CODE_RESERVED" });
  });

  it("rejects the reserved code regardless of case / whitespace, and persists nothing", async () => {
    const deps = makeDeps();
    for (const code of [" Super-Admin ", "SUPER-ADMIN"]) {
      await expect(
        createRole(deps, ctx, { code, role_type: "admin", display_name: "X" }),
      ).rejects.toMatchObject({ issue: "role_code_reserved" });
    }
    expect(await deps.roleRepository.listRoles("tenant-a")).toHaveLength(0);
  });

  it("allows a tenant's own admin role (a non-reserved code) — the reservation is narrow", async () => {
    const deps = makeDeps();
    const role = await createRole(deps, ctx, {
      code: "tenant-admin",
      role_type: "admin",
      display_name: "Hospital Admin",
    });
    expect(role.code).toBe("tenant-admin");
    expect(await deps.roleRepository.listRoles("tenant-a")).toHaveLength(1);
  });

  // role_type is also projected into principal role codes (see the bypass-vector test),
  // so it must be reserved on the same axis as code — a benign code does not excuse it.
  it("rejects a role whose role_type is the reserved platform code, and persists nothing", async () => {
    const deps = makeDeps();
    await expect(
      createRole(deps, ctx, { code: "helper", role_type: "super-admin", display_name: "X" }),
    ).rejects.toMatchObject({ issue: "role_type_reserved", code: "ROLE_TYPE_RESERVED" });
    await expect(
      createRole(deps, ctx, { code: "helper", role_type: " SUPER-ADMIN ", display_name: "X" }),
    ).rejects.toMatchObject({ issue: "role_type_reserved" });
    expect(await deps.roleRepository.listRoles("tenant-a")).toHaveLength(0);
  });

  it("allows a non-reserved role_type", async () => {
    const deps = makeDeps();
    const role = await createRole(deps, ctx, {
      code: "er-doctor",
      role_type: "doctor",
      display_name: "ER Doctor",
    });
    expect(role.role_type).toBe("doctor");
  });

  // #48 M3 — is_system is a platform-controlled flag: a tenant caller cannot self-mint a
  // system role by sending `is_system: true` in the request body.
  it("forces is_system=false when the caller may NOT manage the system flag, even if the body sets it true", async () => {
    const deps = makeDeps();
    const role = await createRole(deps, ctx, {
      code: "escalated",
      role_type: "admin",
      display_name: "Escalation Attempt",
      is_system: true,
    });
    expect(role.is_system).toBe(false);
    const persisted = await deps.roleRepository.listRoles("tenant-a");
    expect(persisted[0]?.is_system).toBe(false);
  });

  it("honors is_system=true only for a caller that may manage the system flag (platform onboarding)", async () => {
    const deps = makeDeps();
    const role = await createRole(deps, superAdminCtx, {
      code: "tenant-admin",
      role_type: "tenant-admin",
      display_name: "Tenant Administrator",
      is_system: true,
    });
    expect(role.is_system).toBe(true);
  });

  it("defaults is_system=false when omitted, regardless of the flag", async () => {
    const deps = makeDeps();
    const tenantRole = await createRole(deps, ctx, {
      code: "nurse",
      role_type: "nurse",
      display_name: "Nurse",
    });
    const adminRole = await createRole(deps, superAdminCtx, {
      code: "clerk",
      role_type: "clerk",
      display_name: "Clerk",
    });
    expect(tenantRole.is_system).toBe(false);
    expect(adminRole.is_system).toBe(false);
  });
});
