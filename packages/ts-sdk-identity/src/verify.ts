import { decodeProtectedHeader, jwtVerify } from "jose";
import type { JWTVerifyOptions } from "jose";
import { getJwksKeyFn } from "./jwks.js";
import type { HimsJwtPayload, IdentityPluginOptions, Principal } from "./types.js";

const DEFAULT_MAX_TOKEN_AGE_SECONDS = 300;
const MAX_ALLOWED_TOKEN_AGE_SECONDS = 900;
const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const MAX_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_ALLOWED_ALGORITHMS = ["RS256"] as const;

export class IdentityVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityVerificationError";
  }
}

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

function normalizeAllowlist(
  value: string | string[],
  field: "issuer" | "audience",
): string[] {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) {
    throw new IdentityVerificationError(`${field} allowlist cannot be empty`);
  }

  const normalized = values
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    throw new IdentityVerificationError(`${field} allowlist cannot be empty`);
  }

  return [...new Set(normalized)];
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

function toPrincipal(payload: HimsJwtPayload): Principal {
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

  return {
    userId,
    tenantId,
    orgId,
    roles: sanitizeRoles(payload.roles),
    sessionId,
    department: payload.department,
    iat: payload.iat,
    exp: payload.exp,
    iss,
  };
}

export async function verifyToken(
  token: string,
  options: IdentityPluginOptions,
): Promise<Principal> {
  const issuerAllowlist = normalizeAllowlist(options.issuer, "issuer");
  const audienceAllowlist = normalizeAllowlist(options.audience, "audience");

  const allowedAlgorithms = resolveAllowedAlgorithms(options);
  validateProtectedHeader(token, allowedAlgorithms);

  const keyFn = getJwksKeyFn(options.jwksUrl, options.cacheTtlMs);
  const maxTokenAgeSeconds = resolveMaxTokenAgeSeconds(options);
  const clockSkewSeconds = resolveClockSkewSeconds(options);

  const verifyOpts: JWTVerifyOptions = {};
  verifyOpts.issuer = issuerAllowlist;
  verifyOpts.audience = audienceAllowlist;
  verifyOpts.algorithms = [...allowedAlgorithms];
  // session_id is intentionally NOT a required claim:
  // - better-auth issues short-lived JWTs identified by `jti`; session state lives server-side
  //   in the `auth.session` table, not inside the access token.
  // - Resource services validate *identity* (sub, tenant, roles) — not auth-provider session
  //   lifecycle. Coupling to session_id would make every service a session-state consumer.
  // - If session-binding is needed later, it should be enforced at the auth gateway, not here.
  verifyOpts.requiredClaims = ["sub", "iq_tenant_id", "roles", "jti", "exp", "iat"];
  verifyOpts.maxTokenAge = `${maxTokenAgeSeconds}s`;
  verifyOpts.clockTolerance = `${clockSkewSeconds}s`;

  let payload: HimsJwtPayload;
  try {
    const verified = await jwtVerify<HimsJwtPayload>(token, keyFn, verifyOpts);
    payload = verified.payload;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "JWKSNoMatchingKey" || error.name === "JWKSInvalid")
    ) {
      throw new IdentityVerificationError(error.message);
    }
    throw error;
  }

  return toPrincipal(payload);
}
