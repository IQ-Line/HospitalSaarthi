import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient, apiClientWithIqTenant, ApiError } from '@/lib/api-client';
import { invalidateComposedNavigationCache } from '@/platform/modules/module-manifest-loader';
import { refreshAuthorizationContext } from '@/lib/authorization-context';
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

export interface UpdateConfiguratorTenantInput {
  free_follow_up_days?: number;
  free_follow_up_visits?: number;
}

export function useUpdateTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConfiguratorTenantInput) =>
      apiClient<ConfiguratorTenant>(`${BASE}/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (row) => {
      qc.setQueryData(configuratorKeys.tenantDetail(tenantId), row);
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

function patchTenantModulesCache(
  qc: QueryClient,
  tenantId: string,
  moduleId: string,
  isActive: boolean,
  existingRow: TenantModuleRow | undefined,
): TenantModuleListResponse | undefined {
  const key = configuratorKeys.tenantModules(tenantId);
  const previous = qc.getQueryData<TenantModuleListResponse>(key);
  if (!previous) {
    return undefined;
  }

  const now = new Date().toISOString();
  if (existingRow) {
    const data = previous.data.map((row) =>
      row.module_id === moduleId ? { ...row, is_active: isActive, updated_at: now } : row,
    );
    qc.setQueryData<TenantModuleListResponse>(key, { ...previous, data });
    return previous;
  }

  const data = [
    ...previous.data,
    {
      iq_tenant_id: tenantId,
      module_id: moduleId,
      is_active: isActive,
      is_core_override: false,
      created_at: now,
      updated_at: now,
      created_by: null,
      updated_by: null,
    },
  ];
  qc.setQueryData<TenantModuleListResponse>(key, { ...previous, data, total: data.length });
  return previous;
}

export function useSetTenantModuleActive() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async ({ tenantId, moduleId, isActive, existingRow }) => {
      await qc.cancelQueries({ queryKey: configuratorKeys.tenantModules(tenantId) });
      const previous = patchTenantModulesCache(qc, tenantId, moduleId, isActive, existingRow);
      return { previous, tenantId };
    },
    onError: (_err, { tenantId }, context) => {
      if (context?.previous) {
        qc.setQueryData(configuratorKeys.tenantModules(tenantId), context.previous);
      }
    },
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
    onSuccess: (row, { tenantId, moduleId }) => {
      qc.setQueryData<TenantModuleListResponse>(
        configuratorKeys.tenantModules(tenantId),
        (prev) => {
          if (!prev) {
            return { data: [row], total: 1 };
          }
          const index = prev.data.findIndex((entry) => entry.module_id === moduleId);
          if (index < 0) {
            return { data: [...prev.data, row], total: prev.data.length + 1 };
          }
          const data = [...prev.data];
          data[index] = row;
          return { ...prev, data };
        },
      );
      invalidateComposedNavigationCache();
      void refreshAuthorizationContext(qc, {
        bypassEntitlementCache: true,
        forcePrincipalRefresh: true,
        light: true,
      });
    },
  });
}
