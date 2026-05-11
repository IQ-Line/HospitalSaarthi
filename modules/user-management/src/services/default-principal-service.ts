import type { Principal as IdentityPrincipal } from "@hims/ts-sdk-identity";
import type {
  AbacAttributeRepository,
  AuthContext,
  Principal,
  PrincipalRoleProjectionRepository,
  PrincipalService,
  UserRepository,
} from "../ports/index.js";
import { UserNotFoundError } from "../domain/errors.js";
import { effectiveUmClearanceTierFromClearances } from "../domain/um-clearance-tier.js";
import { projectPrincipalRoles } from "../use-cases/project-principal-roles.js";

export type DefaultPrincipalServiceDeps = {
  userRepository: UserRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  abacAttributeRepository: AbacAttributeRepository;
};

function pickJwtDepartment(requestUser: unknown): string | null {
  if (requestUser == null || typeof requestUser !== "object") return null;
  const d = (requestUser as Record<string, unknown>)["department"];
  return typeof d === "string" && d.length > 0 ? d : null;
}

/** ABAC string attrs: only non-empty persisted values; otherwise null for Cerbos. */
function abacStringFromPersistence(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function warnJwtAbacAttrIgnoredForCerbos(payload: {
  tenantId: string;
  userId: string;
  field: "department" | "org_id";
  jwtValue: string;
}): void {
  console.warn(
    JSON.stringify({
      event: "principal_abac_attr_jwt_supplemental_ignored",
      message:
        "Cerbos ABAC attributes use persistence only; JWT claim present but DB field absent — returning null.",
      ...payload,
    }),
  );
}

function warnAbacAttrAbsentFromPersistence(payload: {
  tenantId: string;
  userId: string;
  field: "department" | "org_id";
}): void {
  console.warn(
    JSON.stringify({
      event: "principal_abac_attr_absent_from_persistence",
      message:
        "No persisted value for this ABAC field; principal.attr will be null (JWT is not used as a fallback).",
      ...payload,
    }),
  );
}

function normalizeCapabilityList(caps: string[]): string[] {
  const set = new Set<string>();
  for (const c of caps) {
    const t = c.trim();
    if (t.length > 0) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function warnMissingRoleCapabilities(
  tenantId: string,
  userId: string,
  roles: readonly string[],
): void {
  console.warn(
    "[user-management] Principal has DB-projected roles but role_capabilities returned no capabilities; authorization will see an empty capability set until rows exist.",
    { tenantId, userId, roles: [...roles] },
  );
}

function asIdentityPrincipal(requestUser: unknown): IdentityPrincipal | null {
  if (requestUser == null || typeof requestUser !== "object") return null;
  const u = requestUser as Partial<IdentityPrincipal>;
  if (typeof u.userId !== "string") return null;
  if (typeof u.tenantId !== "string") return null;
  if (typeof u.orgId !== "string") return null;
  return u as IdentityPrincipal;
}

/**
 * Single source of truth for Cerbos-facing principal material.
 * Capabilities come only from persisted `role_capabilities` (via {@link AbacAttributeRepository.listRoleCapabilitiesForUser}),
 * joined through the principal role projection — never from JWT `roles`.
 *
 * `department` and `org_id` come only from the authoritative user row — never from JWT claims.
 */
export class DefaultPrincipalService implements PrincipalService {
  constructor(private readonly deps: DefaultPrincipalServiceDeps) {}

  async getPrincipal(context: AuthContext): Promise<Principal> {
    const user = await this.deps.userRepository.getUserById(context.tenantId, context.userId);
    if (user === null) {
      throw new UserNotFoundError(context.userId);
    }

    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: this.deps.principalRoleProjectionRepository,
      },
      context.tenantId,
      context.userId,
    );

    const [dbCaps, clearances, delegatedRaw] = await Promise.all([
      this.deps.abacAttributeRepository.listRoleCapabilitiesForUser(
        context.tenantId,
        context.userId,
      ),
      this.deps.abacAttributeRepository.getClearances(context.tenantId, context.userId),
      this.deps.abacAttributeRepository.listDelegatedCapabilities(
        context.tenantId,
        context.userId,
      ),
    ]);

    if (roles.length > 0 && dbCaps.length === 0) {
      warnMissingRoleCapabilities(context.tenantId, context.userId, roles);
    }

    const department = abacStringFromPersistence(user.department);
    const orgIdAttr = abacStringFromPersistence(user.org_id);

    const jwtDept = pickJwtDepartment(context.requestUser);
    if (department === null) {
      if (jwtDept !== null) {
        warnJwtAbacAttrIgnoredForCerbos({
          tenantId: context.tenantId,
          userId: context.userId,
          field: "department",
          jwtValue: jwtDept,
        });
      } else {
        warnAbacAttrAbsentFromPersistence({
          tenantId: context.tenantId,
          userId: context.userId,
          field: "department",
        });
      }
    }

    const jwt = asIdentityPrincipal(context.requestUser);
    if (orgIdAttr === null) {
      if (jwt !== null && jwt.orgId.trim().length > 0) {
        warnJwtAbacAttrIgnoredForCerbos({
          tenantId: context.tenantId,
          userId: context.userId,
          field: "org_id",
          jwtValue: jwt.orgId,
        });
      } else {
        warnAbacAttrAbsentFromPersistence({
          tenantId: context.tenantId,
          userId: context.userId,
          field: "org_id",
        });
      }
    }

    const delegatedCapabilities = [...delegatedRaw].sort((a, b) => a.localeCompare(b));
    const capabilities = normalizeCapabilityList(dbCaps);
    const um_clearance_effective_tier = effectiveUmClearanceTierFromClearances(clearances);

    return {
      id: context.userId,
      roles,
      attributes: {
        iq_tenant_id: context.tenantId,
        department,
        org_id: orgIdAttr,
        capabilities,
        delegated_capabilities: delegatedCapabilities,
        clearances,
        um_clearance_effective_tier,
      },
    };
  }
}

export function createDefaultPrincipalService(
  deps: DefaultPrincipalServiceDeps,
): DefaultPrincipalService {
  return new DefaultPrincipalService(deps);
}
