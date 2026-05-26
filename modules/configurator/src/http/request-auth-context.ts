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

export function getRequestAuthContext(request: FastifyRequest): RequestAuthContext {
  const user = (request as FastifyRequest & { user?: Principal }).user;
  if (!user) {
    return { roles: [], orgId: null, userId: null };
  }
  return {
    roles: normalizeRoles(user.roles),
    orgId: typeof user.orgId === "string" && user.orgId.length > 0 ? user.orgId : null,
    userId: user.userId,
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
