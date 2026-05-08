import { describe, expect, it } from "vitest";
import { compareCanonicalRoleCodes, normalizeRoleCode } from "../domain/normalize-role-code.js";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { projectPrincipalRoles } from "./project-principal-roles.js";

class StubPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  constructor(
    private readonly codesByTenantUser: Map<string, string[]>,
    private readonly onCall?: (tenantId: string, userId: string) => void,
  ) {}

  private key(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }

  async listRoleCodesByUser(tenantId: string, userId: string): Promise<string[]> {
    this.onCall?.(tenantId, userId);
    return [...(this.codesByTenantUser.get(this.key(tenantId, userId)) ?? [])];
  }

  clearCache(): void {}
}

describe("projectPrincipalRoles", () => {
  it("calls projection repository exactly once per enrichment", async () => {
    let callCount = 0;
    const projection = new StubPrincipalRoleProjectionRepository(
      new Map([["tenant-a:user-1", ["nurse", "doctor"]]]),
      () => {
        callCount += 1;
      },
    );

    await projectPrincipalRoles({ principalRoleProjectionRepository: projection }, "tenant-a", "user-1");

    expect(callCount).toBe(1);
  });

  it("returns sorted canonical role codes for a user with multiple roles", async () => {
    const raw = ["NURSE ", " doctor"];
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(
          new Map([["tenant-a:user-1", raw]]),
        ),
      },
      "tenant-a",
      "user-1",
    );

    const expected = [...new Set(raw.map(normalizeRoleCode).filter((c) => c.length > 0))].sort(
      compareCanonicalRoleCodes,
    );
    expect(roles).toEqual(expected);
  });

  it("sorts with deterministic lexical order (not localeCompare)", async () => {
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(
          new Map([["tenant-a:user-1", ["zebra", "admin", "nurse"]]]),
        ),
      },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual(["admin", "nurse", "zebra"]);
  });

  it("deduplicates roles when duplicate assignments exist (duplicate raw codes from join)", async () => {
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(
          new Map([["tenant-a:user-1", ["doctor", "doctor"]]]),
        ),
      },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual(["doctor"]);
  });

  it("omits orphan role rows (projection layer already inner-joined / filtered)", async () => {
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(
          new Map([["tenant-a:user-1", ["doctor"]]]),
        ),
      },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual(["doctor"]);
  });

  it("does not leak roles across tenants", async () => {
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(
          new Map([["tenant-b:user-1", ["admin"]]]),
        ),
      },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual([]);
  });

  it("returns an empty array for users with no roles", async () => {
    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(new Map()),
      },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual([]);
  });
});
