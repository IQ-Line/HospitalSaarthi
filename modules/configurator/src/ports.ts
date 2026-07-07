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
  TenantIntegrationProfile,
  CreateTenantIntegrationProfileData,
  UpdateTenantIntegrationProfileData,
  TenantIntegrationProfileFilters,
  IntegrationKind,
} from "./domain/tenant-integration-profile.types.js";
import type {
  IdentifierOverrides,
  IdentifierType,
  SequenceConfiguration,
  SequenceConfigurationFilters,
  SequenceConfigurationSummary,
} from "./domain/sequence-configuration.js";
import type {
  TenantApiKey,
  CreateTenantApiKeyData,
  UpdateTenantApiKeyStatusData,
  TenantApiKeyFilters,
} from "./domain/tenant-api-key.types.js";

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

export interface TenantIntegrationProfilesRepo {
  findAll(filters: TenantIntegrationProfileFilters): Promise<TenantIntegrationProfile[]>;
  findById(id: string): Promise<TenantIntegrationProfile | undefined>;
  findActiveByTenantId(
    iqTenantId: string,
    integrationKind: IntegrationKind,
  ): Promise<TenantIntegrationProfile | undefined>;
  findActiveByHipId(
    hipId: string,
    integrationKind: IntegrationKind,
  ): Promise<TenantIntegrationProfile | undefined>;
  create(data: CreateTenantIntegrationProfileData): Promise<TenantIntegrationProfile>;
  update(
    id: string,
    iqTenantId: string,
    data: UpdateTenantIntegrationProfileData,
  ): Promise<TenantIntegrationProfile | undefined>;
  delete(id: string, iqTenantId: string): Promise<boolean>;
}

export interface TenantApiKeyRepo {
  findAll(filters: TenantApiKeyFilters): Promise<TenantApiKey[]>;
  findById(tenantId: string, apiKeyId: string): Promise<TenantApiKey | undefined>;
  findByPrefix(prefix: string): Promise<(TenantApiKey & { key_hash: string }) | undefined>;
  create(data: CreateTenantApiKeyData): Promise<TenantApiKey>;
  updateStatus(
    tenantId: string,
    apiKeyId: string,
    data: UpdateTenantApiKeyStatusData,
  ): Promise<TenantApiKey | undefined>;
  touchLastUsed(apiKeyId: string): Promise<void>;
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
 * Cross-module port for the platform module catalog owned by Master Data (`master_global.modules`).
 * Returns the set of VALID (non-deleted) module ids — the Configurator uses it to drop orphaned /
 * soft-deleted `tenant_modules` from entitlement hydration WITHOUT querying `master_data.*` directly
 * (the reach-in its own LLD forbids). Implemented at the service layer as a hand-written HTTP
 * adapter (decision D3). The result is always AUTHORITATIVE — the adapter does not cache (see the
 * adapter for why; the destructive deactivation it feeds must not run off stale data).
 */
export interface PlatformModuleCatalogPort {
  listValidModuleIds(): Promise<Set<string>>;
}

/**
 * Cross-module port for provisioning the admin role, user, and auth account.
 * Implemented at the service layer where user-management + better-auth are available.
 */
export interface TenantAdminProvisioningPort {
  createAuthAccount(input: {
    platformUserId: string;
    tenantId: string;
    fullName: string;
    password: string;
  }): Promise<{ authUserId: string }>;

  createSystemRole(
    tenantId: string,
    input: {
      code: string;
      role_type: string;
      display_name: string;
      is_system: boolean;
    },
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
      /** Required login credential (username-primary). */
      username: string;
      /** Optional contact email — not the login credential. */
      email?: string | null;
      phone?: string | null;
      orgId?: string | null;
      authUserId: string;
      roleId: string;
      roleCapabilityIds: string[];
      actorId: string | null;
    },
  ): Promise<{ id: string; email: string | null; full_name: string }>;
}
