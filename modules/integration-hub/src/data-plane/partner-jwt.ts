import { createPrivateKey, createPublicKey, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { exportJWK, importPKCS8, importSPKI, SignJWT, type JWK } from "jose";

export type PartnerJwtSignerConfig = {
  privateKey: CryptoKey;
  publicJwk: JWK;
  kid: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
};

export async function loadPartnerJwtSignerFromEnv(): Promise<PartnerJwtSignerConfig> {
  const issuer = process.env["PARTNER_JWT_ISSUER"]?.trim();
  const audience = process.env["PARTNER_JWT_AUDIENCE"]?.trim();
  const keyPath = process.env["PARTNER_JWT_SIGNING_KEY_PATH"]?.trim();
  const keyPem = process.env["PARTNER_JWT_SIGNING_KEY"]?.trim();
  const ttlRaw = process.env["PARTNER_JWT_TTL_SECONDS"]?.trim();
  const ttlSeconds = ttlRaw ? Number(ttlRaw) : 60;

  if (!issuer || !audience) {
    throw new Error("PARTNER_JWT_ISSUER and PARTNER_JWT_AUDIENCE are required for inbound data plane");
  }
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("PARTNER_JWT_TTL_SECONDS must be a positive number");
  }

  let pem = keyPem ?? "";
  if (keyPath) {
    pem = await readFile(keyPath, "utf8");
  }
  if (!pem.trim()) {
    throw new Error("PARTNER_JWT_SIGNING_KEY or PARTNER_JWT_SIGNING_KEY_PATH is required");
  }

  const privateKey = await importPKCS8(pem, "RS256");
  const publicSpki = createPublicKey(createPrivateKey(pem)).export({
    type: "spki",
    format: "pem",
  });
  const publicKey = await importSPKI(publicSpki, "RS256");
  const publicJwk = await exportJWK(publicKey);
  return {
    privateKey,
    publicJwk: { ...publicJwk, kid: "partner-signing-key", alg: "RS256", use: "sig" },
    kid: "partner-signing-key",
    issuer,
    audience,
    ttlSeconds,
  };
}

export async function mintPartnerJwt(
  config: PartnerJwtSignerConfig,
  input: { sub: string; tenantId: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: input.sub,
    iq_tenant_id: input.tenantId,
    kind: "partner",
    jti: randomUUID(),
  })
    .setProtectedHeader({ alg: "RS256", kid: config.kid })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + config.ttlSeconds)
    .sign(config.privateKey);
}
