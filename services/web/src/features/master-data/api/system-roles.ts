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
    queryKey: masterDataKeys.systemRoles(isTemplate),
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
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
    },
  });
}

/** PATCH — `{ id, input }` from dialogs and row toggles. */
export function useUpdateSystemRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SystemRoleUpdateInput }) =>
      apiClient<SystemRoleSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.systemRoleDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
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
      qc.invalidateQueries({ queryKey: masterDataKeys.systemRolesRoot() });
      qc.removeQueries({ queryKey: masterDataKeys.systemRoleDetail(id) });
    },
  });
}
