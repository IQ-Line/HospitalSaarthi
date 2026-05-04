export { createRouter } from "./router.js";
export type { ConfiguratorRouterOptions } from "./router.js";

export type {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationFilters,
  OrganizationType,
  OrganizationStatus,
} from "./domain/organization.types.js";

export type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  TenantFilters,
  TenantType,
  ProvisioningStatus,
  DataIsolationLevel,
} from "./domain/tenant.types.js";

export type { OrganizationRepo, TenantRepo } from "./ports.js";

export { DrizzleOrganizationRepo } from "./data-access/organization.repo.js";
export { DrizzleTenantRepo } from "./data-access/tenant.repo.js";

export {
  configuratorSchema,
  organizations,
  tenants,
  moduleProjection,
  configSchemaProjection,
  featureFlagProjection,
  tenantModules,
  tenantFeatureFlags,
  tenantModuleConfigs,
  integrationProfiles,
  tenantProvisioningLog,
  configChangeAudit,
} from "./schema/tables.js";
