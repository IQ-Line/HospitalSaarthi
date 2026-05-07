import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  Module,
  ModuleCategory,
  ModuleCreateInput,
  ModuleListResponse,
  ModuleSingleResponse,
  ModuleUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/modules';

export function useModules(category?: ModuleCategory) {
  const params = category ? `?category=${category}` : '';
  return useQuery({
    queryKey: masterDataKeys.modules(),
    queryFn: () => apiClient<ModuleListResponse>(`${BASE}${params}`),
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
      qc.invalidateQueries({ queryKey: masterDataKeys.modules() });
    },
  });
}

export function useUpdateModule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModuleUpdateInput) =>
      apiClient<ModuleSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      qc.setQueryData(masterDataKeys.moduleDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.modules() });
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
      qc.invalidateQueries({ queryKey: masterDataKeys.modules() });
      qc.removeQueries({ queryKey: masterDataKeys.moduleDetail(id) });
    },
  });
}
