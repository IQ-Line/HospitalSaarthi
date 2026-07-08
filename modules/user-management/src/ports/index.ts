/**
 * Port interfaces (repositories, auth adapters). Data shapes live in `domain/types.ts`.
 */

import type {
  AppliedRoleTemplate,
  Capability,
  AuthContext,
  CreateUserInput,
  CreateRoleInput,
  Principal,
  ReplaceRoleCapabilitiesInput,
  Role,
  UpdateRoleInput,
  UpdateUserInput,
  UserCapabilityGrant,
  User,
} from "../domain/types.js";

import type { UserReadListResourceAbac } from "../domain/user-read-list-resource-filter.js";

export type {
  AppliedRoleTemplate,
  Capability,
  AuthContext,
  CreateUserInput,
  CreateRoleInput,
  Principal,
  PrincipalAttributes,
  ReplaceRoleCapabilitiesInput,
  ReplaceUserCapabilitiesInput,
  Role,
  RoleStatus,
  UpdateRoleInput,
  UpdateUserInput,
  UserCapabilitiesSnapshot,
  UserCapabilityGrant,
  UserCapabilityGrantSource,
  UserEffectiveCapabilities,
  User,
  UserStatus,
} from "../domain/types.js";

export type { UserReadListResourceAbac };

export type { UserActivationFacts } from "../domain/user-activation.js";
export type { UserActivationStatusReaderPort } from "./user-activation-status-reader.js";

export type ListUsersOptions = {
  /** When set, repository applies SQL/in-memory resource ABAC aligned with `user.read` (department + clearance). */
  userReadResourceAbac?: UserReadListResourceAbac;
  /** When set, filters to users whose `department` column matches exactly. */
  department?: string;
  /**
   * When true, the row includes each user's assigned role display names
   * (`role_display_names`). Costs a LEFT JOIN over `user_roles` + `roles` and a
   * GROUP BY, so callers that don't render role names (e.g. the provider
   * picklist) leave it off to keep the common read path a plain projection.
   */
  includeRoleDisplayNames?: boolean;
};

/** Platform user plus owning tenant (for JWT `iq_tenant_id` resolution by global user id). */
export type UserWithTenant = User & { iq_tenant_id: string };

export type CreatePasswordAuthAccountInput = {
  platformUserId: string;
  tenantId: string;
  fullName: string;
  /**
   * Username-primary login handle. The better-auth adapter derives the synthetic identity-anchor
   * email (`{username}@auth.internal`) from this; real contact email never enters this boundary
   * (authn spec §10.2 / §15.1).
   */
  username: string;
  password: string;
};

export type CreatePasswordAuthAccountResult = {
  authUserId: string;
};

export type UserApiKeyRecord = User & { iq_tenant_id: string; api_key_hash: string };

export type AccessTokenIssuerPort = {
  issueForPlatformUser(platformUserId: string): Promise<{
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
  }>;
};

export interface UserRepository {
  createUser(tenantId: string, input: CreateUserInput): Promise<User>;
  getUserById(tenantId: string, userId: string): Promise<User | null>;
  /**
   * Resolves a platform user from JWT `sub` (platform user id or linked `auth_user_id`).
   * Prefer tenant-scoped {@link getUserById} when tenant and platform user id are both known.
   */
  findUserByGlobalId(identityUserId: string): Promise<UserWithTenant | null>;
  /** Resolves a linked platform user from better-auth username (global). */
  findUserByAuthUsername(username: string): Promise<UserWithTenant | null>;
  /** Resolves a linked platform user from credential or profile email. */
  findUserByEmail(email: string): Promise<UserWithTenant | null>;
  findActiveUserByApiKeyPrefix(prefix: string): Promise<UserApiKeyRecord | null>;
  listUsers(tenantId: string, options?: ListUsersOptions): Promise<User[]>;
  updateUser(tenantId: string, userId: string, input: UpdateUserInput): Promise<User | null>;
}

export interface AuthAccountProvisioner {
  createPasswordAccount(
    input: CreatePasswordAuthAccountInput,
  ): Promise<CreatePasswordAuthAccountResult>;
}

/** Principal enrichment source: effective capability keys, delegated capability keys, and clearances. */
export interface PrincipalAuthorizationRepository {
  listEffectiveCapabilityKeys(tenantId: string, userId: string): Promise<string[]>;
  getClearanceLevels(tenantId: string, userId: string): Promise<Record<string, string>>;
  listDelegatedCapabilityKeys(tenantId: string, userId: string): Promise<string[]>;
}

