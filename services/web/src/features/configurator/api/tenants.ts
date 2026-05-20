import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiClientWithIqTenant } from '@/lib/api-client';
import { refreshAccessToken } from '@/lib/auth-session';
import type { UmUser } from '@/features/user-management/types';
import { useAuthStore } from '@/stores/auth.store';
import { configuratorKeys } from './query-keys';
import type {
  ConfiguratorTenant,
  ConfiguratorTenantListResponse,
  CreateConfiguratorTenantInput,
} from '../types';

const BASE = '/api/configurator/v1/tenants';

function buildTenantsUrl(filters: {
  org_id?: string;
  parent_tenant_id?: string;
  is_root?: boolean;
  provisioning_status?: string;
  type?: string;
}) {
  const params = new URLSearchParams();
  if (filters.org_id) params.set('org_id', filters.org_id);
  if (filters.parent_tenant_id) params.set('parent_tenant_id', filters.parent_tenant_id);
  if (filters.is_root === true) params.set('is_root', 'true');
  if (filters.provisioning_status) params.set('provisioning_status', filters.provisioning_status);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

export function useTenants(
  filters: {
    org_id?: string;
    parent_tenant_id?: string;
    is_root?: boolean;
    provisioning_status?: string;
    type?: string;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: configuratorKeys.tenants(filters),
    queryFn: () => apiClient<ConfiguratorTenantListResponse>(buildTenantsUrl(filters)),
    enabled: options?.enabled ?? true,
  });
}

export function useTenant(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configuratorKeys.tenantDetail(id),
    queryFn: () => apiClient<ConfiguratorTenant>(`${BASE}/${id}`),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export interface TenantModuleRow {
  iq_tenant_id: string;
  module_id: string;
  is_active: boolean;
  is_core_override: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TenantModuleListResponse {
  data: TenantModuleRow[];
  total: number;
}

export function useTenantModules(
  tenantId: string,
  options?: { enabled?: boolean; isActive?: boolean },
) {
  const qs =
    options?.isActive === undefined ? '' : `?is_active=${options.isActive ? 'true' : 'false'}`;
  return useQuery({
    queryKey: [...configuratorKeys.tenantModules(tenantId), options?.isActive ?? 'all'] as const,
    queryFn: () =>
      apiClient<TenantModuleListResponse>(`${BASE}/${tenantId}/modules${qs}`),
    enabled: (options?.enabled ?? true) && !!tenantId,
  });
}

export function useTenantUsers(iqTenantId: string, options?: { enabled?: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: configuratorKeys.tenantUsers(iqTenantId),
    queryFn: async () => {
      const token = (await refreshAccessToken()) ?? useAuthStore.getState().accessToken;
      if (!token) {
        throw new Error('Not authenticated');
      }
      return apiClientWithIqTenant<UmUser[]>(iqTenantId, '/api/user-management/users', {
        method: 'GET',
      });
    },
    enabled: (options?.enabled ?? true) && !!iqTenantId && !!accessToken,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConfiguratorTenantInput) =>
      apiClient<ConfiguratorTenant>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configuratorKeys.all });
    },
  });
}
