import type { JWTPayload as JoseJWTPayload } from "jose";

export interface HimsJwtPayload extends JoseJWTPayload {
  sub: string;
  /**
   * Canonical tenant scope claim for platform data partitioning.
   * This is the only claim mapped to `Principal.tenantId`.
   */
  iq_tenant_id: string;
  /**
   * Organization/business context claim.
   * This is distinct from `iq_tenant_id` and mapped to `Principal.orgId`.
   */
  org_id: string;
  roles: string[];
  session_id?: string;
  kind?: string;
  department?: string;
  idp?: string;
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
}

export interface IdentityPluginOptions {
  jwksUrl: string;
  /** Strict allowlist: token `iss` must match one configured value exactly. */
  issuer: string | string[];
  /** Strict allowlist: token `aud` must contain one configured value exactly. */
  audience: string | string[];
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
  }
}
