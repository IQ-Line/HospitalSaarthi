import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  PermissionListResponse,
  PermissionSingleResponse,
} from '../types';

const BASE = '/api/v1/master-data/permissions';

export function usePermissions() {
  return useQuery({
    queryKey: masterDataKeys.permissions(),
    queryFn: () => apiClient<PermissionListResponse>(BASE),
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
    mutationFn: (input: { name: string; slug: string; description?: string | null }) =>
      apiClient<PermissionSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
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
