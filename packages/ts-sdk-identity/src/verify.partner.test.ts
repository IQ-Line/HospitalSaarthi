import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { clearJwksCache } from "./jwks.js";
import { verifyToken } from "./verify.js";
import type { IdentityPluginOptions } from "./types.js";

const HUMAN_ISSUER = "https://auth.hims.local";
const PARTNER_ISSUER = "https://integration-hub.hims.local";
const AUDIENCE = "hims-platform";

afterEach(() => {
  clearJwksCache();
});

describe("verifyToken partner issuer", () => {
  let humanPrivateKey: CryptoKey;
  let partnerPrivateKey: CryptoKey;
  let options: IdentityPluginOptions;

  beforeEach(async () => {
    const human = await generateKeyPair("RS256");
    const partner = await generateKeyPair("RS256");
    humanPrivateKey = human.privateKey;
    partnerPrivateKey = partner.privateKey;

    const humanJwk = await exportJWK(human.publicKey);
    const partnerJwk = await exportJWK(partner.publicKey);

    const humanJwksUrl = `${HUMAN_ISSUER}/api/auth/.well-known/jwks.json`;
    const partnerJwksUrl = `${PARTNER_ISSUER}/.well-known/jwks.json`;
    const jwksDocument = {
      keys: [
        { ...humanJwk, kid: "human-kid", alg: "RS256", use: "sig" },
        { ...partnerJwk, kid: "partner-kid", alg: "RS256", use: "sig" },
      ],
    };

    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === partnerJwksUrl || url === humanJwksUrl) {
        return new Response(JSON.stringify(jwksDocument), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected JWKS fetch: ${url}`);
    }) as typeof fetch;

    globalThis.fetch = fetchImpl;

    options = {
      jwksUrl: `${HUMAN_ISSUER}/api/auth/.well-known/jwks.json`,
      issuer: HUMAN_ISSUER,
      audience: AUDIENCE,
      partnerJwksUrl: `${PARTNER_ISSUER}/.well-known/jwks.json`,
      partnerIssuer: PARTNER_ISSUER,
      partnerMaxTokenAgeSeconds: 120,
      cacheTtlMs: 60_000,
    };
  });

  it("verifies partner JWT from partner JWKS and maps capabilities", async () => {
    const principalId = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      sub: principalId,
      iq_tenant_id: "tenant-1",
      roles: [],
      kind: "partner",
      integration_id: randomUUID(),
      partner_principal_id: principalId,
      api_key_id: randomUUID(),
      capabilities: ["empi:patient:read", "registration:registration:read"],
      jti: randomUUID(),
    })
      .setProtectedHeader({ alg: "RS256", kid: "partner-kid" })
      .setIssuer(PARTNER_ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(partnerPrivateKey);

    const principal = await verifyToken(token, {
      ...options,
      partnerIssuer: PARTNER_ISSUER,
      partnerJwksUrl: `${PARTNER_ISSUER}/.well-known/jwks.json`,
    });
    expect(principal.kind).toBe("partner");
    expect(principal.userId).toBe(principalId);
    expect(principal.capabilities).toEqual(["empi:patient:read", "registration:registration:read"]);
  });

  it("still verifies human JWT from default JWKS", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      sub: "user-1",
      iq_tenant_id: "tenant-1",
      org_id: "org-1",
      roles: ["doctor"],
      jti: randomUUID(),
    })
      .setProtectedHeader({ alg: "RS256", kid: "human-kid" })
      .setIssuer(HUMAN_ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(humanPrivateKey);

    const principal = await verifyToken(token, options);
    expect(principal.kind).toBeUndefined();
    expect(principal.roles).toContain("doctor");
    expect(principal.capabilities).toBeUndefined();
  });
});
