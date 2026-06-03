import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";
import { ConfiguratorError } from "../errors.js";

export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles
    .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
    .filter((role) => role.length > 0);
}

function readBearerJwtPayload(request: FastifyRequest): Record<string, unknown> | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const parts = header.slice(7).split(".");
  const payloadSegment = parts[1];
  if (parts.length !== 3 || !payloadSegment) {
    return null;
  }
  try {
    const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as unknown;
    return payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function authContextFromBearerJwt(request: FastifyRequest): RequestAuthContext {
  const payload = readBearerJwtPayload(request);
  if (!payload) {
    return { roles: [], orgId: null, userId: null };
  }

  const orgIdRaw = payload["org_id"];
  const orgId =
    typeof orgIdRaw === "string" && orgIdRaw.trim().length > 0 ? orgIdRaw.trim() : null;
  const userIdRaw = payload["sub"];
  const userId =
    typeof userIdRaw === "string" && userIdRaw.trim().length > 0 ? userIdRaw.trim() : null;

  return {
    roles: normalizeRoles(payload["roles"]),
    orgId,
    userId,
  };
}

export function isPlatformSuperAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === PLATFORM_SUPER_ADMIN_ROLE;
}

export function isPlatformSuperAdmin(roles: readonly string[]): boolean {
  return roles.some(isPlatformSuperAdminRole);
}

export interface RequestAuthContext {
  roles: string[];
  orgId: string | null;
  userId: string | null;
}

export function getRequestAuthContext(request: FastifyRequest): RequestAuthContext {
  const user = (request as FastifyRequest & { user?: Principal }).user;
  if (user) {
    return {
      roles: normalizeRoles(user.roles),
      orgId: typeof user.orgId === "string" && user.orgId.length > 0 ? user.orgId : null,
      userId: user.userId,
    };
  }
  // When ENABLE_AUTH is off locally, identity plugin does not run; read role claims from Bearer JWT.
  return authContextFromBearerJwt(request);
}

export function assertPlatformSuperAdmin(request: FastifyRequest): void {
  const { roles } = getRequestAuthContext(request);
  if (!isPlatformSuperAdmin(roles)) {
    throw new ConfiguratorError(
      403,
      "platform super-admin role is required",
      "FORBIDDEN",
    );
  }
}
