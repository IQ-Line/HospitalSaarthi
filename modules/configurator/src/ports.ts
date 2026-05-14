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

/** Repos scoped to one DB transaction (atomic org + default tenant, etc.). */
export type ConfiguratorTransactionRepos = {
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
};

export type RunConfiguratorTransaction = <T>(
  fn: (repos: ConfiguratorTransactionRepos) => Promise<T>,
) => Promise<T>;
