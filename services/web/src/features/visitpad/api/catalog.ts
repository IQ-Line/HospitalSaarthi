import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { catalogIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useTenantStore } from '@/stores/tenant.store';
import { apiClient, apiClientGlobalCatalogRead } from '@/lib/api-client';
import { visitpadKeys } from './query-keys';
import type {
  VisitpadAllergen,
  VisitpadAllergyReaction,
  VisitpadChiefComplaint,
  VisitpadChronicIllness,
  VisitpadDiagnosis,
  VisitpadListResponse,
  VisitpadMedicine,
  VisitpadProcedure,
  VisitpadRxColumn,
  VisitpadUnit,
  VisitpadUnitConversion,
  VisitpadVital,
  VisitpadVaccine,
  VisitpadManufacturer,
} from '../types';

/** Matches GET /visitpad/chief-complaints/descriptor (subset for typing only). */
export type VisitpadChiefComplaintDescriptor = {
  body_systems: { value: string; label: string }[];
  triage_priorities: { value: string; label: string }[];
};

const MD = '/api/v1/master-data/visitpad';

export const VISITPAD_CATALOG_DEFAULT_PAGE_SIZE = 20;

export const VISITPAD_CATALOG_PAGE_SIZES = [10, 20, 50] as const;

export type VisitpadCatalogPageParams = {
  pageIndex: number;
  pageSize: number;
};

const DEFAULT_PAGE: VisitpadCatalogPageParams = {
  pageIndex: 0,
  pageSize: VISITPAD_CATALOG_DEFAULT_PAGE_SIZE,
};

function normalizePageSize(pageSize: number): number {
  for (const n of VISITPAD_CATALOG_PAGE_SIZES) {
    if (n === pageSize) return n;
  }
  return VISITPAD_CATALOG_DEFAULT_PAGE_SIZE;
}

function normalizePage(p?: VisitpadCatalogPageParams): VisitpadCatalogPageParams {
  if (!p) return { ...DEFAULT_PAGE };
  const pageSize = normalizePageSize(p.pageSize);
  const pageIndex = Math.max(0, p.pageIndex);
  return { pageIndex, pageSize };
}

/** List URL for Visitpad catalog GETs (shared by tenant-scoped and global-library reads). */
export function buildVisitpadCatalogListUrl(
  path: string,
  params?: Record<string, string | undefined>,
  page?: VisitpadCatalogPageParams,
) {
  const q = new URLSearchParams();
  const { pageIndex, pageSize } = normalizePage(page);
  q.set('limit', String(pageSize));
  q.set('offset', String(pageIndex * pageSize));
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
  }
  return `${MD}${path}?${q.toString()}`;
}

function listUrl(
  path: string,
  params?: Record<string, string | undefined>,
  page?: VisitpadCatalogPageParams,
) {
  return buildVisitpadCatalogListUrl(path, params, page);
}

/**
 * React Query segment so tenant vs platform lists do not share cache when switching sessions.
 * Uses the Zustand hook (not `getState()` alone) so components re-render when the persisted tenant
 * hydrates — avoids a transient `global` query key + fetch without `iq_tenant_id` before UUID scope.
 */
function useVisitpadCatalogScopeKey(): string {
  return useTenantStore((s) => catalogIqTenantHeaderValue(s.tenantId) ?? 'global');
}

function pageKey(p?: VisitpadCatalogPageParams): [number, number] {
  const n = normalizePage(p);
  return [n.pageIndex, n.pageSize];
}

/** Fetch all row keys for the current tenant catalog (paged server-side) — e.g. import modal “already imported”. */
export function useVisitpadTenantImportKeys(
  path: string,
  enabled: boolean,
  keyStrategy: string,
  getRowKey: (row: Record<string, unknown>) => string,
  listParams?: Record<string, string | undefined>,
): UseQueryResult<Set<string>, Error> {
  const scopeKey = useVisitpadCatalogScopeKey();
  const paramsKey = JSON.stringify(listParams ?? {});
  return useQuery({
    queryKey: [
      ...visitpadKeys.all,
      'tenant-import-keys',
      path,
      keyStrategy,
      paramsKey,
      scopeKey,
    ],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const keys = new Set<string>();
      let offset = 0;
      const limit = 200;
      for (;;) {
        const url = buildVisitpadCatalogListUrl(path, listParams ?? {}, {
          pageIndex: Math.floor(offset / limit),
          pageSize: limit,
        });
        const res = await apiClient<VisitpadListResponse<Record<string, unknown>>>(url);
        for (const r of res.data) keys.add(getRowKey(r));
        offset += res.data.length;
        if (offset >= res.total || res.data.length === 0) break;
      }
      return keys;
    },
  });
}

export function useVisitpadUnits(search?: string, dimension?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.units(), scopeKey, search ?? '', dimension ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnit>>(listUrl('/units', { search, dimension }, page)),
  });
}

export function useVisitpadConversions(
  search?: string,
  from_unit_code?: string,
  page?: VisitpadCatalogPageParams,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.conversions(), scopeKey, search ?? '', from_unit_code ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnitConversion>>(
        listUrl('/unit-conversions', { search, from_unit_code }, page),
      ),
  });
}

export function useVisitpadVitals(search?: string, category?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.vitals(), scopeKey, search ?? '', category ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVital>>(listUrl('/vitals', { search, category }, page)),
  });
}

