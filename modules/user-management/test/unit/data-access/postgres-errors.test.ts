import { describe, expect, it } from "vitest";
import {
  isPostgresErrorCode,
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../src/data-access/postgres-errors.js";

// Guards the drizzle-orm `.cause` wrapping: drizzle 0.45 throws a
// DrizzleQueryError whose `.cause` carries the real pg error + SQLSTATE, so a
// top-level-only `error.code` check would miss a unique/FK violation and the
// rollback paths (e.g. DuplicateUsernameError) would silently never fire.
describe("postgres-errors", () => {
  it("matches a top-level SQLSTATE", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
    expect(isPostgresForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  it("matches a SQLSTATE carried on `.cause` (drizzle-wrapped error)", () => {
    const wrapped = { name: "DrizzleQueryError", cause: { code: "23505" } };
    expect(isPostgresUniqueViolation(wrapped)).toBe(true);

    const wrappedFk = { name: "DrizzleQueryError", cause: { code: "23503" } };
    expect(isPostgresForeignKeyViolation(wrappedFk)).toBe(true);
  });

  it("matches through multiple wrapping layers (bounded)", () => {
    expect(isPostgresUniqueViolation({ cause: { cause: { code: "23505" } } })).toBe(true);
  });

  it("does not match an unrelated error or wrong code", () => {
    expect(isPostgresUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPostgresUniqueViolation(new Error("boom"))).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation(undefined)).toBe(false);
    expect(isPostgresErrorCode({ code: "23505" }, "23503")).toBe(false);
  });

  it("terminates on a self-referential cause chain (no infinite loop)", () => {
    const cyclic: { code: string; cause?: unknown } = { code: "08006" };
    cyclic.cause = cyclic;
    expect(isPostgresUniqueViolation(cyclic)).toBe(false);
  });
});
