import { computeOpdPatientsStats, filterOpdPatientRows } from '../lib/opd-patients-list-utils';
import { getMockOpdPatientsList } from '../mock/opd-patients.mock';
import { mapOpdEncounterToVisitRow } from './opd-encounters-mapper';
import {
  fetchEmpiPatientDetail,
  searchEmpiPatients,
  type EmpiPatient,
} from './empi-patients';
import { searchOpdModulePatients } from './opd-module-patients';
import type { OpdDoctorScope, OpdPatientsListParams, OpdPatientsListResponse } from '../types';

function toOpdStatusQuery(status: string): string | undefined {
  if (!status) return undefined;
  if (status === 'in-progress') return 'in_progress';
  return status;
}

/** Resolve EMPI display fields per patient id (search API requires name/phone/uhid criteria). */
async function fetchEmpiPatientLookupMap(patientIds: string[]): Promise<Map<string, EmpiPatient>> {
  if (patientIds.length === 0) return new Map();

  const map = new Map<string, EmpiPatient>();
  const uniqueIds = [...new Set(patientIds)];

  const results = await Promise.allSettled(
    uniqueIds.map(async (id) => {
      const detail = await fetchEmpiPatientDetail(id);
      return { id, patient: detail.patient };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.id, result.value.patient);
    }
  }

  return map;
}

function hasClientOnlyFilters(
  filters: OpdPatientsListParams['filters'],
  doctorScope: OpdDoctorScope,
): boolean {
  return (
    doctorScope !== 'all' ||
    !!filters.gender ||
    !!filters.ageGroup ||
    !!filters.doctorId ||
    !!filters.startDate ||
    !!filters.endDate
  );
}

/** Opt-in mock data — set `VITE_OPD_PATIENTS_USE_MOCK=true` for UI-only development. */
export function opdPatientsUseMock(): boolean {
  return import.meta.env.VITE_OPD_PATIENTS_USE_MOCK === 'true';
}

export async function fetchOpdPatientsList(
  params: OpdPatientsListParams,
): Promise<OpdPatientsListResponse> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 120));
    return getMockOpdPatientsList(params);
  }

  const statusForOpd = toOpdStatusQuery(params.filters.status);

  let opdPage = await searchOpdModulePatients(params.page, params.limit, statusForOpd ?? '');

  if (params.filters.search.trim().length >= 2) {
    const empiMatches = await searchEmpiPatients(params.filters, 1, 200);
    const matchIds = new Set(empiMatches.data.map((p) => p.id));
    const filtered = opdPage.items.filter((row) => matchIds.has(row.patient_id));
    opdPage = {
      ...opdPage,
      items: filtered,
      total: filtered.length,
    };
  }

  const empiById = await fetchEmpiPatientLookupMap(opdPage.items.map((row) => row.patient_id));

  let items = opdPage.items.map((encounter) =>
    mapOpdEncounterToVisitRow(encounter, empiById.get(encounter.patient_id)),
  );

  if (hasClientOnlyFilters(params.filters, params.doctorScope)) {
    items = filterOpdPatientRows(items, params.filters, params.doctorScope);
  }

  const total =
    hasClientOnlyFilters(params.filters, params.doctorScope) ||
    params.filters.search.trim().length >= 2
      ? items.length
      : opdPage.total;

  return {
    items,
    total,
    stats: computeOpdPatientsStats(items),
  };
}
