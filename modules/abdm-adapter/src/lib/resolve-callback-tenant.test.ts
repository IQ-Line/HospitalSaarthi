import { describe, expect, it } from "vitest";
import { resolveInboundRequestId } from "./resolve-callback-tenant.js";

describe("resolveInboundRequestId", () => {
  it("prefers REQUEST-ID header", () => {
    expect(
      resolveInboundRequestId(
        { "REQUEST-ID": "hdr-id" },
        { response: { requestId: "body-id" } },
      ),
    ).toBe("hdr-id");
  });

  it("falls back to body.response.requestId when header absent (sandbox callbacks)", () => {
    expect(
      resolveInboundRequestId(
        {},
        {
          abhaAddress: "user@sbx",
          linkToken: "eyJ...",
          response: { requestId: "d6d6d056-666a-4af8-b680-4c61bcb29dd4" },
        },
      ),
    ).toBe("d6d6d056-666a-4af8-b680-4c61bcb29dd4");
  });

  it("throws when neither header nor body id present", () => {
    expect(() => resolveInboundRequestId({}, { abhaAddress: "x@sbx" })).toThrow(
      /REQUEST-ID/,
    );
  });
});
