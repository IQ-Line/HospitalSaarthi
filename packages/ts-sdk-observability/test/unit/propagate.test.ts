import { describe, expect, it } from "vitest";
import { CORRELATION_HEADER, correlationHeaders } from "../../src/index.js";

describe("correlationHeaders", () => {
  it("returns the correlation header when an id is present", () => {
    expect(correlationHeaders("trace-1")).toEqual({ [CORRELATION_HEADER]: "trace-1" });
  });

  it("returns an empty object when the id is undefined (spread-safe)", () => {
    expect(correlationHeaders(undefined)).toEqual({});
  });

  it("returns an empty object for an empty-string id", () => {
    expect(correlationHeaders("")).toEqual({});
  });

  it("spreads cleanly onto an existing outbound header map", () => {
    const headers = {
      iq_tenant_id: "t1",
      "Content-Type": "application/json",
      ...correlationHeaders("corr-9"),
    };
    expect(headers).toEqual({
      iq_tenant_id: "t1",
      "Content-Type": "application/json",
      [CORRELATION_HEADER]: "corr-9",
    });
  });
});