/** Global (`public`) vitals — omit `iq_tenant_id` even when a tenant UUID is active (import modal). */
export function useVisitpadVitalsGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.vitals(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadVital>>(listUrl('/vitals', { search }, page)),
    enabled,
  });
}

export function useVisitpadChiefComplaints(
  search?: string,
  body_system?: string,
  triage_priority?: string,
  page?: VisitpadCatalogPageParams,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [
      ...visitpadKeys.chiefComplaints(),
      scopeKey,
      search ?? '',
      body_system ?? '',
      triage_priority ?? '',
      ...pk,
    ],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadChiefComplaint>>(
        listUrl('/chief-complaints', { search, body_system, triage_priority }, page),
      ),
  });
}

/** Global chief complaints for “import from platform library”. */
export function useVisitpadChiefComplaintsGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadChiefComplaint>>(
        listUrl('/chief-complaints', { search }, page),
      ),
    enabled,
  });
}

/** Server-driven labels for body system / triage selects (same enum values as create/patch). */
export function useVisitpadChiefComplaintDescriptor() {
  const scopeKey = useVisitpadCatalogScopeKey();
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), 'descriptor', scopeKey] as const,
    queryFn: () => apiClient<VisitpadChiefComplaintDescriptor>(`${MD}/chief-complaints/descriptor`),
    staleTime: 86_400_000,
  });
}

export function useVisitpadDiagnoses(search?: string, category?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.diagnoses(), scopeKey, search ?? '', category ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadDiagnosis>>(listUrl('/diagnoses', { search, category }, page)),
  });
}

export function useVisitpadAllergens(search?: string, allergen_type?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.allergens(), scopeKey, search ?? '', allergen_type ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergen>>(listUrl('/allergens', { search, allergen_type }, page)),
  });
}

export function useVisitpadAllergyReactions(search?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.reactions(), scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergyReaction>>(listUrl('/allergy-reactions', { search }, page)),
  });
}

export function useVisitpadRxColumns(search?: string, section?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.rxColumns(section), scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadRxColumn>>(listUrl('/rx-columns', { search, section }, page)),
  });
}

export function useVisitpadMedicines(search?: string, schedule?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.medicines(), scopeKey, search ?? '', schedule ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadMedicine>>(listUrl('/medicines', { search, schedule }, page)),
  });
}

export function useVisitpadChronicIllnesses(search?: string, category?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.chronicIllnesses(), scopeKey, search ?? '', category ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadChronicIllness>>(
        listUrl('/chronic-illnesses', { search, category }, page),
      ),
  });
}

export function useVisitpadProcedures(
  search?: string,
  category?: string,
  billing_category?: string,
  page?: VisitpadCatalogPageParams,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [
      ...visitpadKeys.procedures(),
      scopeKey,
      search ?? '',
      category ?? '',
      billing_category ?? '',
      ...pk,
    ],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadProcedure>>(
        listUrl('/procedures', { search, category, billing_category }, page),
      ),
  });
}

export function useVisitpadVaccines(search?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.vaccines(), scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVaccine>>(listUrl('/vaccines', { search }, page)),
  });
}

export function useVisitpadManufacturers(search?: string, page?: VisitpadCatalogPageParams) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.manufacturers(), scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadManufacturer>>(listUrl('/manufacturers', { search }, page)),
  });
}

export function useVisitpadUnitsGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.units(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadUnit>>(listUrl('/units', { search }, page)),
    enabled,
  });
}

export function useVisitpadConversionsGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.conversions(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadUnitConversion>>(
        listUrl('/unit-conversions', { search }, page),
      ),
    enabled,
  });
}

export function useVisitpadDiagnosesGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.diagnoses(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadDiagnosis>>(listUrl('/diagnoses', { search }, page)),
    enabled,
  });
}

export function useVisitpadAllergensGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.allergens(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadAllergen>>(listUrl('/allergens', { search }, page)),
    enabled,
  });
}

export function useVisitpadAllergyReactionsGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.reactions(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadAllergyReaction>>(
        listUrl('/allergy-reactions', { search }, page),
      ),
    enabled,
  });
}

export function useVisitpadRxColumnsGlobalLibrary(
  section: string,
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.rxColumns(section), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadRxColumn>>(
        listUrl('/rx-columns', { search, section }, page),
      ),
    enabled,
  });
}

export function useVisitpadMedicinesGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.medicines(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadMedicine>>(listUrl('/medicines', { search }, page)),
    enabled,
  });
}

export function useVisitpadChronicIllnessesGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.chronicIllnesses(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadChronicIllness>>(
        listUrl('/chronic-illnesses', { search }, page),
      ),
    enabled,
  });
}

export function useVisitpadProceduresGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.procedures(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadProcedure>>(listUrl('/procedures', { search }, page)),
    enabled,
  });
}

export function useVisitpadVaccinesGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.vaccines(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadVaccine>>(listUrl('/vaccines', { search }, page)),
    enabled,
  });
}

export function useVisitpadManufacturersGlobalLibrary(
  enabled: boolean,
  page?: VisitpadCatalogPageParams,
  search?: string,
) {
  const scopeKey = useVisitpadCatalogScopeKey();
  const pk = pageKey(page);
  return useQuery({
    queryKey: [...visitpadKeys.manufacturers(), 'global-platform-library', scopeKey, search ?? '', ...pk],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadManufacturer>>(
        listUrl('/manufacturers', { search }, page),
      ),
    enabled,
  });
}
