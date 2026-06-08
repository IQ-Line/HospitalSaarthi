import { decodeProtectedHeader, jwtVerify } from "jose";
import type { JWTVerifyOptions } from "jose";
import { getJwksKeyFn } from "./jwks.js";
import { resolveTokenVerificationProfile } from "./token-profile.js";
import { IdentityVerificationError } from "./errors.js";
import type { HimsJwtPayload, IdentityPluginOptions, PartnerJwtPayload, Principal } from "./types.js";

const DEFAULT_MAX_TOKEN_AGE_SECONDS = 300;
const MAX_ALLOWED_TOKEN_AGE_SECONDS = 900;
const DEFAULT_PARTNER_MAX_TOKEN_AGE_SECONDS = 60;
const MAX_ALLOWED_PARTNER_TOKEN_AGE_SECONDS = 120;
const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const MAX_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_ALLOWED_ALGORITHMS = ["RS256"] as const;

const PARTNER_FORBIDDEN_CLAIMS = [
  "capabilities",
  "scopes",
  "permissions",
  "roles",
] as const;

function sanitizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new IdentityVerificationError("roles claim must be an array");
  }
  const normalized = raw
    .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
    .filter((role) => role.length > 0);
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new IdentityVerificationError(`${field} claim is required`);
  }
  return value.trim();
}

function resolveMaxTokenAgeSeconds(options: IdentityPluginOptions): number {
  const maxTokenAgeSeconds = options.maxTokenAgeSeconds ?? DEFAULT_MAX_TOKEN_AGE_SECONDS;
  if (
    !Number.isFinite(maxTokenAgeSeconds) ||
    maxTokenAgeSeconds <= 0 ||
    maxTokenAgeSeconds > MAX_ALLOWED_TOKEN_AGE_SECONDS
  ) {
    throw new IdentityVerificationError(
      `maxTokenAgeSeconds must be within 1-${MAX_ALLOWED_TOKEN_AGE_SECONDS}`,
    );
  }
  return maxTokenAgeSeconds;
}

function resolvePartnerMaxTokenAgeSeconds(maxTokenAgeSeconds?: number): number {
  const resolved = maxTokenAgeSeconds ?? DEFAULT_PARTNER_MAX_TOKEN_AGE_SECONDS;
  if (
    !Number.isFinite(resolved) ||
    resolved <= 0 ||
    resolved > MAX_ALLOWED_PARTNER_TOKEN_AGE_SECONDS
  ) {
    throw new IdentityVerificationError(
      `partner maxTokenAgeSeconds must be within 1-${MAX_ALLOWED_PARTNER_TOKEN_AGE_SECONDS}`,
    );
  }
  return resolved;
}

function resolveClockSkewSeconds(options: IdentityPluginOptions): number {
  const clockSkewSeconds = options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;
  if (
    !Number.isFinite(clockSkewSeconds) ||
    clockSkewSeconds < 0 ||
    clockSkewSeconds > MAX_CLOCK_SKEW_SECONDS
  ) {
    throw new IdentityVerificationError(
      `clockSkewSeconds must be within 0-${MAX_CLOCK_SKEW_SECONDS}`,
    );
  }
  return clockSkewSeconds;
}

function resolveAllowedAlgorithms(options: IdentityPluginOptions): ReadonlySet<string> {
  const algorithms = options.allowedAlgorithms ?? DEFAULT_ALLOWED_ALGORITHMS;
  if (!Array.isArray(algorithms) || algorithms.length === 0) {
    throw new IdentityVerificationError("allowedAlgorithms must include at least one algorithm");
  }
  for (const alg of algorithms) {
    if (typeof alg !== "string" || alg.trim().length === 0) {
      throw new IdentityVerificationError("allowedAlgorithms contains invalid algorithm");
    }
  }
  return new Set(algorithms);
}

function validateProtectedHeader(
  token: string,
  allowedAlgorithms: ReadonlySet<string>,
): void {
  const header = decodeProtectedHeader(token);
  if (typeof header.kid !== "string" || header.kid.length === 0) {
    throw new IdentityVerificationError("JWT protected header missing kid");
  }
  if (typeof header.alg !== "string" || header.alg.length === 0) {
    throw new IdentityVerificationError("JWT protected header missing alg");
  }
  if (!allowedAlgorithms.has(header.alg)) {
    throw new IdentityVerificationError(`Unsupported JWT algorithm: ${header.alg}`);
  }
}

function resolveOrgIdForPrincipal(tenantId: string, raw: unknown): string {
  if (raw === null || raw === undefined) {
    return "";
  }
  if (typeof raw !== "string") {
    return "";
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }
  if (trimmed === tenantId) {
    throw new IdentityVerificationError(
      "iq_tenant_id and org_id must represent distinct semantic scopes when org_id is set",
    );
  }
  return trimmed;
}

function assertPartnerIdentityClaimsOnly(payload: Record<string, unknown>): void {
  for (const claim of PARTNER_FORBIDDEN_CLAIMS) {
    if (claim in payload && payload[claim] !== undefined) {
      throw new IdentityVerificationError(`Partner JWT must not contain ${claim} claim`);
    }
  }
}

