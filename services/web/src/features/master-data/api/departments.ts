import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveVisitpadCatalogScopeKey } from '@/lib/catalog-tenant';
import { apiClient, apiClientGlobalCatalogRead, apiClientWithIqTenant } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { masterDataKeys } from './query-keys';
import type {
  DepartmentCreateInput,
  DepartmentListResponse,
  DepartmentSingleResponse,
  DepartmentType,
  DepartmentUpdateInput,
} from '../types';

const BASE = '/api/v1/master-data/departments';

export const DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE = 20;

export const DEPARTMENT_CATALOG_PAGE_SIZES = [10, 20, 50, 200] as const;

/** Full catalog page for dropdowns (user forms, visit registration). */
export const DEPARTMENT_CATALOG_FORM_PAGE = {
  pageIndex: 0,
  pageSize: 200,
} as const;

export type DepartmentCatalogPageParams = {
  pageIndex: number;
  pageSize: number;
};

type DepartmentCatalogKeysResponse = { data: string[] };

export type DepartmentPlatformImportResult = {
  created: string[];
  skipped: string[];
  errors: { platform_row_id: string; message: string }[];
};

function departmentClient<T>(
  iqTenantId: string | undefined,
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (iqTenantId) {
    return apiClientWithIqTenant<T>(iqTenantId, path, options);
  }
  return apiClient<T>(path, options);
}

function useDepartmentCatalogScopeKey(): string {
  const tenantId = useTenantStore((s) => s.tenantId);
  const roles = useAuthStore((s) => s.roles);
  return resolveVisitpadCatalogScopeKey(tenantId, roles);
}

function normalizePageSize(pageSize: number): number {
  for (const n of DEPARTMENT_CATALOG_PAGE_SIZES) {
    if (n === pageSize) return n;
  }
  return DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE;
}

function normalizePage(p?: DepartmentCatalogPageParams): DepartmentCatalogPageParams {
  if (!p) {
    return { pageIndex: 0, pageSize: DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE };
  }
  return {
    pageIndex: Math.max(0, p.pageIndex),
    pageSize: normalizePageSize(p.pageSize),
  };
}

export function buildDepartmentListUrl(
  params?: {
    type?: DepartmentType;
    search?: string;
  },
  page?: DepartmentCatalogPageParams,
): string {
  const q = new URLSearchParams();
  const { pageIndex, pageSize } = normalizePage(page);
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  if (params?.type) q.set('type', params.type);
  if (params?.search) q.set('search', params.search);
  return `${BASE}?${q.toString()}`;
}

function pageKey(p?: DepartmentCatalogPageParams): [number, number] {
  const n = normalizePage(p);
  return [n.pageIndex, n.pageSize];
}

export function useDepartments(
  departmentType?: DepartmentType,
  options?: {
    enabled?: boolean;
    /** When set, reads ``tenant_master`` via ``iq_tenant_id`` header (configurator tenant detail). */
    iqTenantId?: string;
    /** When true, reads ``global_master`` (no tenant header). */
    globalCatalog?: boolean;
    search?: string;
    page?: DepartmentCatalogPageParams;
    /** Fetch up to API max (200) for dropdowns — no table pagination. */
    formCatalog?: boolean;
  },
) {
  const scopeKeyFromSession = useDepartmentCatalogScopeKey();
  const iqTenantId = options?.iqTenantId;
  const globalCatalog = options?.globalCatalog === true;
  const page = options?.formCatalog ? DEPARTMENT_CATALOG_FORM_PAGE : options?.page;
  const search = options?.search;
  const scopeKey = globalCatalog ? 'global' : (iqTenantId ?? scopeKeyFromSession);
  const pk = pageKey(page);
  return useQuery({
    queryKey: [
      ...masterDataKeys.departments(departmentType, scopeKey),
      search ?? '',
      ...pk,
      options?.formCatalog ? 'form' : 'page',
    ],
    queryFn: () => {
      const url = buildDepartmentListUrl({ type: departmentType, search }, page);
      if (globalCatalog) {
        return apiClientGlobalCatalogRead<DepartmentListResponse>(url);
      }
      return departmentClient<DepartmentListResponse>(iqTenantId, url);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useDepartmentsGlobalLibrary(
  enabled: boolean,
  departmentType?: DepartmentType,
  page?: DepartmentCatalogPageParams,
  search?: string,
) {
  const scopeKey = useDepartmentCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [
      ...masterDataKeys.departmentsRoot(),
      'global-platform-library',
      scopeKey,
      departmentType ?? 'all',
      search ?? '',
      ...pk,
    ],
    queryFn: () =>
      apiClientGlobalCatalogRead<DepartmentListResponse>(
        buildDepartmentListUrl({ type: departmentType, search }, page),
      ),
    enabled,
  });
}

export function useDepartmentTenantImportKeys(enabled: boolean) {
  const scopeKey = useDepartmentCatalogScopeKey();
  return useQuery({
    queryKey: [...masterDataKeys.departmentsRoot(), 'tenant-catalog-keys', scopeKey],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiClient<DepartmentCatalogKeysResponse>(`${BASE}/keys`);
      return new Set(res.data);
    },
  });
}

export function useDepartmentPlatformImport(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform_row_ids: string[]) =>
      departmentClient<{ data: DepartmentPlatformImportResult }>(iqTenantId, `${BASE}/import-from-platform`, {
        method: 'POST',
        body: JSON.stringify({ platform_row_ids }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}

export function useCreateDepartment(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentCreateInput) =>
      departmentClient<DepartmentSingleResponse>(iqTenantId, BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}

export function useUpdateDepartment(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepartmentUpdateInput }) =>
      departmentClient<DepartmentSingleResponse>(iqTenantId, `${BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: masterDataKeys.departmentsRoot() });
    },
  });
}
