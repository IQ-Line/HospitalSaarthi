/**
 * The canonical platform super-admin role code.
 *
 * This EXACT string is what the cross-tenant bypass matches (see
 * {@link ../http/resolve-effective-tenant-id.ts} `isPlatformSuperAdminRole`, and the
 * sibling checks in the BFF, configurator, and web). The reservation below and that
 * bypass MUST share one source of truth — otherwise a tenant could mint a code that
 * dodges the reservation but still trips the bypass. Keeping the constant here, in the
 * domain layer, lets both the use-case guard and the http bypass import the same value.
 */
export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

/**
 * Role codes a tenant may NOT assign — neither as a role's `code` NOR its `role_type`.
 * Both fields are projected into the principal's role-code set
 * ({@link ../data-access/drizzle-principal-role-projection-repository.ts} pushes code AND
 * role_type), so both reach the same cross-tenant bypass. They unlock platform-level
 * authority that only the platform's own provisioning may grant.
 *
 * The legitimate platform super-admin role is seeded via a direct insert
 * ({@link ../dev/platform-data-bootstrap.ts}), which bypasses the `createRole` /
 * `updateRole` use-cases entirely — so this guard never blocks the legitimate path and
 * needs no escape hatch. (`normalizeRoleType` ≡ `normalizeRoleCode`, so the same Set
 * applies to both axes.)
 *
 * Entries are already canonical (lowercased, trimmed); compare against the result of
 * {@link normalizeRoleCode} / {@link normalizeRoleType}, not raw input.
 */
export const RESERVED_ROLE_CODES: ReadonlySet<string> = new Set([PLATFORM_SUPER_ADMIN_ROLE]);

/** True when a normalized role code is platform-reserved (tenants may not assign it). */
export function isReservedRoleCode(normalizedRoleCode: string): boolean {
  return RESERVED_ROLE_CODES.has(normalizedRoleCode);
}
