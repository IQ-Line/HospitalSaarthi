import { listRegistrations } from '@/features/frontdesk/api/registrations';
import { listOpdVisitsForPatients } from '@/features/create-rx/api/opd-prescription';
import { computeOpdPatientsStats, filterOpdPatientRows } from '../lib/opd-patients-list-utils';
import { mapOpdVisitSummariesByPatientId } from '../lib/opd-visit-status';
import { getMockOpdPatientsList } from '../mock/opd-patients.mock';
import { mapRegistrationToOpdPatientRow } from './registration-patients-mapper';
import type { OpdDoctorScope, OpdPatientsListParams, OpdPatientsListResponse } from '../types';

function hasClientOnlyFilters(
  filters: OpdPatientsListParams['filters'],
  doctorScope: OpdDoctorScope,
): boolean {
  return (
    doctorScope !== 'all' ||
    !!filters.gender ||
    !!filters.ageGroup ||
    !!filters.status ||
    !!filters.doctorId ||
    !!filters.startDate ||
    !!filters.endDate
  );
}

/** Opt-in mock data — set `VITE_OPD_PATIENTS_USE_MOCK=true` for UI-only development. */
export function opdPatientsUseMock(): boolean {
  return import.meta.env.VITE_OPD_PATIENTS_USE_MOCK === 'true';
}

/**
 * Doctor patients queue — one row per front-desk registration (newest first).
 * OPD visits are overlaid for consultation status and Create RX routing only.
 */
export async function fetchOpdPatientsList(
  params: OpdPatientsListParams,
): Promise<OpdPatientsListResponse> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 120));
    return getMockOpdPatientsList(params);
  }

  const search = params.filters.search.trim();

  const regPage = await listRegistrations({
    page: params.page,
    limit: params.limit,
    ...(search.length >= 2 ? { q: search } : {}),
  });

  const opdVisits = await listOpdVisitsForPatients(regPage.data.map((reg) => reg.patient_id));

  const opdByPatient = mapOpdVisitSummariesByPatientId(opdVisits);

  let items = regPage.data.map((reg) =>
    mapRegistrationToOpdPatientRow(reg, opdByPatient.get(reg.patient_id)),
  );

  if (hasClientOnlyFilters(params.filters, params.doctorScope)) {
    items = filterOpdPatientRows(items, params.filters, params.doctorScope);
  }

  const total =
    hasClientOnlyFilters(params.filters, params.doctorScope) ? items.length : regPage.total;

  return {
    items,
    total,
    stats: computeOpdPatientsStats(items),
  };
}
