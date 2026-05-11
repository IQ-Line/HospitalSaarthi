import { describe, expect, it } from "vitest";
import { readPostgresBackendError } from "./pg-backend-error.js";

describe("readPostgresBackendError", () => {
  it("prefers PostgreSQL SQLSTATE over Node-style code on the same object", () => {
    const pg = Object.assign(new Error('relation "empi.sequence_counters" does not exist'), {
      code: "42P01",
    });
    const drizzleLike = new Error("Failed query: insert…\nparams: …");
    (drizzleLike as Error & { cause?: unknown }).cause = pg;
    expect(readPostgresBackendError(drizzleLike)).toEqual({
      code: "42P01",
      message: 'relation "empi.sequence_counters" does not exist',
    });
  });

  it("ignores Node system errors with string code that is not SQLSTATE", () => {
    const nodeErr = Object.assign(new Error("socket hang up"), {
      code: "ECONNRESET",
    });
    const pg = Object.assign(new Error("duplicate key"), { code: "23505" });
    (nodeErr as Error & { cause?: unknown }).cause = pg;
    expect(readPostgresBackendError(nodeErr)).toEqual({
      code: "23505",
      message: "duplicate key",
    });
  });

  it("reads from AggregateError.errors", () => {
    const pg = Object.assign(new Error("permission denied"), { code: "42501" });
    const agg = new AggregateError([pg], "batch");
    expect(readPostgresBackendError(agg)).toEqual({
      code: "42501",
      message: "permission denied",
    });
  });
});
