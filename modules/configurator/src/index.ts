export { createRouter } from "./router.js";
export type { ConfiguratorRouterOptions } from "./router.js";

export { ConfiguratorError } from "./errors.js";

export { createOrganization } from "./use-cases/create-organization.js";
export { createOrganizationWithDefaultTenant } from "./use-cases/create-organization-with-default-tenant.js";
export type { OrganizationWithDefaultTenantResult } from "./use-cases/create-organization-with-default-tenant.js";
export { getOrganizationById } from "./use-cases/get-organization-by-id.js";
export { updateOrganization } from "./use-cases/update-organization.js";
export { createTenant } from "./use-cases/create-tenant.js";
export { getTenantById } from "./use-cases/get-tenant-by-id.js";
export { updateTenant } from "./use-cases/update-tenant.js";

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

export type {
  OrganizationRepo,
  TenantRepo,
  ConfiguratorTransactionRepos,
  RunConfiguratorTransaction,
} from "./ports.js";

export { DrizzleOrganizationRepo } from "./data-access/organization.repo.js";
export { DrizzleTenantRepo } from "./data-access/tenant.repo.js";

export {
  configuratorSchema,
  organizations,
  tenants,
} from "./schema/tables.js";