export interface CapabilityRepository {
  getCapabilityById(capabilityId: string): Promise<Capability | null>;
  listCapabilities(): Promise<Capability[]>;
  listCapabilitiesByIds(capabilityIds: string[]): Promise<Capability[]>;
  listCapabilitiesByKeys(capabilityKeys: string[]): Promise<Capability[]>;
  /** Active runtime capabilities whose `module` slug is in the given set. */
  listActiveRuntimeCapabilitiesByModuleSlugs(moduleSlugs: string[]): Promise<Capability[]>;
}

export type {
  CapabilitySourceCatalog,
} from "../domain/module-slug.js";
export type {
  DepartmentCatalogPort,
  DepartmentCatalogRequestContext,
  EntitlementRequestContext,
  MasterDataModuleCatalogPort,
  ModuleCatalogPort,
  ModuleEntitlementRequestContext,
  TenantEntitlementPort,
  TenantEntitlementResolverPort,
  TenantEntitlementResolution,
  TenantModuleEntitlementPort,
} from "./module-integration-ports.js";
export type {
  CapabilityCatalogSyncPort,
  CapabilityCatalogSyncRequest,
  CapabilityCatalogSyncResult,
  RuntimeCapabilityCatalogPort,
} from "./capability-catalog-ports.js";
export type {
  ProvisionUserWithAccessInput,
  RoleTemplateGrantPlan,
  UserProvisioningRepository,
} from "./user-provisioning-repository.js";

export interface RoleRepository {
  getRoleById(tenantId: string, roleId: string): Promise<Role | null>;
  listRoles(tenantId: string): Promise<Role[]>;
  listRolesByIds(tenantId: string, roleIds: string[]): Promise<Role[]>;
  createRole(tenantId: string, input: CreateRoleInput): Promise<Role>;
  updateRole(tenantId: string, roleId: string, input: UpdateRoleInput): Promise<Role | null>;
  deleteRole(tenantId: string, roleId: string): Promise<Role | null>;
}

export interface RoleCapabilityRepository {
  listCapabilitiesByRole(tenantId: string, roleId: string): Promise<Capability[]>;
  replaceCapabilitiesForRole(
    tenantId: string,
    roleId: string,
    input: ReplaceRoleCapabilitiesInput,
  ): Promise<Capability[]>;
}

export interface UserAccessRepository {
  applyRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate>;
  detachRoleTemplate(
    tenantId: string,
    input: {
      userId: string;
      roleId: string;
      actorId: string | null;
    },
  ): Promise<AppliedRoleTemplate | null>;
  listRoleTemplatesByUser(tenantId: string, userId: string): Promise<AppliedRoleTemplate[]>;
  listActiveCapabilityGrantsByUser(tenantId: string, userId: string): Promise<UserCapabilityGrant[]>;
  replaceManualCapabilityGrants(
    tenantId: string,
    input: {
      userId: string;
      capabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<UserCapabilityGrant[]>;
}

/**
 * Tenant-scoped projection of assigned role codes for principal enrichment.
 * Implementations should use a single round-trip (e.g. JOIN) so the auth path stays O(1) in queries.
 * Additional RBAC dimensions (capabilities, scoped grants) can extend the same query with further JOINs.
 */
export interface PrincipalRoleProjectionRepository {
  listRoleCodesByUser(tenantId: string, userId: string): Promise<string[]>;
  /** Clears instance-scoped projection cache (e.g. after role mutations in the same process). */
  clearCache(): void;
}

/**
 * Platform-operator membership lookup — the bounded `scope:platform` source of truth.
 * Tenant-less: keyed by the GLOBAL platform user id (`users.id`). Backs both JWT `scopes`
 * issuance and the Cerbos `principal.attr.scopes` enrichment. Membership carries no
 * capabilities; it grants only the additive platform-provisioning scope.
 */
export interface PlatformAdminRepository {
  /** True when the global platform user is a bounded platform operator (`scope:platform`). */
  isPlatformAdmin(globalUserId: string): Promise<boolean>;
}

/**
 * Wraps better-auth / JWT verification. Resolves `sub` and `iq_tenant_id` from the active request.
 */
export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>;
}

/**
 * Builds the PEP-enriched principal (JWT claims + cached AuthZ data per LLD §7).
 * Callers pass verified context from {@link AuthProvider}; {@link AuthContext.requestUser} carries
 * the host’s `request.user` (e.g. JWT-derived principal) when supplied.
 */
export interface PrincipalService {
  getPrincipal(context: AuthContext): Promise<Principal>;
}
