import {
  empiPatientAgeYears,
  empiPatientCreatedDate,
  empiStatusToOpdVisitStatus,
  type EmpiPatient,
} from './empi-patients';
import { computeOpdPatientsStats, filterOpdPatientRows } from '../lib/opd-patients-list-utils';
import type { OpdDoctorScope, OpdPatientsFilters, OpdPatientVisitRow, OpdPatientsListResponse } from '../types';

function hasClientOnlyFilters(filters: OpdPatientsFilters, doctorScope: OpdDoctorScope): boolean {
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

export function mapEmpiPatientToVisitRow(patient: EmpiPatient): OpdPatientVisitRow {
  const status = empiStatusToOpdVisitStatus(patient.status);
  return {
    id: patient.id,
    visitNumber: patient.uhid,
    patientId: patient.id,
    patientName: patient.full_name,
    age: empiPatientAgeYears(patient),
    gender: patient.gender,
    doctorName: '—',
    doctorId: '',
    visitCreatedAt: empiPatientCreatedDate(patient),
    status,
    isOwnPatient: true,
    actionLabel: status === 'completed' || status === 'cancelled' ? 'View RX' : 'Create Rx',
  };
}

export function buildOpdListResponseFromEmpi(
  patients: EmpiPatient[],
  total: number,
  params: { filters: OpdPatientsFilters; doctorScope: OpdDoctorScope },
): OpdPatientsListResponse {
  const rows = patients.map(mapEmpiPatientToVisitRow);
  if (hasClientOnlyFilters(params.filters, params.doctorScope)) {
    const filtered = filterOpdPatientRows(rows, params.filters, params.doctorScope);
    return {
      items: filtered,
      total: filtered.length,
      stats: computeOpdPatientsStats(filtered),
    };
  }
  return {
    items: rows,
    total,
    stats: computeOpdPatientsStats(rows),
  };
}
