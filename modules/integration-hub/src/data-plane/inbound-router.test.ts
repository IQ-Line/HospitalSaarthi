import { describe, expect, it } from "vitest";
import { decodeJwt, generateKeyPair } from "jose";
import { mintPartnerJwt } from "./partner-jwt.js";

describe("mintPartnerJwt", () => {
  it("emits identity-only partner claims", async () => {
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });

    const token = await mintPartnerJwt(
      {
        privateKey,
        publicJwk: {},
        kid: "test-kid",
        issuer: "https://integration-hub.test",
        audience: "hims-partner",
        ttlSeconds: 60,
      },
      { sub: "partner-1", tenantId: "tenant-1" },
    );

    const claims = decodeJwt(token);
    expect(claims.sub).toBe("partner-1");
    expect(claims.iq_tenant_id).toBe("tenant-1");
    expect(claims.kind).toBe("partner");
    expect(claims.jti).toBeTypeOf("string");
    expect(claims.iss).toBe("https://integration-hub.test");
    expect(claims.aud).toBe("hims-partner");
    expect(claims.capabilities).toBeUndefined();
    expect(claims.scopes).toBeUndefined();
    expect(claims.permissions).toBeUndefined();
    expect(claims.roles).toBeUndefined();
  });
});
