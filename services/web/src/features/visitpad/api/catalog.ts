import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

function listUrl(path: string, params?: Record<string, string | undefined>) {
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

export function useVisitpadUnits(search?: string, dimension?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.units(), search ?? '', dimension ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnit>>(
        listUrl('/units', { search, dimension }),
      ),
  });
}

export function useVisitpadConversions(search?: string, from_unit_code?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.conversions(), search ?? '', from_unit_code ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadUnitConversion>>(
        listUrl('/unit-conversions', { search, from_unit_code }),
      ),
  });
}

export function useVisitpadVitals(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.vitals(), search ?? '', category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVital>>(
        listUrl('/vitals', { search, category }),
      ),
  });
}

export function useVisitpadChiefComplaints(
  search?: string,
  body_system?: string,
  triage_priority?: string,
) {
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), search ?? '', body_system ?? '', triage_priority ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadChiefComplaint>>(
        listUrl('/chief-complaints', { search, body_system, triage_priority }),
      ),
  });
}

/** Server-driven labels for body system / triage selects (same enum values as create/patch). */
export function useVisitpadChiefComplaintDescriptor() {
  return useQuery({
    queryKey: [...visitpadKeys.chiefComplaints(), 'descriptor'] as const,
    queryFn: () => apiClient<VisitpadChiefComplaintDescriptor>(`${MD}/chief-complaints/descriptor`),
    staleTime: 86_400_000,
  });
}

export function useVisitpadDiagnoses(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.diagnoses(), search ?? '', category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadDiagnosis>>(
        listUrl('/diagnoses', { search, category }),
      ),
  });
}

export function useVisitpadAllergens(search?: string, allergen_type?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.allergens(), search ?? '', allergen_type ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergen>>(
        listUrl('/allergens', { search, allergen_type }),
      ),
  });
}

export function useVisitpadAllergyReactions(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.reactions(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadAllergyReaction>>(
        listUrl('/allergy-reactions', { search }),
      ),
  });
}

export function useVisitpadRxColumns(search?: string, section?: string) {
  return useQuery({
    queryKey: visitpadKeys.rxColumns(section),
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadRxColumn>>(
        listUrl('/rx-columns', { search, section }),
      ),
  });
}

export function useVisitpadMedicines(search?: string, schedule?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.medicines(), search ?? '', schedule ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadMedicine>>(
        listUrl('/medicines', { search, schedule }),
      ),
  });
}

export function useVisitpadChronicIllnesses(search?: string, category?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.chronicIllnesses(), search ?? '', category ?? ''],
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
    queryKey: [...visitpadKeys.procedures(), search ?? '', category ?? '', billing_category ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadProcedure>>(
        listUrl('/procedures', { search, category, billing_category }),
      ),
  });
}

export function useVisitpadVaccines(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.vaccines(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadVaccine>>(listUrl('/vaccines', { search })),
  });
}

export function useVisitpadManufacturers(search?: string) {
  return useQuery({
    queryKey: [...visitpadKeys.manufacturers(), search ?? ''],
    queryFn: () =>
      apiClient<VisitpadListResponse<VisitpadManufacturer>>(listUrl('/manufacturers', { search })),
  });
}
