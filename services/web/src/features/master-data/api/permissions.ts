import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  PermissionAction,
  PermissionCreateInput,
  PermissionListResponse,
  PermissionSingleResponse,
  PermissionUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/permissions';

export function usePermissions(action?: PermissionAction) {
  const params = action ? `?action=${action}` : '';
  return useQuery({
    queryKey: [...masterDataKeys.permissions(), action ?? 'all'],
    queryFn: () => apiClient<PermissionListResponse>(`${BASE}${params}`),
  });
}

export function usePermission(id: string) {
  return useQuery({
    queryKey: masterDataKeys.permissionDetail(id),
    queryFn: () => apiClient<PermissionSingleResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PermissionCreateInput) =>
      apiClient<PermissionSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.permissions() });
    },
  });
}

export function useUpdatePermission(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PermissionUpdateInput) =>
      apiClient<PermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      qc.setQueryData(masterDataKeys.permissionDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.permissions() });
    },
  });
}

export function useDeletePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<PermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.permissions() });
      qc.removeQueries({ queryKey: masterDataKeys.permissionDetail(id) });
    },
  });
}
