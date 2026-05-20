import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiClientGlobalCatalogRead, apiClientWithIqTenant } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type {
  ModuleCategory,
  ModuleCreateInput,
  ModuleListResponse,
  ModuleNavPermissionLinksListResponse,
  ModuleNavPermissionsBatchListResponse,
  ModuleNavTreeListResponse,
  ModuleSingleResponse,
  ModuleUpdateInput,
  NavModuleListResponse,
} from '../types';

const BASE = '/api/v1/master-data/modules';
const NAV_MODULES_PATH = `${BASE}/nav`;

function navModulesClient<T>(
  iqTenantId: string | undefined,
  path: string,
): Promise<T> {
  if (iqTenantId) {
    return apiClientWithIqTenant<T>(iqTenantId, path);
  }
  return apiClient<T>(path);
}

export function useNavModules(options?: { enabled?: boolean; iqTenantId?: string }) {
  const iqTenantId = options?.iqTenantId;
  return useQuery({
    queryKey: masterDataKeys.navModules(false, iqTenantId),
    queryFn: () => navModulesClient<NavModuleListResponse>(iqTenantId, NAV_MODULES_PATH),
    enabled: options?.enabled ?? true,
  });
}

export function useNavModulesWithPermissions(options?: { enabled?: boolean; iqTenantId?: string }) {
  const iqTenantId = options?.iqTenantId;
  return useQuery({
    queryKey: masterDataKeys.navModules(true, iqTenantId),
    queryFn: () =>
      navModulesClient<ModuleNavTreeListResponse>(
        iqTenantId,
        `${NAV_MODULES_PATH}?permissions=true`,
      ),
    enabled: options?.enabled ?? true,
  });
}

/** Platform-catalog permission links for one module (ignores tenant header). */
export function useModuleNavPermissions(
  moduleId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: masterDataKeys.moduleNavPermissions(moduleId),
    queryFn: () =>
      apiClientGlobalCatalogRead<ModuleNavPermissionLinksListResponse>(
        `${BASE}/${moduleId}/permissions`,
      ),
    enabled: (options?.enabled ?? true) && !!moduleId,
  });
}

function buildModulePermissionsBatchQuery(moduleIds: string[]) {
  const params = new URLSearchParams();
  for (const id of moduleIds) {
    params.append('module_ids', id);
  }
  return `${BASE}/permissions?${params.toString()}`;
}

/** Platform-catalog permission links for many modules in one request. */
export function useModuleNavPermissionsBatch(
  moduleIds: string[],
  options?: { enabled?: boolean },
) {
  const uniqueIds = [...new Set(moduleIds.filter(Boolean))];
  return useQuery({
    queryKey: masterDataKeys.moduleNavPermissionsBatch(uniqueIds),
    queryFn: () =>
      apiClientGlobalCatalogRead<ModuleNavPermissionsBatchListResponse>(
        buildModulePermissionsBatchQuery(uniqueIds),
      ),
    enabled: (options?.enabled ?? true) && uniqueIds.length > 0,
    staleTime: 60_000,
  });
}

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
      invalidateModuleCatalogQueries(qc);
    },
  });
}

function invalidateModuleCatalogQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: masterDataKeys.modulesRoot() });
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
      invalidateModuleCatalogQueries(qc);
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
      invalidateModuleCatalogQueries(qc);
      qc.removeQueries({ queryKey: masterDataKeys.moduleDetail(id) });
    },
  });
}
