import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";
import { ConfiguratorError } from "../errors.js";

export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

type JwtPayloadClaims = {
  roles?: unknown;
  org_id?: unknown;
  sub?: unknown;
};

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64").toString("utf8");
}

/** Best-effort JWT payload decode when identity plugin has not populated `request.user`. */
function decodeBearerJwtClaims(
  authorization: string | undefined,
): JwtPayloadClaims | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const json = decodeBase64Url(parts[1] ?? "");
    return JSON.parse(json) as JwtPayloadClaims;
  } catch {
    return null;
  }
}

function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((role): role is string => typeof role === "string" && role.length > 0);
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
    const orgId = typeof user.orgId === "string" && user.orgId.length > 0 ? user.orgId : null;
    return {
      roles: normalizeRoles(user.roles),
      orgId,
      userId: user.userId,
    };
  }

  const decoded = decodeBearerJwtClaims(
    typeof request.headers.authorization === "string"
      ? request.headers.authorization
      : undefined,
  );
  const orgIdRaw = decoded?.org_id;
  const orgId =
    typeof orgIdRaw === "string" && orgIdRaw.trim().length > 0 ? orgIdRaw.trim() : null;
  const sub = decoded?.sub;
  return {
    roles: normalizeRoles(decoded?.roles),
    orgId,
    userId: typeof sub === "string" && sub.length > 0 ? sub : null,
  };
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
