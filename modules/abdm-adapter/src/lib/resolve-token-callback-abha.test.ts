import { describe, expect, it } from "vitest";
import {
  resolveAbhaAddressForTokenCallback,
  resolveAbhaAddressFromTokenCallback,
} from "./resolve-token-callback-abha.js";

describe("resolveAbhaAddressFromTokenCallback", () => {
  it("prefers top-level abhaAddress", () => {
    expect(
      resolveAbhaAddressFromTokenCallback({
        abhaAddress: "user@sbx",
        response: { requestId: "r1" },
      } as never),
    ).toBe("user@sbx");
  });

  it("reads sub from linkToken JWT when top-level missing", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({ sub: "jwt.user@sbx", exp: 9999999999 }),
    ).toString("base64url");
    const token = `${header}.${payload}.sig`;
    expect(
      resolveAbhaAddressFromTokenCallback({
        linkToken: token,
        response: { requestId: "r1" },
      } as never),
    ).toBe("jwt.user@sbx");
  });
});

describe("resolveAbhaAddressForTokenCallback", () => {
  it("falls back to pending_request_id when body omits abhaAddress", async () => {
    const abha = await resolveAbhaAddressForTokenCallback({
      iqTenantId: "tenant-1",
      body: {
        linkToken: "a.b.c",
        response: { requestId: "req-abc" },
      } as never,
      linkTokens: {
        findAbhaAddressByPendingRequestId: async (_t, id) =>
          id === "req-abc" ? "kamal_kamal@sbx" : null,
      } as never,
    });
    expect(abha).toBe("kamal_kamal@sbx");
  });
});
