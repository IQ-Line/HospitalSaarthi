export { createRouter } from "./router.js";
export type { ConfiguratorRouterOptions } from "./router.js";

export { ConfiguratorError } from "./errors.js";

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
  OrganizationRepo,
  TenantRepo,
  TenantModuleRepo,
  ConfiguratorTransactionRepos,
  RunConfiguratorTransaction,
  ModuleCapabilityResolverPort,
  TenantAdminProvisioningPort,
} from "./ports.js";

export { DrizzleOrganizationRepo } from "./data-access/organization.repo.js";
export { DrizzleTenantRepo } from "./data-access/tenant.repo.js";
export { DrizzleTenantModuleRepo } from "./data-access/tenant-module.repo.js";

export {
  configuratorSchema,
  organizations,
  tenants,
  tenantModules,
} from "./schema/tables.js";

export { provisionTenant } from "./use-cases/provision-tenant.js";
export type { ProvisionTenantDeps, ProvisionTenantContext } from "./use-cases/provision-tenant.js";
export {
  TENANT_ONBOARDING_COMPLETED_EVENT,
  TENANT_ONBOARDING_EVENT_CONTRACT_VERSION,
} from "./use-cases/provision-tenant.js";
export type { TenantOnboardingCompletedPayload } from "./use-cases/provision-tenant.js";

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
  TENANT_ADMIN_ROLE_DISPLAY_NAME,
} from "./domain/onboarding.types.js";
