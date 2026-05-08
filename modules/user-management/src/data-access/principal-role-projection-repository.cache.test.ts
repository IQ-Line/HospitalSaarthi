import { describe, expect, it, vi } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalRoleProjectionRepository } from "./drizzle-principal-role-projection-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "./in-memory-principal-role-projection-repository.js";
import { InMemoryRoleAssignmentRepository } from "./in-memory-role-assignment-repository.js";
import { InMemoryRoleRepository } from "./in-memory-role-repository.js";

describe("PrincipalRoleProjectionRepository instance cache", () => {
  describe("InMemoryPrincipalRoleProjectionRepository", () => {
    it("reuses cached projection for same tenant+user without re-querying assignments", async () => {
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const roleRepository = new InMemoryRoleRepository([
        {
          tenantId: "t1",
          role: { id: "r1", code: "doctor", display_name: "D" },
        },
      ]);
      await roleAssignmentRepository.assignRole("t1", { user_id: "u1", role_id: "r1" });

      const listSpy = vi.spyOn(roleAssignmentRepository, "listAssignmentsByUser");
      const projection = new InMemoryPrincipalRoleProjectionRepository(
        roleAssignmentRepository,
        roleRepository,
      );

      const a = await projection.listRoleCodesByUser("t1", "u1");
      const b = await projection.listRoleCodesByUser("t1", "u1");

      expect(a).toEqual(["doctor"]);
      expect(b).toEqual(["doctor"]);
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    it("does not share cache between different users", async () => {
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "a", display_name: "A" } },
        { tenantId: "t1", role: { id: "r2", code: "b", display_name: "B" } },
      ]);
      await roleAssignmentRepository.assignRole("t1", { user_id: "u1", role_id: "r1" });
      await roleAssignmentRepository.assignRole("t1", { user_id: "u2", role_id: "r2" });

      const projection = new InMemoryPrincipalRoleProjectionRepository(
        roleAssignmentRepository,
        roleRepository,
      );

      expect(await projection.listRoleCodesByUser("t1", "u1")).toEqual(["a"]);
      expect(await projection.listRoleCodesByUser("t1", "u2")).toEqual(["b"]);
    });

    it("returns defensive copies so mutating a result does not affect cache or later calls", async () => {
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "x", display_name: "X" } },
      ]);
      await roleAssignmentRepository.assignRole("t1", { user_id: "u1", role_id: "r1" });

      const projection = new InMemoryPrincipalRoleProjectionRepository(
        roleAssignmentRepository,
        roleRepository,
      );

      const first = await projection.listRoleCodesByUser("t1", "u1");
      first.push("tampered");
      const second = await projection.listRoleCodesByUser("t1", "u1");
      expect(second).toEqual(["x"]);
    });

    it("clearCache forces a fresh projection", async () => {
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "one", display_name: "O" } },
      ]);
      await roleAssignmentRepository.assignRole("t1", { user_id: "u1", role_id: "r1" });

      const listSpy = vi.spyOn(roleAssignmentRepository, "listAssignmentsByUser");
      const projection = new InMemoryPrincipalRoleProjectionRepository(
        roleAssignmentRepository,
        roleRepository,
      );

      await projection.listRoleCodesByUser("t1", "u1");
      projection.clearCache();
      await projection.listRoleCodesByUser("t1", "u1");

      expect(listSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("DrizzlePrincipalRoleProjectionRepository", () => {
    it("caches join results per tenant+user and clears with clearCache", async () => {
      let queryCount = 0;
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: async () => {
          queryCount += 1;
          return [{ code: "doctor" }];
        },
      };
      const db = {
        select: () => chain,
      } as unknown as DbInstance;

      const projection = new DrizzlePrincipalRoleProjectionRepository(db);
      expect(await projection.listRoleCodesByUser("t1", "u1")).toEqual(["doctor"]);
      expect(await projection.listRoleCodesByUser("t1", "u1")).toEqual(["doctor"]);
      expect(queryCount).toBe(1);

      projection.clearCache();
      expect(await projection.listRoleCodesByUser("t1", "u1")).toEqual(["doctor"]);
      expect(queryCount).toBe(2);
    });
  });
});
