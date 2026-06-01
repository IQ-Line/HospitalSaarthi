import { fetchLatestOpdVisitForPatient } from '@/features/create-rx/api/opd-prescription';
import { applyOpdVisitSummaryOverlay } from '../lib/opd-visit-status';
import { resolveOpdConsultationTenantId } from '../lib/opd-consultation-tenant';
import { computeOpdPatientsStats } from '../lib/opd-patients-list-utils';
import { getMockOpdPatientsList } from '../mock/opd-patients.mock';
import { buildOpdListResponseFromEmpi } from './empi-patients-mapper';
import { searchEmpiPatients } from './empi-patients';
import type { OpdPatientsListParams, OpdPatientsListResponse } from '../types';

async function withOpdVisitOverlay(
  response: OpdPatientsListResponse,
): Promise<OpdPatientsListResponse> {
  if (!resolveOpdConsultationTenantId()) return response;

  const items = await Promise.all(
    response.items.map(async (row) => {
      try {
        const summary = await fetchLatestOpdVisitForPatient(row.patientId);
        return applyOpdVisitSummaryOverlay(row, summary);
      } catch {
        return row;
      }
    }),
  );

  return {
    ...response,
    items,
    stats: computeOpdPatientsStats(items),
  };
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

  const empiPage = await searchEmpiPatients(params.filters, params.page, params.limit);
  const base = buildOpdListResponseFromEmpi(empiPage.data, empiPage.total, params);
  return withOpdVisitOverlay(base);
}
