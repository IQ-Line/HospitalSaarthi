import { useQuery } from '@tanstack/react-query';
import { catalogIqTenantHeaderValue } from '@/lib/catalog-tenant';
import { useTenantStore } from '@/stores/tenant.store';
import { apiClient, apiClientGlobalCatalogRead } from '@/lib/api-client';
import { visitpadKeys } from './query-keys';
import type {
  VisitpadAllergen,
  VisitpadAllergyReaction,
  VisitpadChiefComplaint,
  VisitpadChiefComplaintDescriptor,
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

const MD = '/api/v1/master-data/visitpad';

/** List URL for Visitpad catalog GETs (shared by tenant-scoped and global-library reads). */
export function buildVisitpadCatalogListUrl(
  path: string,
  params?: Record<string, string | undefined>,
) {
  const q = new URLSearchParams();
  // TODO(visitpad-pagination): server supports limit/offset; wire table pagination + "Showing n of total" (large catalogs). Track in your issue tracker when created; contract note: docs/architecture/lld/master-data/02-api-contracts.md §3.3.
  q.set('limit', '200');
  q.set('offset', '0');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
  }
  return `${MD}${path}?${q.toString()}`;
}

function listUrl(path: string, params?: Record<string, string | undefined>) {
  return buildVisitpadCatalogListUrl(path, params);
}

/** React Query segment so tenant vs platform lists do not share cache when switching sessions. */
function visitpadCatalogQueryScopeKey(): string {
  return catalogIqTenantHeaderValue(useTenantStore.getState().tenantId) ?? 'global';
}

export function useVisitpadUnits(search?: string, dimension?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.units(), visitpadCatalogQueryScopeKey(), search ?? '', dimension ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnit>>(listUrl('/units', { search, dimension })),
  });
}

export function useVisitpadConversions(search?: string, from_unit_code?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.conversions(), visitpadCatalogQueryScopeKey(), search ?? '', from_unit_code ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnitConversion>>(
        listUrl('/unit-conversions', { search, from_unit_code }),
      ),
  });
}

export function useVisitpadVitals(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.vitals(), visitpadCatalogQueryScopeKey(), search ?? '', category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVital>>(listUrl('/vitals', { search, category })),
  });
}

/** Global (`public`) vitals — omit `iq_tenant_id` even when a tenant UUID is active (import modal). */
export function useVisitpadVitalsGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.vitals(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadVital>>(listUrl('/vitals', {})),
    enabled,
  });
}

export function useVisitpadChiefComplaints(
  search?: string,
  body_system?: string,
  triage_priority?: string,
) {
  return useQuery({
    queryKey: [
      ...visitpadKeys.chiefComplaints(),
      visitpadCatalogQueryScopeKey(),
      search ?? '',
      body_system ?? '',
      triage_priority ?? '',
    ],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadChiefComplaint>>(
        listUrl('/chief-complaints', { search, body_system, triage_priority }),
      ),
  });
}

/** Global chief complaints for “import from platform library”. */
export function useVisitpadChiefComplaintsGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadChiefComplaint>>(
        listUrl('/chief-complaints', {}),
      ),
    enabled,
  });
}

/** Server-driven labels for body system / triage selects (same enum values as create/patch). */
export function useVisitpadChiefComplaintDescriptor() {
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), 'descriptor', visitpadCatalogQueryScopeKey()] as const,
    queryFn: () => apiClient<VisitpadChiefComplaintDescriptor>(`${MD}/chief-complaints/descriptor`),
    staleTime: 86_400_000,
  });
}

export function useVisitpadDiagnoses(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.diagnoses(), visitpadCatalogQueryScopeKey(), search ?? '', category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadDiagnosis>>(
        listUrl('/diagnoses', { search, category }),
      ),
  });
}

export function useVisitpadAllergens(search?: string, allergen_type?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.allergens(), visitpadCatalogQueryScopeKey(), search ?? '', allergen_type ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergen>>(
        listUrl('/allergens', { search, allergen_type }),
      ),
  });
}

export function useVisitpadAllergyReactions(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.reactions(), visitpadCatalogQueryScopeKey(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergyReaction>>(
        listUrl('/allergy-reactions', { search }),
      ),
  });
}

export function useVisitpadRxColumns(search?: string, section?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.rxColumns(section), visitpadCatalogQueryScopeKey(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadRxColumn>>(
        listUrl('/rx-columns', { search, section }),
      ),
  });
}

export function useVisitpadMedicines(search?: string, schedule?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.medicines(), visitpadCatalogQueryScopeKey(), search ?? '', schedule ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadMedicine>>(
        listUrl('/medicines', { search, schedule }),
      ),
  });
}

export function useVisitpadChronicIllnesses(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.chronicIllnesses(), visitpadCatalogQueryScopeKey(), search ?? '', category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadChronicIllness>>(
        listUrl('/chronic-illnesses', { search, category }),
      ),
  });
}

export function useVisitpadProcedures(
  search?: string,
  category?: string,
  billing_category?: string,
) {
  return useQuery({
    queryKey: [
      ...visitpadKeys.procedures(),
      visitpadCatalogQueryScopeKey(),
      search ?? '',
      category ?? '',
      billing_category ?? '',
    ],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadProcedure>>(
        listUrl('/procedures', { search, category, billing_category }),
      ),
  });
}

export function useVisitpadVaccines(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.vaccines(), visitpadCatalogQueryScopeKey(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVaccine>>(listUrl('/vaccines', { search })),
  });
}

export function useVisitpadManufacturers(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.manufacturers(), visitpadCatalogQueryScopeKey(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadManufacturer>>(listUrl('/manufacturers', { search })),
  });
}

export function useVisitpadUnitsGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.units(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadUnit>>(listUrl('/units', {})),
    enabled,
  });
}

export function useVisitpadConversionsGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.conversions(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadUnitConversion>>(
        listUrl('/unit-conversions', {}),
      ),
    enabled,
  });
}

export function useVisitpadDiagnosesGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.diagnoses(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadDiagnosis>>(listUrl('/diagnoses', {})),
    enabled,
  });
}

export function useVisitpadAllergensGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.allergens(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadAllergen>>(listUrl('/allergens', {})),
    enabled,
  });
}

export function useVisitpadAllergyReactionsGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.reactions(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadAllergyReaction>>(
        listUrl('/allergy-reactions', {}),
      ),
    enabled,
  });
}

export function useVisitpadRxColumnsGlobalLibrary(section: string, enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.rxColumns(section), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadRxColumn>>(
        listUrl('/rx-columns', { section }),
      ),
    enabled,
  });
}

export function useVisitpadMedicinesGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.medicines(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadMedicine>>(listUrl('/medicines', {})),
    enabled,
  });
}

export function useVisitpadChronicIllnessesGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.chronicIllnesses(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadChronicIllness>>(
        listUrl('/chronic-illnesses', {}),
      ),
    enabled,
  });
}

export function useVisitpadProceduresGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.procedures(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadProcedure>>(listUrl('/procedures', {})),
    enabled,
  });
}

export function useVisitpadVaccinesGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.vaccines(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadVaccine>>(listUrl('/vaccines', {})),
    enabled,
  });
}

export function useVisitpadManufacturersGlobalLibrary(enabled: boolean) {
  return useQuery({
    queryKey: [...visitpadKeys.manufacturers(), 'global-platform-library', visitpadCatalogQueryScopeKey()],
    queryFn: () =>
      apiClientGlobalCatalogRead<VisitpadListResponse<VisitpadManufacturer>>(
        listUrl('/manufacturers', {}),
      ),
    enabled,
  });
}
