import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiClientWithIqTenant, ApiError } from '@/lib/api-client';
import { invalidateModuleRegistration } from '@/platform/modules/module-catalog';
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

export function useTenantModules(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configuratorKeys.tenantModules(tenantId),
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

export type SetTenantModuleActiveInput = {
  tenantId: string;
  moduleId: string;
  isActive: boolean;
  /** When present, PATCH; otherwise POST to create enablement row. */
  existingRow?: TenantModuleRow;
};

export function useSetTenantModuleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, moduleId, isActive, existingRow }: SetTenantModuleActiveInput) => {
      const ctx = { tenantIdOverride: tenantId };
      if (existingRow) {
        return apiClient<TenantModuleRow>(
          `${BASE}/${tenantId}/modules/${moduleId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ is_active: isActive }),
          },
          ctx,
        );
      }
      try {
        return await apiClient<TenantModuleRow>(
          `${BASE}/${tenantId}/modules`,
          {
            method: 'POST',
            body: JSON.stringify({ module_id: moduleId, is_active: isActive }),
          },
          ctx,
        );
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) {
          throw err;
        }
        return apiClient<TenantModuleRow>(
          `${BASE}/${tenantId}/modules/${moduleId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ is_active: isActive }),
          },
          ctx,
        );
      }
    },
    onSuccess: (_row, { tenantId }) => {
      invalidateModuleRegistration(qc, tenantId);
    },
  });
}
