import type { JWTPayload as JoseJWTPayload } from "jose";

/** HLD-04 identity claims on the access JWT (authorization lives in PrincipalService / Cerbos, not here). */
export interface HimsJwtPayload extends JoseJWTPayload {
  sub: string;
  jti: string;
  /**
   * Canonical tenant scope claim for platform data partitioning.
   * This is the only claim mapped to `Principal.tenantId`.
   *
   * Optional ONLY for bounded platform-operator tokens (`scopes` includes `"platform"`), which are
   * tenant-less by design (BET4). Every other token MUST carry a non-empty value — `toPrincipal`
   * hard-requires it unless the token is platform-scoped.
   */
  iq_tenant_id?: string;
  /**
   * Bounded platform authority scopes (e.g. `["platform"]`). Absent/empty for ordinary tenant
   * users. A platform scope is the ONLY thing that relaxes the tenant requirement above, and it
   * is issued solely from `platform_admins` membership on an RS256-signed token — it cannot be
   * self-asserted by a tenant user.
   */
  scopes?: string[];
  /**
   * Organization/business context claim.
   * This is distinct from `iq_tenant_id` and mapped to `Principal.orgId`.
   * When absent or null, `Principal.orgId` is empty string.
   */
  org_id?: string | null;
  roles: string[];
  /**
   * Auth-provider session identifier. Intentionally optional — better-auth relies on `jti` +
   * short-lived JWTs for token identity; resource services should validate identity claims
   * (sub, tenant, roles), not auth-provider session state.
   */
  session_id?: string;
  department?: string;
  iat: number;
  exp: number;
  iss: string;
}

export interface Principal {
  userId: string;
  /** Canonical tenant identity derived from JWT `iq_tenant_id`. */
  tenantId: string;
  /** Organization context derived from JWT `org_id` (not interchangeable with tenant). */
  orgId: string;
  roles: string[];
  /**
   * Bounded platform authority scopes derived from JWT `scopes` (e.g. `["platform"]`); `[]` otherwise.
   * Optional so non-SDK Principal constructions (tests, adapters) need not set it; the SDK's own
   * `verifyToken` always populates it, and readers default to `[]`.
   */
  scopes?: string[];
  sessionId: string;
  kind?: string;
  department?: string;
  idp?: string;
  iat: number;
  exp: number;
  iss: string;
  /**
   * PEP-enriched ABAC attributes (User Management LLD §7). Populated after identity + enrichment hooks.
   * These are the same values sent to Cerbos on `request.principal.attr`.
   */
  capabilities?: string[];
  delegatedCapabilities?: string[];
  clearances?: Record<string, string>;
  /** Max user-management clearance tier (0–3) derived from `clearances`; sent to Cerbos as `um_clearance_effective_tier`. */
  umClearanceEffectiveTier?: number;
}

export interface IdentityPluginOptions {
  jwksUrl: string;
  /** Strict allowlist: token `iss` must match one configured value exactly. */
  issuer: string | string[];
  /** Strict allowlist: token `aud` must contain one configured value exactly. */
  audience: string | string[];
  /**
   * URL path prefixes (e.g. `/api/auth`) for which JWT verification is skipped.
   * Use for better-auth (or other IdP) routes mounted on the same Fastify instance.
   */
  skipPathPrefixes?: string[];
  cacheTtlMs?: number;
  /**
   * Access token max age in seconds. Defaults to 300 (5 minutes).
   * Values above 900 are rejected to prevent long-lived access tokens.
   */
  maxTokenAgeSeconds?: number;
  /**
   * Clock skew tolerance in seconds for exp/iat/nbf checks.
   * Defaults to 60 and must stay within [0, 60].
   */
  clockSkewSeconds?: number;
  /**
   * Allowed asymmetric JWT algorithms. Defaults to RS256.
   */
  allowedAlgorithms?: readonly string[];
}

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Shared request identity contract (Phase 1A).
     * Consolidated here so downstream SDKs/modules can consume one `request.user`
     * shape without redefining Fastify augmentation per package.
     */
    user: Principal;
    /** Canonical request correlation id used across errors/events/logs. */
    correlationId: string;
    /**
     * Canonical tenant scope on the request, decorated by the tenant-context / tenant-API-key
     * plugins (mirrors `@hims/ts-sdk-tenant`). Consolidated here so resource modules/services
     * that consume identity don't each redefine the Fastify augmentation.
     */
    tenantId: string;
    /** True when the request was authenticated via a tenant API key rather than a JWT. */
    authViaApiKey?: boolean;
  }
}