function toHumanPrincipal(payload: HimsJwtPayload): Principal {
  const userId = asNonEmptyString(payload.sub, "sub");
  const tenantId = asNonEmptyString(payload.iq_tenant_id, "iq_tenant_id");
  const orgId = resolveOrgIdForPrincipal(tenantId, payload.org_id);
  const iss = asNonEmptyString(payload.iss, "iss");
  if (typeof payload.iat !== "number") {
    throw new IdentityVerificationError("iat claim is required");
  }
  if (typeof payload.exp !== "number") {
    throw new IdentityVerificationError("exp claim is required");
  }

  const sessionId =
    typeof payload.session_id === "string" && payload.session_id.trim().length > 0
      ? payload.session_id.trim()
      : "";

  const kind =
    typeof payload.kind === "string" && payload.kind.trim().length > 0
      ? payload.kind.trim()
      : undefined;

  return {
    userId,
    tenantId,
    orgId,
    roles: sanitizeRoles(payload.roles),
    sessionId,
    kind,
    department: payload.department,
    iat: payload.iat,
    exp: payload.exp,
    iss,
  };
}

function toPartnerPrincipal(payload: PartnerJwtPayload): Principal {
  assertPartnerIdentityClaimsOnly(payload as unknown as Record<string, unknown>);

  const userId = asNonEmptyString(payload.sub, "sub");
  const tenantId = asNonEmptyString(payload.iq_tenant_id, "iq_tenant_id");
  const iss = asNonEmptyString(payload.iss, "iss");
  const kind = asNonEmptyString(payload.kind, "kind");
  if (kind !== "partner") {
    throw new IdentityVerificationError('kind claim must be "partner"');
  }
  if (typeof payload.iat !== "number") {
    throw new IdentityVerificationError("iat claim is required");
  }
  if (typeof payload.exp !== "number") {
    throw new IdentityVerificationError("exp claim is required");
  }

  return {
    userId,
    tenantId,
    orgId: "",
    roles: [],
    sessionId: "",
    kind: "partner",
    iat: payload.iat,
    exp: payload.exp,
    iss,
  };
}

async function verifyHumanToken(
  token: string,
  options: IdentityPluginOptions,
  profile: { jwksUrl: string; issuers: string[]; audiences: string[] },
): Promise<Principal> {
  const allowedAlgorithms = resolveAllowedAlgorithms(options);
  const keyFn = getJwksKeyFn(profile.jwksUrl, options.cacheTtlMs);
  const maxTokenAgeSeconds = resolveMaxTokenAgeSeconds(options);
  const clockSkewSeconds = resolveClockSkewSeconds(options);

  const verifyOpts: JWTVerifyOptions = {
    issuer: profile.issuers,
    audience: profile.audiences,
    algorithms: [...allowedAlgorithms],
    requiredClaims: ["sub", "iq_tenant_id", "roles", "jti", "exp", "iat"],
    maxTokenAge: `${maxTokenAgeSeconds}s`,
    clockTolerance: `${clockSkewSeconds}s`,
  };

  try {
    const verified = await jwtVerify<HimsJwtPayload>(token, keyFn, verifyOpts);
    return toHumanPrincipal(verified.payload);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "JWKSNoMatchingKey" || error.name === "JWKSInvalid")
    ) {
      throw new IdentityVerificationError(error.message);
    }
    throw error;
  }
}

async function verifyPartnerToken(
  token: string,
  options: IdentityPluginOptions,
  partner: NonNullable<IdentityPluginOptions["partner"]>,
): Promise<Principal> {
  const allowedAlgorithms = resolveAllowedAlgorithms(options);
  const keyFn = getJwksKeyFn(partner.jwksUrl, options.cacheTtlMs);
  const maxTokenAgeSeconds = resolvePartnerMaxTokenAgeSeconds(partner.maxTokenAgeSeconds);
  const clockSkewSeconds = resolveClockSkewSeconds(options);

  const verifyOpts: JWTVerifyOptions = {
    issuer: partner.issuer,
    audience: partner.audience,
    algorithms: [...allowedAlgorithms],
    requiredClaims: ["sub", "iq_tenant_id", "kind", "jti", "exp", "iat"],
    maxTokenAge: `${maxTokenAgeSeconds}s`,
    clockTolerance: `${clockSkewSeconds}s`,
  };

  try {
    const verified = await jwtVerify<PartnerJwtPayload>(token, keyFn, verifyOpts);
    return toPartnerPrincipal(verified.payload);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "JWKSNoMatchingKey" || error.name === "JWKSInvalid")
    ) {
      throw new IdentityVerificationError(error.message);
    }
    throw error;
  }
}

export async function verifyToken(
  token: string,
  options: IdentityPluginOptions,
): Promise<Principal> {
  const allowedAlgorithms = resolveAllowedAlgorithms(options);
  validateProtectedHeader(token, allowedAlgorithms);

  const profile = resolveTokenVerificationProfile(token, options);
  if (profile.kind === "partner") {
    return verifyPartnerToken(token, options, profile.config);
  }
  return verifyHumanToken(token, options, profile);
}
