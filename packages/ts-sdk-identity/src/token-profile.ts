import { decodeJwt } from "jose";
import type { IdentityPluginOptions, PartnerJwtConfig } from "./types.js";
import { IdentityVerificationError } from "./errors.js";

export type HumanTokenProfile = {
  kind: "human";
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
};

export type PartnerTokenProfile = {
  kind: "partner";
  config: PartnerJwtConfig;
};

export type TokenVerificationProfile = HumanTokenProfile | PartnerTokenProfile;

function normalizeAllowlist(
  value: string | string[],
  field: "issuer" | "audience",
): string[] {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    throw new IdentityVerificationError(`${field} allowlist cannot be empty`);
  }

  return [...new Set(normalized)];
}

function readUnverifiedIssuer(token: string): string {
  let payload: ReturnType<typeof decodeJwt>;
  try {
    payload = decodeJwt(token);
  } catch {
    throw new IdentityVerificationError("JWT payload could not be decoded");
  }

  const iss = payload.iss;
  if (typeof iss !== "string" || iss.trim().length === 0) {
    throw new IdentityVerificationError("iss claim is required");
  }
  return iss.trim();
}

export function resolveTokenVerificationProfile(
  token: string,
  options: IdentityPluginOptions,
): TokenVerificationProfile {
  const issuer = readUnverifiedIssuer(token);
  const partner = options.partner;

  if (partner !== undefined && issuer === partner.issuer) {
    return { kind: "partner", config: partner };
  }

  const humanIssuers = normalizeAllowlist(options.issuer, "issuer");
  if (!humanIssuers.includes(issuer)) {
    throw new IdentityVerificationError(`Unsupported JWT issuer: ${issuer}`);
  }

  return {
    kind: "human",
    jwksUrl: options.jwksUrl,
    issuers: humanIssuers,
    audiences: normalizeAllowlist(options.audience, "audience"),
  };
}
