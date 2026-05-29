import type {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationFilters,
} from "./domain/organization.types.js";
import type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  TenantFilters,
} from "./domain/tenant.types.js";
import type {
  TenantModule,
  CreateTenantModuleData,
  UpdateTenantModuleData,
  TenantModuleFilters,
  TenantModuleKey,
} from "./domain/tenant-module.types.js";
import type {
  IdentifierOverrides,
  IdentifierType,
  SequenceConfiguration,
  SequenceConfigurationFilters,
  SequenceConfigurationSummary,
} from "./domain/sequence-configuration.js";

export interface OrganizationRepo {
  findAll(filters?: OrganizationFilters): Promise<Organization[]>;
  findById(id: string): Promise<Organization | undefined>;
  findBySlug(slug: string): Promise<Organization | undefined>;
  create(data: CreateOrganizationData): Promise<Organization>;
  update(id: string, data: UpdateOrganizationData): Promise<Organization | undefined>;
}

export interface TenantRepo {
  findAll(filters?: TenantFilters): Promise<Tenant[]>;
  findById(id: string): Promise<Tenant | undefined>;
  findBySlug(slug: string): Promise<Tenant | undefined>;
  findByOrgId(orgId: string): Promise<Tenant[]>;
  findByOrgIdAndBranchCode(
    orgId: string,
    branchCode: string,
  ): Promise<Tenant | undefined>;
  create(data: CreateTenantData): Promise<Tenant>;
  update(id: string, data: UpdateTenantData): Promise<Tenant | undefined>;
}

export interface TenantModuleRepo {
  findAll(filters: TenantModuleFilters): Promise<TenantModule[]>;
  findByKey(key: TenantModuleKey): Promise<TenantModule | undefined>;
  create(data: CreateTenantModuleData): Promise<TenantModule>;
  update(
    key: TenantModuleKey,
    data: UpdateTenantModuleData,
  ): Promise<TenantModule | undefined>;
  delete(key: TenantModuleKey): Promise<boolean>;
}

export interface SequenceConfigurationRepo {
  findByTenantId(tenantId: string): Promise<SequenceConfiguration | undefined>;
  listSummaries(filters?: SequenceConfigurationFilters): Promise<SequenceConfigurationSummary[]>;
  upsertIdentifier(
    tenantId: string,
    identifierType: IdentifierType,
    override: NonNullable<IdentifierOverrides[IdentifierType]>,
    actorId: string | null,
  ): Promise<SequenceConfiguration>;
  removeIdentifier(
    tenantId: string,
    identifierType: IdentifierType,
    actorId: string | null,
  ): Promise<void>;
}

/** Repos scoped to one DB transaction (atomic org + default tenant + tenant modules, etc.). */
export type ConfiguratorTransactionRepos = {
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
  tenantModuleRepo: TenantModuleRepo;
};

export type RunConfiguratorTransaction = <T>(
  fn: (repos: ConfiguratorTransactionRepos) => Promise<T>,
) => Promise<T>;

// ---------------------------------------------------------------------------
// Tenant onboarding cross-module ports
// ---------------------------------------------------------------------------

/**
 * Cross-module port for resolving capabilities from the module catalog.
 * Implemented at the service layer where user-management + master-data are available.
 */
export interface ModuleCapabilityResolverPort {
  resolveCapabilityIdsForModules(moduleIds: string[], tenantId?: string): Promise<string[]>;
}

/**
 * Cross-module port for fetching infrastructure module IDs from Master Data.
 * Returns all active, non-deleted module IDs where module_kind is 'platform' or 'foundation'.
 */
export interface InfrastructureModuleCatalogPort {
  fetchInfrastructureModuleIds(): Promise<string[]>;
}

/**
 * Cross-module port for provisioning the admin role, user, and auth account.
 * Implemented at the service layer where user-management + better-auth are available.
 */
export interface TenantAdminProvisioningPort {
  checkEmailAvailability(email: string): Promise<void>;

  createAuthAccount(input: {
    platformUserId: string;
    tenantId: string;
    fullName: string;
    email: string;
    password: string;
  }): Promise<{ authUserId: string }>;

  createSystemRole(
    tenantId: string,
    input: { code: string; display_name: string; is_system: boolean },
  ): Promise<{ id: string; code: string; display_name: string; is_system: boolean }>;

  replaceRoleCapabilities(
    tenantId: string,
    roleId: string,
    capabilityIds: string[],
  ): Promise<void>;

  provisionUser(
    tenantId: string,
    input: {
      userId: string;
      fullName: string;
      email: string;
      phone?: string | null;
      username?: string | null;
      orgId?: string | null;
      authUserId: string;
      roleId: string;
      roleCapabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<{ id: string; email: string; full_name: string }>;
}
