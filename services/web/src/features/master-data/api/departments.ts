import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiClientGlobalCatalogRead, apiClientWithIqTenant } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  DepartmentCreateInput,
  DepartmentListResponse,
  DepartmentSingleResponse,
  DepartmentType,
  DepartmentUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/departments';

function departmentClient<T>(
  iqTenantId: string | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (iqTenantId) {
    return apiClientWithIqTenant<T>(iqTenantId, path, options);
  }
  return apiClient<T>(path, options);
}

export function useDepartments(
  departmentType?: DepartmentType,
  options?: {
    enabled?: boolean;
    /** When set, reads ``tenant_master`` via ``iq_tenant_id`` header. */
    iqTenantId?: string;
    /** When true, reads ``global_master`` (no tenant header). */
    globalCatalog?: boolean;
  },
) {
  const iqTenantId = options?.iqTenantId;
  const globalCatalog = options?.globalCatalog === true;
  const params = departmentType ? `?type=${departmentType}` : '';
  const scopeKey = globalCatalog ? 'global' : (iqTenantId ?? 'global');
  return useQuery({
    queryKey: masterDataKeys.departments(departmentType, scopeKey),
    queryFn: () => {
      if (globalCatalog) {
        return apiClientGlobalCatalogRead<DepartmentListResponse>(`${BASE}${params}`);
      }
      return departmentClient<DepartmentListResponse>(iqTenantId, `${BASE}${params}`);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDepartment(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentCreateInput) =>
      departmentClient<DepartmentSingleResponse>(iqTenantId, BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}

export function useUpdateDepartment(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepartmentUpdateInput }) =>
      departmentClient<DepartmentSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}

export function useDeleteDepartment(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      departmentClient<DepartmentSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}
