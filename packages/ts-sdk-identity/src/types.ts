import type { JWTPayload as JoseJWTPayload } from "jose";

export interface HimsJwtPayload extends JoseJWTPayload {
  sub: string;
  iq_tenant_id: string;
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
  tenantId: string;
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
  issuer?: string;
  audience?: string;
  cacheTtlMs?: number;
}

declare module "fastify" {
  interface FastifyRequest {
    user: Principal;
  }
}
