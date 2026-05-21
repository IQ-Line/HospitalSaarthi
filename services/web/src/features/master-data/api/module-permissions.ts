import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { platformCatalogClient } from './platform-catalog-client';
import { masterDataKeys } from './query-keys';
import type {
  ModulePermissionCreateInput,
  ModulePermissionListResponse,
  ModulePermissionSingleResponse,
  ModulePermissionUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/module-permissions';

interface ModulePermissionListParams {
  module_id?: string;
  permission_id?: string;
  limit?: number;
  offset?: number;
}

function toQueryString(params: ModulePermissionListParams) {
  const searchParams = new URLSearchParams();
  if (params.module_id) {
    searchParams.set('module_id', params.module_id);
  }
  if (params.permission_id) {
    searchParams.set('permission_id', params.permission_id);
  }
  searchParams.set('limit', String(params.limit ?? 50));
  searchParams.set('offset', String(params.offset ?? 0));
  return searchParams.toString();
}

export function useModulePermissions(
  params: ModulePermissionListParams = {},
  options?: { enabled?: boolean; globalCatalog?: boolean },
) {
  const queryString = toQueryString(params);
  const globalCatalog = options?.globalCatalog !== false;
  return useQuery({
    queryKey: masterDataKeys.modulePermissions(
      params.module_id,
      params.permission_id,
      params.limit,
      params.offset,
    ),
    queryFn: () =>
      globalCatalog
        ? platformCatalogClient<ModulePermissionListResponse>(`${BASE}?${queryString}`)
        : apiClient<ModulePermissionListResponse>(`${BASE}?${queryString}`),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateModulePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModulePermissionCreateInput) =>
      platformCatalogClient<ModulePermissionSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.modulePermissionsRoot() });
    },
  });
}

/** PATCH — `{ id, input }` from dialogs and row toggles. */
export function useUpdateModulePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ModulePermissionUpdateInput }) =>
      platformCatalogClient<ModulePermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.modulePermissionDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.modulePermissionsRoot() });
    },
  });
}

export function useDeleteModulePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      platformCatalogClient<ModulePermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_result, id) => {
      qc.removeQueries({ queryKey: masterDataKeys.modulePermissionDetail(id) });
      qc.invalidateQueries({ queryKey: masterDataKeys.modulePermissionsRoot() });
    },
  });
}
