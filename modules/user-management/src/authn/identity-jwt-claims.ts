import { assertUserCanAuthenticate } from "./assert-user-can-authenticate.js";
import type {
  PlatformAdminRepository,
  PrincipalRoleProjectionRepository,
  UserRepository,
} from "../ports/index.js";
import { projectPrincipalRoles } from "../use-cases/project-principal-roles.js";

/** Values merged into the access JWT by better-auth `definePayload` (identity only; no authz). */
export type IdentityJwtClaims = {
  iq_tenant_id: string;
  org_id: string | null;
  roles: string[];
  department: string | null | undefined;
  /**
   * Bounded platform scopes from `platform_admins` membership. `["platform"]` for an operator,
   * else `[]`. The payload builder omits `iq_tenant_id` from the operator token (scope carries a
   * tenant-less authority); `iq_tenant_id` above stays the operator's HOME tenant for enrichment.
   */
  scopes: string[];
};

export type IdentityJwtClaimsDeps = {
  userRepository: UserRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  platformAdminRepository: PlatformAdminRepository;
};

/**
 * Resolves HIMS identity claims from persistence for JWT issuance.
 * Capabilities, delegations, and clearances must never appear here — only {@link PrincipalService} / repos enrich those.
 */
export async function loadIdentityJwtClaims(
  deps: IdentityJwtClaimsDeps,
  platformUserId: string,
): Promise<IdentityJwtClaims | null> {
  const row = await deps.userRepository.findUserByGlobalId(platformUserId);
  if (row === null) {
    return null;
  }
  assertUserCanAuthenticate(row);

  const [roles, isPlatformAdmin] = await Promise.all([
    projectPrincipalRoles(
      { principalRoleProjectionRepository: deps.principalRoleProjectionRepository },
      row.iq_tenant_id,
      row.id,
    ),
    deps.platformAdminRepository.isPlatformAdmin(row.id),
  ]);

  return {
    iq_tenant_id: row.iq_tenant_id,
    org_id: row.org_id ?? null,
    roles,
    department: row.department ?? undefined,
    scopes: isPlatformAdmin ? ["platform"] : [],
  };
}
