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

export interface OrganizationRepo {
  findAll(filters?: OrganizationFilters): Promise<Organization[]>;
  findById(id: string): Promise<Organization | undefined>;
  create(data: CreateOrganizationData): Promise<Organization>;
  update(id: string, data: UpdateOrganizationData): Promise<Organization | undefined>;
}

export interface TenantRepo {
  findAll(filters?: TenantFilters): Promise<Tenant[]>;
  findById(id: string): Promise<Tenant | undefined>;
  findByOrgId(orgId: string): Promise<Tenant[]>;
  create(data: CreateTenantData): Promise<Tenant>;
  update(id: string, data: UpdateTenantData): Promise<Tenant | undefined>;
}
