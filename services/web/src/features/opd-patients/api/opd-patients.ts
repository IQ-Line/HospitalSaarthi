import { listRegistrationVisits } from '@/features/frontdesk/api/registrations';
import { fetchOpdEncounterOverlaysByVisitIds, encounterOverlaysToRecord } from './opd-encounter-overlay';
import { fetchEmpiPatientLookupMap } from './empi-patients';
import { computeOpdPatientsStats, filterOpdPatientRows } from '../lib/opd-patients-list-utils';
import { opdUiStatusToRegistrationVisitQuery } from '../lib/registration-visit-status';
import { getMockOpdPatientsList } from '../mock/opd-patients.mock';
import { mapRegistrationVisitToOpdPatientRow } from './registration-patients-mapper';
import type { OpdDoctorScope, OpdPatientsListParams, OpdPatientsListResponse } from '../types';

function hasClientOnlyFilters(
  filters: OpdPatientsListParams['filters'],
  doctorScope: OpdDoctorScope,
): boolean {
  return (
    doctorScope !== 'all' ||
    !!filters.gender ||
    !!filters.ageGroup ||
    !!filters.visitType ||
    !!filters.status ||
    !!filters.doctorId ||
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.search.trim()
  );
}

function matchesVisitSearch(
  row: ReturnType<typeof mapRegistrationVisitToOpdPatientRow>,
  empiUhid: string | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return true;
  const hay = `${row.visitNumber} ${row.patientName} ${row.patientId} ${empiUhid ?? ''}`.toLowerCase();
  return hay.includes(q);
}

/** Opt-in mock data — set `VITE_OPD_PATIENTS_USE_MOCK=true` for UI-only development. */
export function opdPatientsUseMock(): boolean {
  return import.meta.env.VITE_OPD_PATIENTS_USE_MOCK === 'true';
}

/**
 * Doctor patients queue — one row per registration.visit (front-desk encounter).
 * Patient demographics come from EMPI; clinical RX still uses OPD APIs when opened.
 */
export async function fetchOpdPatientsList(
  params: OpdPatientsListParams,
): Promise<OpdPatientsListResponse> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 120));
    return getMockOpdPatientsList(params);
  }

  const statusQuery = opdUiStatusToRegistrationVisitQuery(params.filters.status);

  const visitPage = await listRegistrationVisits({
    page: params.page,
    limit: params.limit,
    ...(statusQuery ? { status: statusQuery } : {}),
    ...(params.filters.doctorId.trim() ? { doctor_id: params.filters.doctorId.trim() } : {}),
  });

  const [empiById, encounterByVisitId] = await Promise.all([
    fetchEmpiPatientLookupMap(visitPage.data.map((visit) => visit.patient_id)),
    fetchOpdEncounterOverlaysByVisitIds(visitPage.data.map((visit) => visit.id)),
  ]);

  let items = visitPage.data.map((visit) => {
    const encounter = encounterByVisitId.get(visit.id);
    return mapRegistrationVisitToOpdPatientRow(
      visit,
      empiById.get(visit.patient_id),
      encounter?.prescriptionStatus,
      encounter?.visitStatus,
    );
  });

  const search = params.filters.search.trim();
  if (search.length >= 2) {
    items = items.filter((row) =>
      matchesVisitSearch(row, empiById.get(row.patientId)?.uhid, search),
    );
  }

  if (hasClientOnlyFilters(params.filters, params.doctorScope)) {
    items = filterOpdPatientRows(items, params.filters, params.doctorScope);
  }

  const total =
    hasClientOnlyFilters(params.filters, params.doctorScope) || search.length >= 2
      ? items.length
      : visitPage.total;

  return {
    items,
    total,
    stats: computeOpdPatientsStats(items),
    encounterOverlaysByVisitId: encounterOverlaysToRecord(encounterByVisitId),
  };
}
