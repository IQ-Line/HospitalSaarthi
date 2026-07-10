/**
 * The canonical platform super-admin role code — now a DISPLAY LABEL ONLY.
 *
 * Platform authority no longer flows from this string. It is the additive `scope:platform` claim,
 * issued only from `platform_admins` membership on a signed token and checked as
 * `"platform" in request.principal.attr.scopes` in the PDP (and `Principal.scopes` at the BFF edge
 * / in {@link ../http/resolve-effective-tenant-id.ts} `isPlatformSuperAdminRequest`). A tenant that
 * mints a role named "super-admin" therefore gains NOTHING.
 *
 * The reservation below is retained as defense-in-depth: a tenant still may not mint a
 * confusingly-named platform role. Keeping the constant in the domain layer lets the use-case
 * guard and any display code share one source of truth.
 */
export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

/**
 * Role codes a tenant may NOT assign — neither as a role's `code` NOR its `role_type`.
 * Both fields are projected into the principal's role-code set
 * ({@link ../data-access/drizzle-principal-role-projection-repository.ts} pushes code AND
 * role_type). The reservation covers both axes so a tenant cannot inject the reserved platform
 * label through either. This is now hygiene, not a security gate — authority is `scope:platform`,
 * which a tenant cannot self-assign regardless of role naming.
 *
 * The legitimate platform operator's display role is seeded via a direct insert
 * ({@link ../dev/platform-data-bootstrap.ts}), which bypasses the `createRole` / `updateRole`
 * use-cases entirely — so this guard never blocks the legitimate path and needs no escape hatch.
 * (`normalizeRoleType` ≡ `normalizeRoleCode`, so the same Set applies to both axes.)
 *
 * Entries are already canonical (lowercased, trimmed); compare against the result of
 * {@link normalizeRoleCode} / {@link normalizeRoleType}, not raw input.
 */
export const RESERVED_ROLE_CODES: ReadonlySet<string> = new Set([PLATFORM_SUPER_ADMIN_ROLE]);

/** True when a normalized role code is platform-reserved (tenants may not assign it). */
export function isReservedRoleCode(normalizedRoleCode: string): boolean {
  return RESERVED_ROLE_CODES.has(normalizedRoleCode);
}
