import type { OrganizationStatus, OrganizationType } from '../types';

export const configuratorKeys = {
  all: ['configurator'] as const,
  organizations: (filters: {
    status?: OrganizationStatus;
    type?: OrganizationType;
  }) => [...configuratorKeys.all, 'organizations', filters] as const,
  organizationDetail: (id: string) =>
    [...configuratorKeys.all, 'organization', id] as const,
  tenants: (filters: {
    org_id?: string;
    parent_tenant_id?: string;
    is_root?: boolean;
  }) => [...configuratorKeys.all, 'tenants', filters] as const,
  tenantDetail: (id: string) => [...configuratorKeys.all, 'tenant', id] as const,
  tenantModules: (tenantId: string) =>
    [...configuratorKeys.all, 'tenant-modules', tenantId] as const,
};
