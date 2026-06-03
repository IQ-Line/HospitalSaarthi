import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAbdmGatewayJwksCache, verifyAbdmSignature } from "./abdm-signature-verifier.js";

describe("verifyAbdmSignature", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    clearAbdmGatewayJwksCache();
    vi.restoreAllMocks();
  });

  it("requires issuer and audience in production/staging when verifying JWS", async () => {
    process.env["NODE_ENV"] = "production";
    delete process.env["ABDM_ALLOW_INSECURE_CALLBACKS"];
    delete process.env["ABDM_GATEWAY_JWT_ISSUER"];
    delete process.env["ABDM_GATEWAY_JWT_AUDIENCE"];

    const ok = await verifyAbdmSignature(
      { authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.e30.sig" },
      {},
    );
    expect(ok).toBe(false);
  });
});
