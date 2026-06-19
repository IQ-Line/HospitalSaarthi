export { applyConfiguratorSchemaMigration } from "./schema/apply-migration.js";

export { ConfiguratorError } from "./errors.js";
export {
  CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES,
  CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS,
} from "./http/configurator-identity-skip-paths.js";
export {
  configuratorPublicTenantReadAuthPlugin,
  isConfiguratorPublicTenantRead,
} from "./http/configurator-public-tenant-read-auth-plugin.js";

export { createOrganization } from "./use-cases/create-organization.js";
export { createOrganizationWithDefaultTenant } from "./use-cases/create-organization-with-default-tenant.js";
export type { OrganizationWithDefaultTenantResult } from "./use-cases/create-organization-with-default-tenant.js";
export { createOrganizationWithDefaultTenantAndTenantModules } from "./use-cases/create-organization-with-default-tenant-and-modules.js";
export type {
  OrganizationProvisionWithModulesResult,
  TenantModuleEnablementInput,
} from "./use-cases/create-organization-with-default-tenant-and-modules.js";
export { getOrganizationById } from "./use-cases/get-organization-by-id.js";
export { updateOrganization } from "./use-cases/update-organization.js";
export { createTenant } from "./use-cases/create-tenant.js";
export { getTenantById } from "./use-cases/get-tenant-by-id.js";
export { updateTenant } from "./use-cases/update-tenant.js";
export { createTenantModule } from "./use-cases/create-tenant-module.js";
export { getTenantModuleByKey } from "./use-cases/get-tenant-module-by-key.js";
export { updateTenantModule } from "./use-cases/update-tenant-module.js";
export { deleteTenantModule } from "./use-cases/delete-tenant-module.js";
export { listTenantIntegrationProfiles } from "./use-cases/list-tenant-integration-profiles.js";
export { createTenantIntegrationProfile } from "./use-cases/create-tenant-integration-profile.js";
export { getTenantIntegrationProfileById } from "./use-cases/get-tenant-integration-profile-by-id.js";
export { getActiveIntegrationProfileByHipId } from "./use-cases/get-active-integration-profile-by-hip-id.js";
export { updateTenantIntegrationProfile } from "./use-cases/update-tenant-integration-profile.js";
export { deleteTenantIntegrationProfile } from "./use-cases/delete-tenant-integration-profile.js";

export type {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationFilters,
  OrganizationType,
  OrganizationStatus,
  TenantOrganizationWizardMetadata,
} from "./domain/organization.types.js";

export type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  TenantFilters,
  TenantType,
  BranchType,
  ProvisioningStatus,
  DataIsolationLevel,
} from "./domain/tenant.types.js";

export type {
  TenantModule,
  CreateTenantModuleData,
  UpdateTenantModuleData,
  TenantModuleFilters,
  TenantModuleKey,
} from "./domain/tenant-module.types.js";

export type {
  TenantIntegrationProfile,
  CreateTenantIntegrationProfileData,
  UpdateTenantIntegrationProfileData,
  TenantIntegrationProfileFilters,
  IntegrationKind,
} from "./domain/tenant-integration-profile.types.js";

export type {
  TenantApiKey,
  TenantApiKeyCreateResult,
  TenantApiKeyEnvironment,
  TenantApiKeyPurpose,
  TenantApiKeyStatus,
} from "./domain/tenant-api-key.types.js";

export { listTenantApiKeys } from "./use-cases/list-tenant-api-keys.js";
export { createTenantApiKey } from "./use-cases/create-tenant-api-key.js";
export { updateTenantApiKeyStatus } from "./use-cases/update-tenant-api-key-status.js";

export type {
  OrganizationRepo,
  TenantRepo,
  TenantModuleRepo,
  TenantIntegrationProfilesRepo,
  TenantApiKeyRepo,
  SequenceConfigurationRepo,
  ConfiguratorTransactionRepos,
  RunConfiguratorTransaction,
  ModuleCapabilityResolverPort,
  InfrastructureModuleCatalogPort,
  TenantAdminProvisioningPort,
} from "./ports.js";

export { DrizzleOrganizationRepo } from "./data-access/organization.repo.js";
export { DrizzleTenantRepo } from "./data-access/tenant.repo.js";
export { DrizzleTenantModuleRepo } from "./data-access/tenant-module.repo.js";
export { DrizzleTenantIntegrationProfilesRepo } from "./data-access/tenant-integration-profile.repo.js";
export { DrizzleSequenceConfigurationRepo } from "./data-access/sequence-configuration.repo.js";
export { DrizzleTenantApiKeyRepo } from "./data-access/tenant-api-key.repo.js";

export {
  configuratorSchema,
  organizations,
  tenants,
  tenantModules,
  tenantIntegrationProfiles,
  sequenceConfiguration,
  tenantApiKeys,
} from "./schema/tables.js";

export { provisionTenant } from "./use-cases/provision-tenant.js";
export type { ProvisionTenantDeps, ProvisionTenantContext } from "./use-cases/provision-tenant.js";
export {
  TENANT_ONBOARDING_COMPLETED_EVENT,
  TENANT_ONBOARDING_EVENT_CONTRACT_VERSION,
} from "./use-cases/provision-tenant.js";
export type { TenantOnboardingCompletedPayload } from "./use-cases/provision-tenant.js";

export {
  MODULE_DISABLED_EVENT,
  MODULE_ENABLED_EVENT,
  publishTenantModuleLifecycleEvent,
} from "./events/publish-tenant-module-lifecycle-event.js";
export type { TenantModuleLifecyclePayload } from "./events/publish-tenant-module-lifecycle-event.js";

export type {
  ProvisionTenantInput,
  ProvisionTenantResult,
  ProvisionedRole,
  ProvisionedUser,
  ProvisionedTenant,
  ProvisionedTenantModule,
} from "./domain/onboarding.types.js";
export {
  TENANT_ADMIN_ROLE_CODE,
  TENANT_ADMIN_ROLE_TYPE,
  TENANT_ADMIN_ROLE_DISPLAY_NAME,
} from "./domain/onboarding.types.js";
