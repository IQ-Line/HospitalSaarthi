import { describe, expect, it, vi } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalRoleProjectionRepository } from "../../../src/data-access/drizzle-principal-role-projection-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";

describe("PrincipalRoleProjectionRepository instance cache", () => {
  describe("InMemoryPrincipalRoleProjectionRepository", () => {
    it("reuses cached projection for same tenant+user without re-querying assignments", async () => {
      const userAccessRepository = new InMemoryUserAccessRepository(async (_tenantId, _roleId) => ({
        id: "r1",
        code: "doctor",
        role_type: "doctor",
        display_name: "D",
        is_system: false,
        status: "active",
      }));
      const roleRepository = new InMemoryRoleRepository([
        {
          tenantId: "t1",
          role: { id: "r1", code: "doctor", role_type: "doctor", display_name: "D", is_system: false, status: "active" },
        },
      ]);
      await userAccessRepository.applyRoleTemplate("t1", {
        userId: "u1",
        roleId: "r1",
        actorId: null,
      });

      const listSpy = vi.spyOn(userAccessRepository, "listRoleTemplatesByUser");
      const projection = new InMemoryPrincipalRoleProjectionRepository(
        userAccessRepository,
        roleRepository,
      );

      const a = await projection.listRoleCodesByUser("t1", "u1");
      const b = await projection.listRoleCodesByUser("t1", "u1");

      expect(a).toEqual(["doctor"]);
      expect(b).toEqual(["doctor"]);
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    it("does not share cache between different users", async () => {
      const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
        roleRepository.getRoleById(tenantId, roleId),
      );
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "a", role_type: "a", display_name: "A", is_system: false, status: "active" } },
        { tenantId: "t1", role: { id: "r2", code: "b", role_type: "b", display_name: "B", is_system: false, status: "active" } },
      ]);
      await userAccessRepository.applyRoleTemplate("t1", {
        userId: "u1",
        roleId: "r1",
        actorId: null,
      });
      await userAccessRepository.applyRoleTemplate("t1", {
        userId: "u2",
        roleId: "r2",
        actorId: null,
      });

      const projection = new InMemoryPrincipalRoleProjectionRepository(
        userAccessRepository,
        roleRepository,
      );

      expect(await projection.listRoleCodesByUser("t1", "u1")).toEqual(["a"]);
      expect(await projection.listRoleCodesByUser("t1", "u2")).toEqual(["b"]);
    });

    it("returns defensive copies so mutating a result does not affect cache or later calls", async () => {
      const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
        roleRepository.getRoleById(tenantId, roleId),
      );
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "x", role_type: "x", display_name: "X", is_system: false, status: "active" } },
      ]);
      await userAccessRepository.applyRoleTemplate("t1", {
        userId: "u1",
        roleId: "r1",
        actorId: null,
      });

      const projection = new InMemoryPrincipalRoleProjectionRepository(
        userAccessRepository,
        roleRepository,
      );

      const first = await projection.listRoleCodesByUser("t1", "u1");
      first.push("tampered");
      const second = await projection.listRoleCodesByUser("t1", "u1");
      expect(second).toEqual(["x"]);
    });

    it("clearCache forces a fresh projection", async () => {
      const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
        roleRepository.getRoleById(tenantId, roleId),
      );
      const roleRepository = new InMemoryRoleRepository([
        { tenantId: "t1", role: { id: "r1", code: "one", role_type: "one", display_name: "O", is_system: false, status: "active" } },
      ]);
      await userAccessRepository.applyRoleTemplate("t1", {
        userId: "u1",
        roleId: "r1",
        actorId: null,
      });

      const listSpy = vi.spyOn(userAccessRepository, "listRoleTemplatesByUser");
      const projection = new InMemoryPrincipalRoleProjectionRepository(
        userAccessRepository,
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
          return [{ code: "doctor", role_type: "doctor" }];
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
