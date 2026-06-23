import type { Principal as IdentityPrincipal } from "@hims/ts-sdk-identity";
import type {
  ModuleEntitlementRequestContext,
  TenantEntitlementResolverPort,
} from "../ports/module-integration-ports.js";
import type {
  AuthContext,
  Principal,
  PrincipalAuthorizationRepository,
  PrincipalRoleProjectionRepository,
  UserRepository,
} from "../ports/index.js";
import { UserNotFoundError } from "../domain/errors.js";
import { assertUserCanAuthenticate } from "../authn/assert-user-can-authenticate.js";
import { effectiveUmClearanceTierFromClearances } from "../domain/um-clearance-tier.js";
import {
  computeEffectivePrincipalCapabilities,
  computeStoredPrincipalCapabilities,
  entitlementIntersectionMetrics,
} from "../use-cases/compute-effective-principal-capabilities.js";
import { projectPrincipalRoles } from "../use-cases/project-principal-roles.js";

export type DefaultPrincipalServiceDeps = {
  userRepository: UserRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
  /** When set with `runtimeEntitlementIntersection`, intersects stored grants with tenant entitlement. */
  tenantEntitlementResolver?: TenantEntitlementResolverPort;
  /** When false, principal emits stored grants only (rollback / tests). Default true when resolver is set. */
  runtimeEntitlementIntersection?: boolean;
  /** Optional structured log for entitlement filter metrics (no PII). */
  logEntitlementIntersection?: (event: Record<string, unknown>, message: string) => void;
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

function asIdentityPrincipal(requestUser: unknown): IdentityPrincipal | null {
  if (requestUser == null || typeof requestUser !== "object") return null;
  const u = requestUser as Partial<IdentityPrincipal>;
  if (typeof u.userId !== "string") return null;
  if (typeof u.tenantId !== "string") return null;
  if (typeof u.orgId !== "string") return null;
  return u as IdentityPrincipal;
}

/**
 * Resolve a single ABAC string attribute from the persisted user row.
 *
 * The value comes only from persistence; when absent we emit a warning that
 * distinguishes "a JWT claim was present but ignored" from "no value anywhere".
 * Returns the persisted (or null) attribute — JWT is never used as a fallback.
 */
function resolveAbacAttribute(args: {
  tenantId: string;
  userId: string;
  field: "department" | "org_id";
  persistedValue: string | null | undefined;
  jwtValue: string | null;
}): string | null {
  const value = abacStringFromPersistence(args.persistedValue);
  if (value !== null) return value;

  if (args.jwtValue !== null) {
    warnJwtAbacAttrIgnoredForCerbos({
      tenantId: args.tenantId,
      userId: args.userId,
      field: args.field,
      jwtValue: args.jwtValue,
    });
  } else {
    warnAbacAttrAbsentFromPersistence({
      tenantId: args.tenantId,
      userId: args.userId,
      field: args.field,
    });
  }
  return null;
}

/** Non-empty `orgId` from a validated identity principal claim, else null. */
function jwtOrgIdClaim(requestUser: unknown): string | null {
  const jwt = asIdentityPrincipal(requestUser);
  if (jwt === null) return null;
  return jwt.orgId.trim().length > 0 ? jwt.orgId : null;
}

type ResolvedCapabilities = {
  capabilities: string[];
  delegatedCapabilities: string[];
  tenantEntitlementRevision: string | undefined;
};

/**
 * Single source of truth for Cerbos-facing principal material.
 *
 * ## Capability enrichment (ADR-0032)
 *
 * Stored grants (`user_capabilities`, `delegated_capability_grants`) are intersected with
 * tenant entitlement (`listAssignableRuntimeCapabilities` capability keys) when
 * `tenantEntitlementResolver` is wired and intersection is enabled.
 *
 * `department` and `org_id` come only from the authoritative user row — never from JWT claims.
 */
export class DefaultPrincipalService {
  constructor(private readonly deps: DefaultPrincipalServiceDeps) {}

  async getPrincipal(context: AuthContext): Promise<Principal> {
    const user = await this.deps.userRepository.getUserById(context.tenantId, context.userId);
    if (user === null) {
      throw new UserNotFoundError(context.userId);
    }
    assertUserCanAuthenticate(user);

    const roles = await projectPrincipalRoles(
      {
        principalRoleProjectionRepository: this.deps.principalRoleProjectionRepository,
      },
      context.tenantId,
      context.userId,
    );

    const [storedDirectKeys, clearances, storedDelegatedKeys] = await Promise.all([
      this.deps.principalAuthorizationRepository.listEffectiveCapabilityKeys(
        context.tenantId,
        context.userId,
      ),
      this.deps.principalAuthorizationRepository.getClearanceLevels(
        context.tenantId,
        context.userId,
      ),
      this.deps.principalAuthorizationRepository.listDelegatedCapabilityKeys(
        context.tenantId,
        context.userId,
      ),
    ]);

    const department = resolveAbacAttribute({
      tenantId: context.tenantId,
      userId: context.userId,
      field: "department",
      persistedValue: user.department,
      jwtValue: pickJwtDepartment(context.requestUser),
    });
    const orgIdAttr = resolveAbacAttribute({
      tenantId: context.tenantId,
      userId: context.userId,
      field: "org_id",
      persistedValue: user.org_id,
      jwtValue: jwtOrgIdClaim(context.requestUser),
    });

    const { capabilities, delegatedCapabilities, tenantEntitlementRevision } =
      await this.resolveCapabilities(context, storedDirectKeys, storedDelegatedKeys);

    const um_clearance_effective_tier = effectiveUmClearanceTierFromClearances(clearances);

    return {
      id: context.userId,
      roles,
      attributes: {
        iq_tenant_id: context.tenantId,
        department,
        org_id: orgIdAttr,
        role_codes: roles,
        capabilities,
        delegated_capabilities: delegatedCapabilities,
        clearances,
        um_clearance_effective_tier,
        ...(tenantEntitlementRevision !== undefined
          ? { tenant_entitlement_revision: tenantEntitlementRevision }
          : {}),
      },
    };
  }

  /**
   * Merge stored capability grants into the principal's effective set.
   *
   * When tenant-entitlement intersection is enabled and a resolver is wired,
   * stored direct/delegated grants are intersected with the tenant's entitled
   * keys (emitting filter metrics); otherwise stored grants pass through as-is.
   */
  private async resolveCapabilities(
    context: AuthContext,
    storedDirectKeys: string[],
    storedDelegatedKeys: string[],
  ): Promise<ResolvedCapabilities> {
    const resolver = this.deps.tenantEntitlementResolver;
    const intersectionEnabled =
      resolver !== undefined && (this.deps.runtimeEntitlementIntersection ?? true);

    if (!intersectionEnabled || resolver === undefined) {
      const stored = computeStoredPrincipalCapabilities(storedDirectKeys, storedDelegatedKeys);
      return {
        capabilities: stored.capabilities,
        delegatedCapabilities: stored.delegated_capabilities,
        tenantEntitlementRevision: undefined,
      };
    }

    const entitlement = await resolver.resolveTenantEntitlement(
      context.tenantId,
      buildEntitlementContext(context),
    );
    const effective = computeEffectivePrincipalCapabilities(
      storedDirectKeys,
      storedDelegatedKeys,
      entitlement.entitledCapabilityKeys,
    );

    this.logIntersectionFilter(context.tenantId, storedDirectKeys, storedDelegatedKeys, effective);

    return {
      capabilities: effective.capabilities,
      delegatedCapabilities: effective.delegated_capabilities,
      tenantEntitlementRevision: entitlement.tenantEntitlementRevision,
    };
  }

  private logIntersectionFilter(
    tenantId: string,
    storedDirectKeys: string[],
    storedDelegatedKeys: string[],
    effective: ReturnType<typeof computeEffectivePrincipalCapabilities>,
  ): void {
    const metrics = entitlementIntersectionMetrics(
      storedDirectKeys,
      storedDelegatedKeys,
      effective,
    );
    if (metrics.filteredDirectCount > 0 || metrics.filteredDelegatedCount > 0) {
      this.deps.logEntitlementIntersection?.(
        {
          event: "principal_entitlement_intersection_filtered",
          tenantId,
          ...metrics,
        },
        "Stored capability grants filtered by tenant entitlement",
      );
    }
  }
}

/** Pass-through context for the entitlement resolver; undefined when nothing to forward. */
function buildEntitlementContext(
  context: AuthContext,
): ModuleEntitlementRequestContext | undefined {
  if (context.authorization === undefined && context.entitlementCachePolicy === undefined) {
    return undefined;
  }
  return {
    ...(context.authorization !== undefined ? { authorization: context.authorization } : {}),
    ...(context.entitlementCachePolicy !== undefined
      ? { cachePolicy: context.entitlementCachePolicy }
      : {}),
  };
}

export function createDefaultPrincipalService(
  deps: DefaultPrincipalServiceDeps,
): DefaultPrincipalService {
  return new DefaultPrincipalService(deps);
}
