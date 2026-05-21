import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiClientWithIqTenant } from '@/lib/api-client';
import { fetchTenants, tenantsQueryOptions } from './catalog';
import { refreshAccessToken } from '@/lib/auth-session';
import type { UmUser } from '@/features/user-management/types';
import { useAuthStore } from '@/stores/auth.store';
import { configuratorKeys } from './query-keys';
import type { ConfiguratorTenant, CreateConfiguratorTenantInput } from '../types';

const BASE = '/api/configurator/v1/tenants';

export { fetchTenants };

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
    ...tenantsQueryOptions(filters),
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
      apiClient<TenantModuleListResponse>(
        `${BASE}/${tenantId}/modules`,
        { method: 'GET' },
        { tenantIdOverride: tenantId },
      ),
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
