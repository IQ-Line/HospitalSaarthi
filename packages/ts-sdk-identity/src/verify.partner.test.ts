import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { clearJwksCache } from "./jwks.js";
import { IdentityVerificationError } from "./errors.js";
import { verifyToken } from "./verify.js";
import type { IdentityPluginOptions } from "./types.js";

const HUMAN_ISSUER = "https://auth.hims.local";
const HUMAN_AUDIENCE = "hims-platform";
const HUMAN_JWKS_URL = "https://auth.hims.local/.well-known/jwks.json";

const PARTNER_ISSUER = "https://integration-hub.hims.local";
const PARTNER_AUDIENCE = "hims-partner";
const PARTNER_JWKS_URL = "https://integration-hub.hims.local/.well-known/jwks.json";

type Fixture = {
  humanPrivateKey: CryptoKey;
  partnerPrivateKey: CryptoKey;
  options: IdentityPluginOptions;
  signHumanToken: (claims?: Record<string, unknown>) => Promise<string>;
  signPartnerToken: (claims?: Record<string, unknown>) => Promise<string>;
};

async function buildFixture(): Promise<Fixture> {
  const humanKeys = await generateKeyPair("RS256");
  const partnerKeys = await generateKeyPair("RS256");
  const humanJwk = await exportJWK(humanKeys.publicKey);
  const partnerJwk = await exportJWK(partnerKeys.publicKey);

  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === HUMAN_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [{ ...humanJwk, kid: "human-kid", alg: "RS256" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url === PARTNER_JWKS_URL) {
      return new Response(JSON.stringify({ keys: [{ ...partnerJwk, kid: "partner-kid", alg: "RS256" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  globalThis.fetch = fetchImpl;

  const options: IdentityPluginOptions = {
    jwksUrl: HUMAN_JWKS_URL,
    issuer: HUMAN_ISSUER,
    audience: HUMAN_AUDIENCE,
    partner: {
      jwksUrl: PARTNER_JWKS_URL,
      issuer: PARTNER_ISSUER,
      audience: PARTNER_AUDIENCE,
      maxTokenAgeSeconds: 60,
    },
    cacheTtlMs: 60_000,
  };

  async function signHumanToken(claims: Record<string, unknown> = {}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: "user-1",
      iq_tenant_id: "tenant-1",
      org_id: "org-1",
      roles: ["doctor"],
      jti: randomUUID(),
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256", kid: "human-kid" })
      .setIssuer(HUMAN_ISSUER)
      .setAudience(HUMAN_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(humanKeys.privateKey);
  }

  async function signPartnerToken(claims: Record<string, unknown> = {}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: "partner-principal-1",
      iq_tenant_id: "tenant-1",
      kind: "partner",
      jti: randomUUID(),
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256", kid: "partner-kid" })
      .setIssuer(PARTNER_ISSUER)
      .setAudience(PARTNER_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(partnerKeys.privateKey);
  }

  return {
    humanPrivateKey: humanKeys.privateKey,
    partnerPrivateKey: partnerKeys.privateKey,
    options,
    signHumanToken,
    signPartnerToken,
  };
}

describe("verifyToken partner issuer", () => {
  beforeEach(() => {
    clearJwksCache();
  });

  afterEach(() => {
    clearJwksCache();
  });

  it("verifies partner JWT via partner JWKS and maps kind=partner", async () => {
    const { options, signPartnerToken } = await buildFixture();
    const token = await signPartnerToken();

    const principal = await verifyToken(token, options);
    expect(principal).toMatchObject({
      userId: "partner-principal-1",
      tenantId: "tenant-1",
      kind: "partner",
      roles: [],
      orgId: "",
      sessionId: "",
      iss: PARTNER_ISSUER,
    });
  });

  it("rejects partner JWT containing forbidden capabilities claim", async () => {
    const { options, signPartnerToken } = await buildFixture();
    const token = await signPartnerToken({ capabilities: ["registration:registration:read"] });

    await expect(verifyToken(token, options)).rejects.toBeInstanceOf(
      IdentityVerificationError,
    );
    await expect(verifyToken(token, options)).rejects.toThrow(
      "Partner JWT must not contain capabilities claim",
    );
  });

  it("rejects partner JWT containing roles claim", async () => {
    const { options, signPartnerToken } = await buildFixture();
    const token = await signPartnerToken({ roles: ["integration-admin"] });

    await expect(verifyToken(token, options)).rejects.toThrow(
      "Partner JWT must not contain roles claim",
    );
  });

  it("still verifies human JWT via human JWKS when partner config is present", async () => {
    const { options, signHumanToken } = await buildFixture();
    const token = await signHumanToken();

    const principal = await verifyToken(token, options);
    expect(principal.userId).toBe("user-1");
    expect(principal.roles).toEqual(["doctor"]);
    expect(principal.kind).toBeUndefined();
  });
});
