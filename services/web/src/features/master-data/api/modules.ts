import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  ModuleCategory,
  ModuleCreateInput,
  ModuleListResponse,
  ModuleSingleResponse,
  ModuleUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/modules';

export function useModules(
  category?: ModuleCategory,
  options?: { enabled?: boolean },
) {
  const params = category ? `?category=${category}` : '';
  return useQuery({
    queryKey: masterDataKeys.modules(category),
    queryFn: () => apiClient<ModuleListResponse>(`${BASE}${params}`),
    enabled: options?.enabled ?? true,
  });
}

export function useModule(id: string) {
  return useQuery({
    queryKey: masterDataKeys.moduleDetail(id),
    queryFn: () => apiClient<ModuleSingleResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useSubmodules(parentId: string) {
  return useQuery({
    queryKey: masterDataKeys.submodules(parentId),
    queryFn: () => apiClient<ModuleListResponse>(`${BASE}/${parentId}/submodules`),
    enabled: !!parentId,
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModuleCreateInput) =>
      apiClient<ModuleSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.modulesRoot() });
    },
  });
}

/** PATCH — pass `{ id, input }` from dialogs and inline toggles (single stable mutation per screen). */
export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModuleUpdateInput }) =>
      apiClient<ModuleSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.moduleDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.modulesRoot() });
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<ModuleSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.modulesRoot() });
      qc.removeQueries({ queryKey: masterDataKeys.moduleDetail(id) });
    },
  });
}
