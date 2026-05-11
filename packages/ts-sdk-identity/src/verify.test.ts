import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { clearJwksCache } from "./jwks.js";
import { IdentityVerificationError, verifyToken } from "./verify.js";
import type { IdentityPluginOptions } from "./types.js";

const ISSUER = "https://auth.hims.local";
const AUDIENCE = "hims-platform";
const JWKS_URL = "https://auth.hims.local/.well-known/jwks.json";

type BuildTokenInput = {
  kid?: string;
  alg?: string;
  issuer?: string;
  audience?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  claims?: Record<string, unknown>;
  /** When true, `org_id` is omitted from the payload (nullable org per HLD-04). */
  omitOrgId?: boolean;
  /** When true, `jti` is omitted (must be rejected). */
  omitJti?: boolean;
};

function defaultClaims(nowSeconds: number): Record<string, unknown> {
  return {
    sub: "user-1",
    iq_tenant_id: "tenant-1",
    org_id: "org-1",
    roles: ["Doctor", "doctor"],
    iat: nowSeconds,
    exp: nowSeconds + 300,
  };
}

async function buildFixture() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  const keysByKid: Record<string, unknown> = {
    "kid-1": { ...publicJwk, kid: "kid-1", alg: "RS256", use: "sig" },
  };

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ keys: Object.values(keysByKid) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const options: IdentityPluginOptions = {
    jwksUrl: JWKS_URL,
    issuer: ISSUER,
    audience: AUDIENCE,
    clockSkewSeconds: 60,
    maxTokenAgeSeconds: 300,
    allowedAlgorithms: ["RS256"],
    cacheTtlMs: 60_000,
  };

  async function signToken(input: BuildTokenInput = {}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const iat = input.iat ?? now;
    const exp = input.exp ?? now + 300;
    const claims: Record<string, unknown> = {
      ...defaultClaims(now),
      ...(input.claims ?? {}),
      iat,
      exp,
    };
    if (input.omitOrgId) {
      delete claims.org_id;
    }
    if (input.omitJti) {
      delete claims.jti;
    } else if (typeof claims.jti !== "string" || claims.jti.trim().length === 0) {
      claims.jti = randomUUID();
    }

    const jwt = new SignJWT(claims)
      .setProtectedHeader({
        alg: input.alg ?? "RS256",
        kid: input.kid ?? "kid-1",
      })
      .setIssuer(input.issuer ?? ISSUER)
      .setAudience(input.audience ?? AUDIENCE)
      .setIssuedAt(iat)
      .setExpirationTime(exp);

    if (typeof input.nbf === "number") {
      jwt.setNotBefore(input.nbf);
    }

    if ((input.alg ?? "RS256") === "PS256") {
      const pss = await generateKeyPair("PS256");
      return jwt.sign(pss.privateKey);
    }
    return jwt.sign(privateKey);
  }

  return { options, signToken };
}

describe("verifyToken", () => {
  beforeEach(() => {
    clearJwksCache();
  });

  afterEach(() => {
    clearJwksCache();
  });

  it("rejects invalid issuer", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ issuer: "https://wrong-issuer" });

    await expect(verifyToken(token, options)).rejects.toThrow();
  });

  it("rejects invalid audience", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ audience: "wrong-audience" });

    await expect(verifyToken(token, options)).rejects.toThrow();
  });

  it("accepts token when issuer matches one configured allowed issuer", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ issuer: "https://issuer-secondary.hims.local" });

    await expect(
      verifyToken(token, {
        ...options,
        issuer: [ISSUER, "https://issuer-secondary.hims.local"],
      }),
    ).resolves.toMatchObject({ userId: "user-1" });
  });

  it("accepts token when audience matches one configured allowed audience", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ audience: "hims-platform-admin" });

    await expect(
      verifyToken(token, {
        ...options,
        audience: [AUDIENCE, "hims-platform-admin"],
      }),
    ).resolves.toMatchObject({ userId: "user-1" });
  });

  it("rejects expired token", async () => {
    const { options, signToken } = await buildFixture();
    const now = Math.floor(Date.now() / 1000);
    const token = await signToken({
      iat: now - 500,
      exp: now - 120,
    });

    await expect(verifyToken(token, options)).rejects.toThrow();
  });

  it("rejects unknown kid", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ kid: "unknown-kid" });

    await expect(verifyToken(token, options)).rejects.toThrow("Unknown kid");
  });

  it("rejects unsupported algorithm", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ alg: "PS256" });

    await expect(verifyToken(token, options)).rejects.toThrow(
      "Unsupported JWT algorithm: PS256",
    );
  });

  it("rejects malformed principal claims", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({
      claims: { roles: "doctor" },
    });

    await expect(verifyToken(token, options)).rejects.toBeInstanceOf(
      IdentityVerificationError,
    );
  });

  it("maps omitted org_id to empty Principal.orgId", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ omitOrgId: true });
    await expect(verifyToken(token, options)).resolves.toMatchObject({
      userId: "user-1",
      orgId: "",
    });
  });

  it("maps org_id null to empty Principal.orgId", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ claims: { org_id: null } });
    await expect(verifyToken(token, options)).resolves.toMatchObject({
      userId: "user-1",
      orgId: "",
    });
  });

  it("rejects token without jti", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({ omitJti: true });
    await expect(verifyToken(token, options)).rejects.toThrow();
  });

  it("rejects token when tenant and org claims are semantically ambiguous", async () => {
    const { options, signToken } = await buildFixture();
    const token = await signToken({
      claims: {
        iq_tenant_id: "scope-1",
        org_id: "scope-1",
      },
    });

    await expect(verifyToken(token, options)).rejects.toThrow(
      "iq_tenant_id and org_id must represent distinct semantic scopes",
    );
  });

  it("applies deterministic clock skew tolerance", async () => {
    const { options, signToken } = await buildFixture();
    const now = Math.floor(Date.now() / 1000);
    const accepted = await signToken({ nbf: now + 45 });
    const rejected = await signToken({ nbf: now + 120 });

    await expect(verifyToken(accepted, options)).resolves.toMatchObject({
      userId: "user-1",
      roles: ["doctor"],
    });
    await expect(verifyToken(rejected, options)).rejects.toThrow();
  });
});
