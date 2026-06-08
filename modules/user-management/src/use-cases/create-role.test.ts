import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { createRole } from "./create-role.js";

describe("createRole", () => {
  it("allows multiple roles with the same role_type and different codes", async () => {
    const roleRepository = new InMemoryRoleRepository();
    const deps = {
      roleRepository,
      eventBus: { publish: async () => undefined } as import("@hims/ts-sdk-events").EventBus,
    };
    const ctx = { tenantId: "tenant-a", actorId: "actor-1", correlationId: "c1" };

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
    expect((await roleRepository.listRoles("tenant-a"))).toHaveLength(2);
  });
});
