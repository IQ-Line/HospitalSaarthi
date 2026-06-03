import { describe, expect, it } from "vitest";
import { formatNhaUpstreamMessage, parseNhaErrorBody } from "./gateway-errors.js";
import { AbdmGatewayError } from "./gateway-errors.js";

describe("parseNhaErrorBody", () => {
  it("reads NHA field validation errors", () => {
    expect(
      parseNhaErrorBody({
        loginHint: "Invalid Login Hint",
        timestamp: "2026-05-18 16:37:38",
      }),
    ).toEqual({ message: "loginHint: Invalid Login Hint" });
  });
});

describe("formatNhaUpstreamMessage", () => {
  it("prefers parsed NHA message over Bad Request", () => {
    const err = new AbdmGatewayError("Bad Request", {
      statusCode: 400,
      responseBody: { loginHint: "Invalid Login Hint" },
    });
    expect(formatNhaUpstreamMessage(err)).toBe("loginHint: Invalid Login Hint");
  });
});
