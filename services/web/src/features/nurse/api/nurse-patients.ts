import { listRegistrationVisits } from '@/features/frontdesk/api/registrations';
import { fetchOpdEncounterOverlaysByVisitIds, encounterOverlaysToRecord, getEncounterOverlayByVisitId } from '@/features/opd-patients/api/opd-encounter-overlay';
import { fetchEmpiPatientLookupMap } from '@/features/opd-patients/api/empi-patients';
import { mapRegistrationVisitToOpdPatientRow } from '@/features/opd-patients/api/registration-patients-mapper';
import { matchesAgeGroup } from '@/features/opd-patients/lib/opd-patients-list-utils';
import { opdUiStatusToRegistrationVisitQuery } from '@/features/opd-patients/lib/registration-visit-status';
import type {
  OpdPatientsFilters,
  OpdPatientsListParams,
  OpdVisitStatus,
} from '@/features/opd-patients/types';
import { computeNursePatientsStats } from '../lib/nurse-patients-stats';
import type { NursePatientVisitRow, NursePatientsListResponse } from '../types';

function nurseVitalsActionLabel(
  status: OpdVisitStatus,
  vitalsRecorded: boolean,
): NursePatientVisitRow['vitalsActionLabel'] {
  if (status === 'completed') return 'View Vitals';
  if (vitalsRecorded) return 'Edit Vitals';
  return 'Add Vitals';
}

function vitalsLikelyRecorded(registrationStatus: string, opdVisitStatus?: string): boolean {
  const opd = opdVisitStatus?.trim().toLowerCase().replace(/-/g, '_');
  if (opd === 'pre_consulted' || opd === 'in_progress') return true;
  const normalized = registrationStatus.trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'in_progress' || normalized === 'completed';
}

function formatConsultationType(visitType: string | null | undefined): string {
  if (!visitType) return '—';
  const normalized = visitType.toLowerCase().replace(/_/g, '-');
  if (normalized.includes('follow')) return 'Follow-up';
  if (normalized === 'new' || normalized.includes('new') || normalized.includes('first')) {
    return 'New';
  }
  return visitType;
}

function filterNurseRows(
  rows: NursePatientVisitRow[],
  filters: OpdPatientsFilters,
): NursePatientVisitRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (q) {
      const hay = `${row.visitNumber} ${row.uhid} ${row.patientName} ${row.patientId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.gender && row.gender !== filters.gender) return false;
    if (filters.ageGroup && !matchesAgeGroup(row.age, filters.ageGroup)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.startDate && row.visitCreatedAt < filters.startDate) return false;
    if (filters.endDate && row.visitCreatedAt > filters.endDate) return false;
    return true;
  });
}

export async function fetchNursePatientsList(
  params: OpdPatientsListParams,
): Promise<NursePatientsListResponse> {
  const statusQuery = opdUiStatusToRegistrationVisitQuery(params.filters.status);

  const visitPage = await listRegistrationVisits({
    page: params.page,
    limit: params.limit,
    ...(statusQuery ? { status: statusQuery } : {}),
  });

  const [empiById, encounterByVisitId] = await Promise.all([
    fetchEmpiPatientLookupMap(visitPage.data.map((visit) => visit.patient_id)),
    fetchOpdEncounterOverlaysByVisitIds(visitPage.data.map((visit) => visit.id)),
  ]);

  let items: NursePatientVisitRow[] = visitPage.data.map((visit) => {
    const encounter = getEncounterOverlayByVisitId(encounterByVisitId, visit.id);
    const row = mapRegistrationVisitToOpdPatientRow(
      visit,
      empiById.get(visit.patient_id),
      encounter?.prescriptionStatus,
      encounter?.visitStatus,
    );
    const empi = empiById.get(visit.patient_id);
    const vitalsRecorded = vitalsLikelyRecorded(visit.status, encounter?.visitStatus);

    return {
      id: row.id,
      visitNumber: row.visitNumber,
      uhid: empi?.uhid?.trim() || '—',
      patientId: row.patientId,
      patientName: row.patientName,
      age: row.age,
      gender: row.gender,
      doctorName: 'Dr. Demo DoctorOne',
      visitCreatedAt: row.visitCreatedAt,
      status: row.status,
      consultationType: formatConsultationType(visit.visit_type),
      vitalsRecorded,
      vitalsActionLabel: nurseVitalsActionLabel(row.status, vitalsRecorded),
    };
  });

  const hasClientFilters =
    !!params.filters.gender ||
    !!params.filters.ageGroup ||
    !!params.filters.startDate ||
    !!params.filters.endDate ||
    params.filters.search.trim().length > 0 ||
    (!!params.filters.status && !statusQuery);

  if (hasClientFilters) {
    items = filterNurseRows(items, params.filters);
  }

  const total = hasClientFilters ? items.length : visitPage.total;

  return {
    items,
    total,
    stats: computeNursePatientsStats(items),
    encounterOverlaysByVisitId: encounterOverlaysToRecord(encounterByVisitId),
  };
}
