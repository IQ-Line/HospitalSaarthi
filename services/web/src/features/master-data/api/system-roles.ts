import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  SystemRoleListResponse,
  SystemRoleSingleResponse,
} from '../types';

const BASE = '/api/v1/master-data/system-roles';

export function useSystemRoles() {
  return useQuery({
    queryKey: masterDataKeys.systemRoles(),
    queryFn: () => apiClient<SystemRoleListResponse>(BASE),
  });
}

export function useSystemRole(id: string) {
  return useQuery({
    queryKey: masterDataKeys.systemRoleDetail(id),
    queryFn: () => apiClient<SystemRoleSingleResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateSystemRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string; description?: string | null }) =>
      apiClient<SystemRoleSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRoles() });
    },
  });
}

export function useDeleteSystemRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<SystemRoleSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRoles() });
      qc.removeQueries({ queryKey: masterDataKeys.systemRoleDetail(id) });
    },
  });
}
