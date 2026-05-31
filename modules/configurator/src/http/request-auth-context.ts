import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";
import { ConfiguratorError } from "../errors.js";

export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

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

/**
 * When `ENABLE_AUTH` is false the identity plugin does not run; read roles from the
 * Bearer JWT payload so super-admin onboarding still works in local dev.
 * Not a security boundary — verified `request.user` is preferred when auth is enabled.
 */
function decodeBearerJwtClaims(request: FastifyRequest): RequestAuthContext | null {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0 || token === "dev-token") {
    return null;
  }
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(segments[1]!, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const roles = normalizeRoles(payload.roles).map((role) => role.toLowerCase());
    const orgRaw = payload.org_id;
    const orgId =
      typeof orgRaw === "string" && orgRaw.trim().length > 0 ? orgRaw.trim() : null;
    const subRaw = payload.sub;
    const userId =
      typeof subRaw === "string" && subRaw.trim().length > 0 ? subRaw.trim() : null;
    return { roles, orgId, userId };
  } catch {
    return null;
  }
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
  return decodeBearerJwtClaims(request) ?? { roles: [], orgId: null, userId: null };
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
