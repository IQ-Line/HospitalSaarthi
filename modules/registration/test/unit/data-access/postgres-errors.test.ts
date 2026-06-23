import { describe, expect, it } from "vitest";
import { isPostgresUniqueViolation } from "../../../src/data-access/postgres-errors.js";

// The whole point of this helper is to survive drizzle-orm 0.45 wrapping the pg
// driver error in a DrizzleQueryError whose top-level `.code` is undefined and
// whose real SQLSTATE lives on `.cause`. A top-level-only check would compile
// and pass the happy path while silently never firing the idempotency retry.
describe("isPostgresUniqueViolation", () => {
  it("matches a bare pg error carrying code 23505 at the top level", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("matches a 23505 wrapped one level deep in `.cause` (drizzle's shape)", () => {
    const wrapped = { name: "DrizzleQueryError", cause: { code: "23505" } };
    expect(isPostgresUniqueViolation(wrapped)).toBe(true);
  });

  it("matches a 23505 wrapped multiple `.cause` levels deep", () => {
    const deep = { cause: { cause: { cause: { code: "23505" } } } };
    expect(isPostgresUniqueViolation(deep)).toBe(true);
  });

  it("does not match other codes, null, undefined, or non-objects", () => {
    expect(isPostgresUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPostgresUniqueViolation({ cause: { code: "42P01" } })).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation(undefined)).toBe(false);
    expect(isPostgresUniqueViolation("23505")).toBe(false);
    expect(isPostgresUniqueViolation({})).toBe(false);
  });

  it("terminates on a self-referential `.cause` cycle instead of looping forever", () => {
    const cyclic: { code: string; cause?: unknown } = { code: "08000" };
    cyclic.cause = cyclic;
    expect(isPostgresUniqueViolation(cyclic)).toBe(false);
  });
});
