import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  SystemRoleCreateInput,
  SystemRoleListResponse,
  SystemRoleSingleResponse,
  SystemRoleUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/system-roles';

export function useSystemRoles(isTemplate?: boolean) {
  const params = isTemplate === undefined ? '' : `?is_template=${isTemplate}`;
  return useQuery({
    queryKey: [...masterDataKeys.systemRoles(), isTemplate ?? 'all'],
    queryFn: () => apiClient<SystemRoleListResponse>(`${BASE}${params}`),
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
    mutationFn: (input: SystemRoleCreateInput) =>
      apiClient<SystemRoleSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRoles() });
    },
  });
}

export function useUpdateSystemRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SystemRoleUpdateInput) =>
      apiClient<SystemRoleSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      qc.setQueryData(masterDataKeys.systemRoleDetail(id), result);
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
