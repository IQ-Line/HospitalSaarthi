import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { clearAbdmGatewayJwksCache, verifyAbdmSignature } from "../../../../../src/integrations/abdm/lib/abdm-signature-verifier.js";

const ISSUER = "https://gateway.abdm.test";
const AUDIENCE = "hims-callback";

describe("verifyAbdmSignature", () => {
  const env = process.env;

  // Derived from jose rather than the global CryptoKey: @types/node 24 declares
  // the global as a value only, so the bare type reference no longer compiles.
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let jwksServer: Server;
  let jwksUrl: string;

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    privateKey = pair.privateKey;
    const publicJwk = await exportJWK(pair.publicKey);
    const jwks = JSON.stringify({
      keys: [{ ...publicJwk, alg: "RS256", use: "sig", kid: "test-key" }],
    });
    jwksServer = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(jwks);
    });
    await new Promise<void>((resolve) =>
      jwksServer.listen(0, "127.0.0.1", resolve),
    );
    const { port } = jwksServer.address() as AddressInfo;
    jwksUrl = `http://127.0.0.1:${port}/certs`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      jwksServer.close((e) => (e ? reject(e) : resolve())),
    );
  });

  afterEach(() => {
    process.env = { ...env };
    clearAbdmGatewayJwksCache();
    vi.restoreAllMocks();
  });

  function useStrictProductionEnv(): void {
    process.env["NODE_ENV"] = "production";
    delete process.env["ABDM_ALLOW_INSECURE_CALLBACKS"];
    delete process.env["INTEGRATION_HUB_ALLOW_INSECURE_CALLBACKS"];
    process.env["ABDM_GATEWAY_JWKS_URL"] = jwksUrl;
    process.env["ABDM_GATEWAY_JWT_ISSUER"] = ISSUER;
    process.env["ABDM_GATEWAY_JWT_AUDIENCE"] = AUDIENCE;
  }

  async function signGatewayToken(): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  }

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

  it("accepts a JWS signed by the gateway JWKS key with the right issuer and audience", async () => {
    useStrictProductionEnv();

    const token = await signGatewayToken();

    const ok = await verifyAbdmSignature(
      { authorization: `Bearer ${token}` },
      {},
    );
    expect(ok).toBe(true);
  });

  it("rejects a tampered payload even when the signature came from the trusted key", async () => {
    useStrictProductionEnv();

    const token = await signGatewayToken();
    const [header, payload, signature] = token.split(".") as [
      string,
      string,
      string,
    ];
    const forgedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
        sub: "attacker",
      }),
    ).toString("base64url");
    const tampered = `${header}.${forgedPayload}.${signature}`;
    expect(tampered).not.toBe(token);

    const ok = await verifyAbdmSignature(
      { authorization: `Bearer ${tampered}` },
      {},
    );
    expect(ok).toBe(false);
  });
});
