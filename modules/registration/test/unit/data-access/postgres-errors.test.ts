import { describe, expect, it } from "vitest";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "@hims/ts-sdk-db";

// Contract test for the shared @hims/ts-sdk-db pg-error helpers that this
// module's idempotency retries (visit/registration repos) depend on. The whole
// point is to survive drizzle-orm 0.45 wrapping the pg driver error in a
// DrizzleQueryError whose top-level `.code` is undefined and whose real SQLSTATE
// lives on `.cause`. A top-level-only check would compile and pass the happy
// path while silently never firing the retry. (Lives here, not in ts-sdk-db,
// because that package has no vitest target yet — area-C follow-up.)
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

describe("isPostgresForeignKeyViolation", () => {
  it("matches a 23503 at the top level and wrapped in `.cause`", () => {
    expect(isPostgresForeignKeyViolation({ code: "23503" })).toBe(true);
    expect(isPostgresForeignKeyViolation({ cause: { code: "23503" } })).toBe(true);
  });

  it("does not match a unique violation or unrelated codes", () => {
    expect(isPostgresForeignKeyViolation({ code: "23505" })).toBe(false);
    expect(isPostgresForeignKeyViolation({ cause: { code: "23505" } })).toBe(false);
    expect(isPostgresForeignKeyViolation(null)).toBe(false);
  });
});
