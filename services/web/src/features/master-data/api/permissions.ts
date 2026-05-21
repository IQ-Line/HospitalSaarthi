import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { platformCatalogClient } from './platform-catalog-client';
import { masterDataKeys } from './query-keys';
import type {
  PermissionAction,
  PermissionCreateInput,
  PermissionListResponse,
  PermissionSingleResponse,
  PermissionUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/permissions';

export function usePermissions(
  action?: PermissionAction,
  options?: {
    enabled?: boolean;
    /** Defaults to true — platform permissions live in `global_master`. */
    globalCatalog?: boolean;
  },
) {
  const params = action ? `?action=${action}` : '';
  const globalCatalog = options?.globalCatalog !== false;
  return useQuery({
    queryKey: masterDataKeys.permissions(action, globalCatalog),
    queryFn: () =>
      globalCatalog
        ? platformCatalogClient<PermissionListResponse>(`${BASE}${params}`)
        : apiClient<PermissionListResponse>(`${BASE}${params}`),
    enabled: options?.enabled ?? true,
  });
}

export function usePermission(id: string) {
  return useQuery({
    queryKey: masterDataKeys.permissionDetail(id),
    queryFn: () => platformCatalogClient<PermissionSingleResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PermissionCreateInput) =>
      platformCatalogClient<PermissionSingleResponse>(BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.permissionsRoot() });
    },
  });
}

/** PATCH — `{ id, input }` from dialogs and row toggles. */
export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PermissionUpdateInput }) =>
      platformCatalogClient<PermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (result, { id }) => {
      qc.setQueryData(masterDataKeys.permissionDetail(id), result);
      qc.invalidateQueries({ queryKey: masterDataKeys.permissionsRoot() });
    },
  });
}

export function useDeletePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      platformCatalogClient<PermissionSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: masterDataKeys.permissionsRoot() });
      qc.removeQueries({ queryKey: masterDataKeys.permissionDetail(id) });
    },
  });
}
