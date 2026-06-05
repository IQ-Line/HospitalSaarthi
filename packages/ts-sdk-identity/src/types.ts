import type { JWTPayload as JoseJWTPayload } from "jose";

/** HLD-04 identity claims on the access JWT (authorization lives in PrincipalService / Cerbos, not here). */
export interface HimsJwtPayload extends JoseJWTPayload {
  sub: string;
  jti: string;
  /**
   * Canonical tenant scope claim for platform data partitioning.
   * This is the only claim mapped to `Principal.tenantId`.
   */
  iq_tenant_id: string;
  /**
   * Organization/business context claim.
   * This is distinct from `iq_tenant_id` and mapped to `Principal.orgId`.
   * When absent or null, `Principal.orgId` is empty string.
   */
  org_id?: string | null;
  roles: string[];
  /** Principal class: `human` (default), `partner`, or `service`. */
  kind?: string;
  /** Partner/service JWT: mint-time capability snapshot (UM is authoritative at mint). */
  capabilities?: string[];
  integration_id?: string;
  partner_principal_id?: string;
  api_key_id?: string;
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
  /** Optional second issuer (Integration Hub partner JWT). Both URL and issuer required together. */
  partnerJwksUrl?: string;
  partnerIssuer?: string;
  /** Max age for partner JWTs (default 120s). Human tokens use maxTokenAgeSeconds. */
  partnerMaxTokenAgeSeconds?: number;
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
  }
}
