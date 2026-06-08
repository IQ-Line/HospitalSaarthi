/**
 * Tenant binding mode (platform-security LLD §4.3).
 *
 * - `jwt`: authoritative tenant from verified JWT (`request.user.tenantId`). Headers are
 *   optional; a conflicting header yields `AUTH_TENANT_MISMATCH`.
 * - `header-or-jwt`: legacy dev path — header first, then JWT claim fallback.
 */
export type TenantSource = "jwt" | "header-or-jwt";

export type TenantPluginOptions = {
  tenantSource?: TenantSource;
};
