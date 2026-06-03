import { listRegistrations } from '@/features/frontdesk/api/registrations';
import type { RegistrationListItemResponse } from '@/features/frontdesk/types';
import { fetchEmpiPatientLookupMap } from '@/features/opd-patients/api/empi-patients';
import { mapOpdEncounterToVisitRow } from '@/features/opd-patients/api/opd-encounters-mapper';
import {
  searchOpdModulePatients,
  type OpdPatientEncounterApi,
} from '@/features/opd-patients/api/opd-module-patients';
import { matchesAgeGroup } from '@/features/opd-patients/lib/opd-patients-list-utils';
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

function vitalsLikelyRecorded(encounter: OpdPatientEncounterApi): boolean {
  if (encounter.visit_status === 'pre_consulted') return true;
  return encounter.prescription_status != null && encounter.visit_status !== 'registered';
}

function formatConsultationType(visitType: string | null | undefined): string {
  if (!visitType) return '—';
  const normalized = visitType.toLowerCase().replace(/_/g, '-');
  if (normalized.includes('follow')) return 'Follow-up';
  if (normalized === 'new' || normalized.includes('new')) return 'New';
  return visitType;
}

function latestRegistrationByPatient(
  registrations: RegistrationListItemResponse[],
): Map<string, RegistrationListItemResponse> {
  const map = new Map<string, RegistrationListItemResponse>();
  for (const reg of registrations) {
    const existing = map.get(reg.patient_id);
    if (!existing || reg.updated_at > existing.updated_at) {
      map.set(reg.patient_id, reg);
    }
  }
  return map;
}

async function loadRegistrationLookup(): Promise<Map<string, RegistrationListItemResponse>> {
  try {
    const page = await listRegistrations({ page: 1, limit: 500 });
    return latestRegistrationByPatient(page.data);
  } catch {
    return new Map();
  }
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

function toOpdStatusQuery(status: string): string | undefined {
  if (!status) return undefined;
  if (status === 'in-progress') return 'in_progress';
  if (status === 'pre-consulted') return 'pre_consulted';
  return status;
}

export async function fetchNursePatientsList(
  params: OpdPatientsListParams,
): Promise<NursePatientsListResponse> {
  const statusForOpd = toOpdStatusQuery(params.filters.status);
  const opdPage = await searchOpdModulePatients(params.page, params.limit, statusForOpd ?? '');

  const empiById = await fetchEmpiPatientLookupMap(
    opdPage.items.map((row) => row.patient_id),
  );

  const registrationByPatient = await loadRegistrationLookup();

  let items: NursePatientVisitRow[] = opdPage.items.map((encounter) => {
    const row = mapOpdEncounterToVisitRow(encounter, empiById.get(encounter.patient_id));
    const registration = registrationByPatient.get(encounter.patient_id);
    const vitalsRecorded = vitalsLikelyRecorded(encounter);
    const empi = empiById.get(encounter.patient_id);

    return {
      id: row.id,
      visitNumber: registration?.visit_id?.trim() || row.visitNumber,
      uhid: registration?.patient_uhid?.trim() || empi?.uhid || '—',
      patientId: row.patientId,
      patientName: registration?.patient_full_name?.trim() || row.patientName,
      age: row.age,
      gender: row.gender,
      doctorName: 'Dr. Demo DoctorOne',
      visitCreatedAt: registration?.created_at?.slice(0, 10) ?? row.visitCreatedAt,
      status: row.status,
      consultationType: formatConsultationType(registration?.visit_type),
      vitalsRecorded,
      vitalsActionLabel: nurseVitalsActionLabel(row.status, vitalsRecorded),
    };
  });

  const hasClientFilters =
    !!params.filters.gender ||
    !!params.filters.ageGroup ||
    !!params.filters.startDate ||
    !!params.filters.endDate ||
    params.filters.search.trim().length > 0;

  if (hasClientFilters) {
    items = filterNurseRows(items, params.filters);
  }

  const total = hasClientFilters ? items.length : opdPage.total;

  return {
    items,
    total,
    stats: computeNursePatientsStats(items),
  };
}
