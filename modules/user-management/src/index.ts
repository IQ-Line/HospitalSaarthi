/**
 * User Management module — plugin for HTTP routing; repository adapters for service composition.
 */
export { buildCerbosUserMgmtResourceAttr } from "./authz/cerbos-resource-attr.js";
export type { CerbosUserMgmtResourceAttrInput } from "./authz/cerbos-resource-attr.js";
export { userManagementPlugin } from "./router.js";
export type { UserManagementPluginOptions } from "./router.js";
export {
  principalRoleEnricherPlugin,
} from "./principal-role-enricher-plugin.js";
export type {
  PrincipalRoleEnricherPluginOptions,
} from "./principal-role-enricher-plugin.js";
export { tenantApiKeyAuthPlugin } from "./http/tenant-api-key-auth-plugin.js";
export type { TenantApiKeyAuthPluginOptions } from "./http/tenant-api-key-auth-plugin.js";
export type {
  TenantApiKeyValidationResult,
  TenantApiKeyValidatorPort,
} from "./ports/tenant-api-key-validator.js";
export type { AuthSessionRevokerPort } from "./ports/auth-session-revoker.js";
export type { AuthPasswordResetterPort } from "./ports/auth-password-resetter.js";
export type {
  AuthAccountProvisioner,
  AppliedRoleTemplate,
  CapabilityCatalogSyncPort,
  CapabilityCatalogSyncRequest,
  CapabilityCatalogSyncResult,
  CapabilityRepository,
  RuntimeCapabilityCatalogPort,
  CapabilitySourceCatalog,
  EntitlementRequestContext,
  MasterDataModuleCatalogPort,
  ModuleCatalogPort,
  ModuleEntitlementRequestContext,
  DepartmentCatalogPort,
  DepartmentCatalogRequestContext,
  TenantEntitlementPort,
  TenantEntitlementResolverPort,
  TenantEntitlementResolution,
  TenantModuleEntitlementPort,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
  ListUsersOptions,
  PrincipalRoleProjectionRepository,
  PrincipalAuthorizationRepository,
  RoleCapabilityRepository,
  ReplaceUserCapabilitiesInput,
  UserReadListResourceAbac,
  UserAccessRepository,
  UserProvisioningRepository,
  ProvisionUserWithAccessInput,
  RoleTemplateGrantPlan,
  UserCapabilitiesSnapshot,
  UserCapabilityGrant,
  UserEffectiveCapabilities,
  UserWithTenant,
  AccessTokenIssuerPort,
} from "./ports/index.js";
export {
  loadIdentityJwtClaims,
  type IdentityJwtClaims,
  type IdentityJwtClaimsDeps,
} from "./authn/identity-jwt-claims.js";
export { assertUserCanAuthenticate } from "./authn/assert-user-can-authenticate.js";
export {
  compareCanonicalRoleCodes,
  normalizeRoleCode,
} from "./domain/normalize-role-code.js";
export {
  UM_CAPABILITY_READ,
  UM_ROLE_ASSIGN,
  UM_ROLE_CREATE,
  UM_ROLE_READ,
  UM_ROLE_UPDATE,
  UM_USER_CREATE,
  UM_USER_DELETE,
  UM_USER_READ,
  UM_USER_UPDATE,
} from "./domain/user-management-capabilities.js";
export {
  AuthAccountIdentityMismatchError,
  AuthAccountProvisioningError,
  AuthEmailConflictError,
  DuplicateUsernameError,
  CerbosPrincipalUnavailableError,
  DuplicateUserRoleTemplateError,
  DuplicateRoleCodeError,
  CapabilityNotEntitledForTenantError,
  CapabilityNotFoundError,
  InvalidCapabilityProvenanceError,
  InvalidCapabilityKeyError,
  InvalidModuleSlugError,
  ModuleEntitlementLookupError,
  TenantEntitlementLookupError,
  InvalidRoleSeedError,
  RbacIntegrityViolationError,
  RoleInUseError,
  RoleNotFoundError,
  TenantMismatchError,
  UnexpectedPersistenceError,
  UserRoleTemplateNotFoundError,
  UserAccountDisabledError,
  UserManagementError,
  UserNotFoundError,
  ValidationError,
} from "./domain/errors.js";
export type { ValidationIssue } from "./domain/errors.js";
export {
  replyWithUserManagementError,
  resolveUserManagementHttpError,
} from "./http/map-user-management-error.js";
export {
  assertTenantHeaderAllowedForPrincipal,
  isPlatformSuperAdminPrincipal,
  isPlatformSuperAdminRole,
  resolveEffectiveTenantId,
  resolveJwtTenantIdFromRequest,
} from "./http/resolve-effective-tenant-id.js";
export {
  PLATFORM_SUPER_ADMIN_ROLE,
  RESERVED_ROLE_CODES,
  isReservedRoleCode,
} from "./domain/reserved-role-codes.js";
export {
  syncSuperAdminCapabilitySnapshots,
  type SyncSuperAdminCapabilitySnapshotsInput,
} from "./dev/sync-super-admin-capability-snapshots.js";
export type {
  ResolvedUserManagementHttpError,
  UserManagementErrorBody,
} from "./http/map-user-management-error.js";

