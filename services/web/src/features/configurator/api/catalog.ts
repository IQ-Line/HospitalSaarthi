import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';
import type {
  ConfiguratorTenant,
  ConfiguratorTenantListResponse,
  Organization,
  OrganizationListResponse,
  OrganizationStatus,
  OrganizationType,
} from '../types';

const ORGANIZATIONS_BASE = '/api/configurator/v1/organizations';
const TENANTS_BASE = '/api/configurator/v1/tenants';

export type OrganizationListFilters = {
  status?: OrganizationStatus;
  type?: OrganizationType;
};

export type TenantListFilters = {
  org_id?: string;
  parent_tenant_id?: string;
  is_root?: boolean;
  provisioning_status?: string;
  type?: string;
};

function buildOrganizationsUrl(filters: OrganizationListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `${ORGANIZATIONS_BASE}?${qs}` : ORGANIZATIONS_BASE;
}

function buildTenantsUrl(filters: TenantListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.org_id) params.set('org_id', filters.org_id);
  if (filters.parent_tenant_id) params.set('parent_tenant_id', filters.parent_tenant_id);
  if (filters.is_root === true) params.set('is_root', 'true');
  if (filters.provisioning_status) params.set('provisioning_status', filters.provisioning_status);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `${TENANTS_BASE}?${qs}` : TENANTS_BASE;
}

/** Imperative fetch — organizations catalog. */
export function fetchOrganizations(
  filters: OrganizationListFilters = {},
): Promise<OrganizationListResponse> {
  return apiClient<OrganizationListResponse>(buildOrganizationsUrl(filters), { method: 'GET' });
}

/** Imperative fetch — tenants catalog (optional `org_id` filter). */
export function fetchTenants(filters: TenantListFilters = {}): Promise<ConfiguratorTenantListResponse> {
  return apiClient<ConfiguratorTenantListResponse>(buildTenantsUrl(filters), { method: 'GET' });
}

export function organizationsQueryOptions(filters: OrganizationListFilters = {}) {
  return queryOptions({
    queryKey: configuratorKeys.organizations(filters),
    queryFn: () => fetchOrganizations(filters),
  });
}

export function tenantsQueryOptions(filters: TenantListFilters = {}) {
  return queryOptions({
    queryKey: configuratorKeys.tenants(filters),
    queryFn: () => fetchTenants(filters),
  });
}

export type ConfiguratorOrgTenantCatalog = {
  organizations: Organization[];
  tenants: ConfiguratorTenant[];
  tenantsByOrgId: Map<string, ConfiguratorTenant[]>;
};

export function groupTenantsByOrganization(tenants: ConfiguratorTenant[]): Map<string, ConfiguratorTenant[]> {
  const map = new Map<string, ConfiguratorTenant[]>();
  for (const tenant of tenants) {
    const list = map.get(tenant.org_id) ?? [];
    list.push(tenant);
    map.set(tenant.org_id, list);
  }
  return map;
}

export function orgTenantCatalogQueryOptions(filters?: {
  organizationFilters?: OrganizationListFilters;
  tenantFilters?: TenantListFilters;
}) {
  const organizationFilters = filters?.organizationFilters ?? { status: 'active' };
  const tenantFilters = filters?.tenantFilters ?? { provisioning_status: 'active' };

  return queryOptions({
    queryKey: [
      ...configuratorKeys.all,
      'org-tenant-catalog',
      organizationFilters,
      tenantFilters,
    ] as const,
    queryFn: async (): Promise<ConfiguratorOrgTenantCatalog> => {
      const [orgRes, tenantRes] = await Promise.all([
        fetchOrganizations(organizationFilters),
        fetchTenants(tenantFilters),
      ]);
      const tenants = tenantRes.data;
      return {
        organizations: orgRes.data,
        tenants,
        tenantsByOrgId: groupTenantsByOrganization(tenants),
      };
    },
  });
}

/**
 * Loads active organizations and tenants from Configurator in one query.
 * Use for tenant switchers and super-admin user-create flows.
 */
export function useConfiguratorOrgTenantCatalog(
  filters?: {
    organizationFilters?: OrganizationListFilters;
    tenantFilters?: TenantListFilters;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...orgTenantCatalogQueryOptions(filters),
    enabled: options?.enabled ?? true,
  });
}
