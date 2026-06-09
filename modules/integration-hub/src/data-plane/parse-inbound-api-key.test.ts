import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { parseInboundApiKey } from "./parse-inbound-api-key.js";

function mockRequest(headers: Record<string, string | string[] | undefined>): FastifyRequest {
  return { headers } as FastifyRequest;
}

describe("parseInboundApiKey", () => {
  const secret = "hims_test_abcdefghijklmnop";

  it("prefers X-Api-Key over Authorization Bearer", () => {
    expect(
      parseInboundApiKey(
        mockRequest({
          "x-api-key": secret,
          authorization: "Bearer other-token",
        }),
      ),
    ).toBe(secret);
  });

  it("accepts raw secret in X-Api-Key", () => {
    expect(parseInboundApiKey(mockRequest({ "x-api-key": secret }))).toBe(secret);
  });

  it("strips Bearer prefix from X-Api-Key when present", () => {
    expect(parseInboundApiKey(mockRequest({ "x-api-key": `Bearer ${secret}` }))).toBe(secret);
  });

  it("falls back to Authorization Bearer when X-Api-Key is absent", () => {
    expect(parseInboundApiKey(mockRequest({ authorization: `Bearer ${secret}` }))).toBe(secret);
  });

  it("returns null when neither header is present", () => {
    expect(parseInboundApiKey(mockRequest({}))).toBeNull();
  });

  it("returns null for malformed Authorization without Bearer scheme", () => {
    expect(parseInboundApiKey(mockRequest({ authorization: secret }))).toBeNull();
  });
});