export { DrizzleCapabilityRepository } from "./data-access/capability-repository.js";
export { DrizzleRoleCapabilityRepository } from "./data-access/role-capability-repository.js";
export { DrizzleUserAccessRepository } from "./data-access/user-access-repository.js";
export { DrizzlePrincipalRoleProjectionRepository } from "./data-access/drizzle-principal-role-projection-repository.js";
export { DrizzleRoleRepository } from "./data-access/role-repository.js";
export { DrizzleUserRepository } from "./data-access/user-repository.js";
export { DrizzleUserActivationStatusReader } from "./data-access/user-activation-status-reader.js";
export { DrizzleUserProvisioningRepository } from "./data-access/user-provisioning-repository.js";
export { InMemoryUserProvisioningRepository } from "./data-access/in-memory-user-provisioning-repository.js";
export { InMemoryCapabilityRepository } from "./data-access/in-memory-capability-repository.js";
export { InMemoryUserAccessRepository } from "./data-access/in-memory-user-access-repository.js";
export { InMemoryRoleRepository } from "./data-access/in-memory-role-repository.js";
export { InMemoryRoleCapabilityRepository } from "./data-access/in-memory-role-capability-repository.js";
export { InMemoryPrincipalRoleProjectionRepository } from "./data-access/in-memory-principal-role-projection-repository.js";
export { InMemoryUserRepository } from "./data-access/in-memory-user-repository.js";
export { DrizzlePrincipalAuthorizationRepository } from "./data-access/principal-authorization-repository.js";
export { InMemoryPrincipalAuthorizationRepository } from "./data-access/in-memory-principal-authorization-repository.js";
export { createDefaultPrincipalService } from "./services/default-principal-service.js";
export type { DefaultPrincipalServiceDeps } from "./services/default-principal-service.js";
export { DefaultPrincipalService } from "./services/default-principal-service.js";
export {
  CachedTenantEntitlementResolver,
  isRuntimeEntitlementIntersectionEnabled,
} from "./services/cached-tenant-entitlement-resolver.js";
export { createRuntimeEntitlementPrincipalWiring } from "./services/create-runtime-entitlement-principal-wiring.js";
export type {
  CreateRuntimeEntitlementPrincipalWiringInput,
  RuntimeEntitlementPrincipalWiring,
} from "./services/create-runtime-entitlement-principal-wiring.js";
export {
  createPepRuntimeAuthFromUrls,
  requirePepUpstreamBaseUrl,
} from "./services/create-pep-runtime-auth-from-urls.js";
export type {
  CreatePepRuntimeAuthFromUrlsInput,
  PepRuntimeAuthWiring,
} from "./services/create-pep-runtime-auth-from-urls.js";
export {
  HttpConfiguratorTenantModuleEntitlementAdapter,
  HttpConfiguratorTenantModulesAdapter,
} from "./adapters/http-configurator-tenant-module-entitlement-adapter.js";
export type { HttpConfiguratorTenantModuleEntitlementAdapterOptions } from "./adapters/http-configurator-tenant-module-entitlement-adapter.js";
export { HttpMasterDataModuleCatalogAdapter } from "./adapters/http-master-data-module-catalog-adapter.js";
export type { HttpMasterDataModuleCatalogAdapterOptions } from "./adapters/http-master-data-module-catalog-adapter.js";
export { intersectCapabilityKeys } from "./domain/intersect-capability-keys.js";
export { resolveTenantEntitledCapabilityKeys } from "./use-cases/resolve-tenant-entitled-capability-keys.js";
export {
  computeEffectivePrincipalCapabilities,
  computeStoredPrincipalCapabilities,
  entitlementIntersectionMetrics,
} from "./use-cases/compute-effective-principal-capabilities.js";
export { registerTenantEntitlementCacheEventConsumers } from "./events/consumers/tenant-entitlement-cache-consumer.js";
export {
  capabilities,
  delegated_capability_grants,
  role_capabilities,
  roles,
  user_capabilities,
  user_roles,
  userManagementSchema,
  user_clearances,
  users,
} from "./schema/tables.js";
export {
  USER_MANAGEMENT_EVENT_TYPES,
  USER_MANAGEMENT_EVENT_USER_CREATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
  USER_MANAGEMENT_EVENT_ROLE_REVOKED,
} from "./events/constants.js";
export { getPrincipal } from "./use-cases/get-principal.js";
export type { GetPrincipalDeps } from "./use-cases/get-principal.js";
export { createRole } from "./use-cases/create-role.js";
export type { CreateRoleDeps } from "./use-cases/create-role.js";
export { applyRoleTemplate } from "./use-cases/apply-role-template.js";
export type { ApplyRoleTemplateDeps } from "./use-cases/apply-role-template.js";
export { deactivateUser } from "./use-cases/deactivate-user.js";
export type { DeactivateUserDeps } from "./use-cases/deactivate-user.js";
export { activateUser } from "./use-cases/activate-user.js";
export type { ActivateUserDeps } from "./use-cases/activate-user.js";
export { resetUserPassword } from "./use-cases/reset-user-password.js";
export type {
  ResetUserPasswordDeps,
  ResetUserPasswordContext,
  ResetUserPasswordInput,
} from "./use-cases/reset-user-password.js";
export { deleteRole } from "./use-cases/delete-role.js";
export type { DeleteRoleDeps } from "./use-cases/delete-role.js";
export { detachRoleTemplate } from "./use-cases/detach-role-template.js";
export type { DetachRoleTemplateDeps } from "./use-cases/detach-role-template.js";
export { getCapabilityById } from "./use-cases/get-capability.js";
export type { GetCapabilityDeps } from "./use-cases/get-capability.js";
export { getUserCapabilities } from "./use-cases/get-user-capabilities.js";
export type { GetUserCapabilitiesDeps } from "./use-cases/get-user-capabilities.js";
export { getUserEffectiveCapabilities } from "./use-cases/get-user-effective-capabilities.js";
export type { GetUserEffectiveCapabilitiesDeps } from "./use-cases/get-user-effective-capabilities.js";
export { getRoleById } from "./use-cases/get-role.js";
export type { GetRoleDeps } from "./use-cases/get-role.js";
export { getRoleCapabilities } from "./use-cases/get-role-capabilities.js";
export type { GetRoleCapabilitiesDeps } from "./use-cases/get-role-capabilities.js";
export { listCapabilities } from "./use-cases/list-capabilities.js";
export type { ListCapabilitiesDeps } from "./use-cases/list-capabilities.js";
export { listAssignableCapabilities } from "./use-cases/list-assignable-capabilities.js";
export type { ListAssignableCapabilitiesDeps } from "./use-cases/list-assignable-capabilities.js";
export { listAssignableRuntimeCapabilities } from "./use-cases/list-assignable-runtime-capabilities.js";
export type {
  ListAssignableRuntimeCapabilitiesDeps,
  ListAssignableRuntimeCapabilitiesOptions,
} from "./use-cases/list-assignable-runtime-capabilities.js";
export { assertRuntimeCapabilitiesEntitledForTenant } from "./use-cases/assert-runtime-capabilities-entitled-for-tenant.js";
export {
  MODULE_SLUG_PATTERN,
  assertValidModuleSlug,
  isValidModuleSlug,
  normalizeModuleSlug,
  normalizeModuleSlugSet,
} from "./domain/module-slug.js";
export {
  filterRuntimeCapabilitiesByMasterDataLinks,
  isRuntimeCapabilityAssignableForTenant,
  masterDataSourcePairKey,
  MODULE_PERMISSION_PAIR_SEPARATOR,
  parseMasterDataSourcePairKey,
} from "./domain/master-data-source-pair.js";
export {
  expandModuleIdsWithDescendants,
  expandModuleSlugsWithDescendants,
  isCatalogL1Module,
  moduleSlugsForIds as catalogModuleSlugsForIds,
} from "./domain/catalog-module-tree.js";
export type { CatalogModuleRef } from "./domain/catalog-module-tree.js";
export {
  CAPABILITY_KEY_SEGMENT_PATTERN,
  RUNTIME_CAPABILITY_ACTIONS,
  RUNTIME_CAPABILITY_KEY_PATTERN,
  RUNTIME_MODULE_KEY_BY_CATALOG_SLUG,
  RESERVED_RUNTIME_MODULE_KEYS,
  assertCapabilityKeyMatchesCatalogModule,
  assertValidCapabilityKey,
  assertValidRuntimeCapabilityRow,
  catalogSlugForRuntimeModuleKey,
  findDuplicateCapabilityKeys,
  normalizeCapabilityKey,
  parseCapabilityKey,
  runtimeModuleKeyForCatalogSlug,
} from "./domain/capability-key.js";
export type {
  ParsedCapabilityKey,
  RuntimeCapabilityAction,
  RuntimeCapabilityRowShape,
} from "./domain/capability-key.js";
export {
  mapMasterDataPermissionToRuntimeCapability,
  suggestMasterDataPermissionSlug,
} from "./domain/map-master-data-permission.js";
export {
  loadMasterDataModulePermissions,
  syncCapabilitiesFromMasterDataCatalog,
} from "./dev/sync-capabilities-from-master-data-catalog.js";
export {
  LEGACY_CAPABILITY_KEY_PREFIXES,
  isLegacyCapabilityKey,
} from "./dev/legacy-capability-key-prefixes.js";
export {
  listLegacyCapabilityKeys,
  removeLegacyCapabilitiesFromCatalog,
} from "./dev/remove-legacy-capabilities.js";
export type {
  MasterDataModulePermissionRow,
  SyncCapabilitiesFromMasterDataResult,
} from "./dev/sync-capabilities-from-master-data-catalog.js";
export type {
  RemoveLegacyCapabilitiesOptions,
  RemoveLegacyCapabilitiesResult,
} from "./dev/remove-legacy-capabilities.js";
export type {
  MappedRuntimeCapability,
  MasterDataPermissionRef,
} from "./domain/map-master-data-permission.js";
export {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "./domain/runtime-authorization-limits.js";
export {
  validateRuntimeAuthorizationStartup,
  formatRuntimeAuthorizationStartupFailure,
} from "./startup/validate-runtime-authorization.js";
export type {
  RuntimeAuthorizationStartupDiagnostic,
  ValidateRuntimeAuthorizationStartupInput,
  ValidateRuntimeAuthorizationStartupResult,
} from "./startup/validate-runtime-authorization.js";
export { createDefaultRuntimeCapabilityCatalogPort } from "./services/default-runtime-capability-catalog-port.js";
export {
  normalizeCapabilityProvenance,
} from "./domain/capability-provenance.js";
export type { CapabilityProvenanceInput } from "./domain/capability-provenance.js";
export {
  PLATFORM_ASSIGNABLE_MODULE_SLUGS,
  PLATFORM_RUNTIME_MODULE_SLUGS,
  isPlatformRuntimeModuleSlug,
} from "./domain/platform-module-slugs.js";
export type {
  PlatformAssignableModuleSlug,
  PlatformRuntimeModuleSlug,
} from "./domain/platform-module-slugs.js";
export { listRoles } from "./use-cases/list-roles.js";
export type { ListRolesDeps } from "./use-cases/list-roles.js";
export { listUserRoles } from "./use-cases/list-user-roles.js";
export type { ListUserRolesDeps } from "./use-cases/list-user-roles.js";
export { replaceRoleCapabilities } from "./use-cases/replace-role-capabilities.js";
export type { ReplaceRoleCapabilitiesDeps } from "./use-cases/replace-role-capabilities.js";
export { replaceUserCapabilities } from "./use-cases/replace-user-capabilities.js";
export type { ReplaceUserCapabilitiesDeps } from "./use-cases/replace-user-capabilities.js";
export { updateRole } from "./use-cases/update-role.js";
export type { UpdateRoleDeps } from "./use-cases/update-role.js";
export { AUTHENTICATE_LOCAL_PHASE_1A_OWNER } from "./use-cases/authenticate-local.js";
export { FEDERATE_LOGIN_PHASE_1A_OWNER } from "./use-cases/federate-login.js";
export {
  USER_MANAGEMENT_EVENT_CONTRACTS,
  USER_MANAGEMENT_USER_EVENT_CONTRACT_VERSION,
} from "./events/contracts.js";
