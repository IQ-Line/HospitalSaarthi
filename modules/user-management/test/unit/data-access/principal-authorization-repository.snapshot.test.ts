import { describe, expect, it } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalAuthorizationRepository } from "../../../src/data-access/principal-authorization-repository.js";
import { user_capabilities } from "../../../src/schema/tables.js";

describe("DrizzlePrincipalAuthorizationRepository (snapshot-only)", () => {
  it("listEffectiveCapabilityKeys reads from user_capabilities (not role_capabilities) and trims/dedups/sorts", async () => {
    let selectCallCount = 0;
    let fromTable: unknown;
    const chain = {
      from: (table: unknown) => {
        fromTable = table;
        return chain;
      },
      innerJoin: () => chain,
      // Untrimmed + duplicate + empty + unsorted keys so the transform is actually exercised.
      where: async () => [
        { capability_key: "users:users:read " },
        { capability_key: "users:users:read" },
        { capability_key: "  billing:invoices:create" },
        { capability_key: "" },
      ],
    };
    const db = {
      select: () => {
        selectCallCount += 1;
        return chain;
      },
    } as unknown as DbInstance;

    const repo = new DrizzlePrincipalAuthorizationRepository(db);
    const keys = await repo.listEffectiveCapabilityKeys("tenant-a", "user-1");

    // The stated guarantee: the authoritative source is `user_capabilities`, NOT a
    // live `role_capabilities` join — assert the actual table the query reads from.
    expect(fromTable).toBe(user_capabilities);
    // A single query (no read-time union of role_capabilities).
    expect(selectCallCount).toBe(1);
    // Trimmed, de-duplicated, empty-dropped, and sorted (localeCompare).
    expect(keys).toEqual(["billing:invoices:create", "users:users:read"]);
  });
});
