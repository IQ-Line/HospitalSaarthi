import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { platformCatalogClient } from './platform-catalog-client';
import { masterDataKeys } from './query-keys';
import type {
  ModuleCategory,
  ModuleCreateInput,
  ModuleKind,
  ModuleListResponse,
  ModuleSingleResponse,
  ModuleUpdateInput,
  NavModuleListResponse,
} from '../types';

const BASE = '/api/v1/master-data/modules';
const NAV_MODULES_PATH = `${BASE}/nav`;

/** Platform-wide module catalog (used by UM permission trees). Prefetch from route loaders. */
export function globalModulesCatalogQueryOptions(moduleKinds?: ModuleKind[]) {
  const search = new URLSearchParams();
  if (moduleKinds?.length) {
    search.set('module_kind', moduleKinds.join(','));
  }
  const qs = search.toString();
  const params = qs ? `?${qs}` : '';
  return queryOptions({
    queryKey: [...masterDataKeys.globalModules(), ...(moduleKinds ?? [])],
    queryFn: () => platformCatalogClient<ModuleListResponse>(`${BASE}${params}`),
    staleTime: 60_000,
  });
}

export function useNavModules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: masterDataKeys.navModules(),
    queryFn: () => platformCatalogClient<NavModuleListResponse>(NAV_MODULES_PATH),
    enabled: options?.enabled ?? true,
  });
}

export function useModules(
  category?: ModuleCategory,
  options?: {
    enabled?: boolean;
    /**
     * Read `global_master.modules` (omit `iq_tenant_id`). Defaults to true — platform catalog
     * rows are not stored per tenant. Pass `false` only for intentional tenant_master reads.
     */
    globalCatalog?: boolean;
    /** Server-side filter by module kind(s). Omit to return all kinds. */
    moduleKinds?: ModuleKind[];
  },
) {
  const search = new URLSearchParams();
  if (category) search.set('category', category);
  if (options?.moduleKinds?.length) {
    search.set('module_kind', options.moduleKinds.join(','));
  }
  const qs = search.toString();
  const params = qs ? `?${qs}` : '';
  const globalCatalog = options?.globalCatalog !== false;
  return useQuery({
    queryKey: globalCatalog
      ? [...masterDataKeys.globalModules(), ...(options?.moduleKinds ?? [])]
      : masterDataKeys.modules(category),
    queryFn: () =>
      globalCatalog
        ? platformCatalogClient<ModuleListResponse>(`${BASE}${params}`)
        : apiClient<ModuleListResponse>(`${BASE}${params}`),
    enabled: options?.enabled ?? true,
  });
}

export function useModule(id: string) {
  return useQuery({
    queryKey: masterDataKeys.moduleDetail(id),
    queryFn: () => platformCatalogClient<ModuleSingleResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useSubmodules(parentId: string) {
  return useQuery({
    queryKey: masterDataKeys.submodules(parentId),
    queryFn: () =>
      platformCatalogClient<ModuleListResponse>(`${BASE}/${parentId}/submodules`),
    enabled: !!parentId,
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModuleCreateInput) =>
      platformCatalogClient<ModuleSingleResponse>(BASE, {
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
      platformCatalogClient<ModuleSingleResponse>(`${BASE}/${id}`, {
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
      platformCatalogClient<ModuleSingleResponse>(`${BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, id) => {
      invalidateModuleCatalogQueries(qc);
      qc.removeQueries({ queryKey: masterDataKeys.moduleDetail(id) });
    },
  });
}
