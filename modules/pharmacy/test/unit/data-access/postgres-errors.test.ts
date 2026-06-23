import { describe, expect, it } from "vitest";
import { isPostgresUniqueViolation } from "../../../src/data-access/postgres-errors.js";

// Guards the drizzle-orm `.cause` wrapping: a 23505 thrown by drizzle (verified
// against real Postgres, both for plain queries and inside db.transaction) is a
// DrizzleQueryError whose TOP-LEVEL `.code` is undefined — the real pg
// `code:'23505'` lives on `.cause` (a DatabaseError). A top-level-only check
// therefore never fires, so DrizzleDispenseRecordRepo's concurrent-upsert retry
// would silently leak the violation instead of recovering. This is the
// deterministic regression guard for that bug (the concurrency integration test
// only triggers the race probabilistically).
describe("isPostgresUniqueViolation", () => {
  it("matches a top-level SQLSTATE", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("matches a 23505 carried on `.cause` (the real drizzle shape)", () => {
    const drizzleWrapped = { name: "DrizzleQueryError", cause: { code: "23505" } };
    expect(isPostgresUniqueViolation(drizzleWrapped)).toBe(true);
  });

  it("matches through multiple wrapping layers (bounded)", () => {
    expect(isPostgresUniqueViolation({ cause: { cause: { code: "23505" } } })).toBe(true);
  });

  it("does not match a different SQLSTATE or unrelated error", () => {
    expect(isPostgresUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPostgresUniqueViolation({ cause: { code: "23503" } })).toBe(false);
    expect(isPostgresUniqueViolation(new Error("boom"))).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation(undefined)).toBe(false);
    expect(isPostgresUniqueViolation("23505")).toBe(false);
  });

  it("terminates on a self-referential cause chain (no infinite loop)", () => {
    const cyclic: { code: string; cause?: unknown } = { code: "08006" };
    cyclic.cause = cyclic;
    expect(isPostgresUniqueViolation(cyclic)).toBe(false);
  });
});
