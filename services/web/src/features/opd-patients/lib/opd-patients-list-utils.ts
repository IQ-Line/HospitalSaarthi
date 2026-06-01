import type {
  OpdDoctorScope,
  OpdPatientsFilters,
  OpdPatientsStats,
  OpdPatientVisitRow,
} from '../types';

export function matchesAgeGroup(age: number, group: string): boolean {
  if (!group) return true;
  if (group === '0-12') return age <= 12;
  if (group === '13-18') return age >= 13 && age <= 18;
  if (group === '19-30') return age >= 19 && age <= 30;
  if (group === '31-50') return age >= 31 && age <= 50;
  if (group === '51+') return age >= 51;
  return true;
}

export function filterOpdPatientRows(
  rows: OpdPatientVisitRow[],
  filters: OpdPatientsFilters,
  doctorScope: OpdDoctorScope,
): OpdPatientVisitRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (doctorScope === 'myPatients' && !row.isOwnPatient) return false;
    if (doctorScope === 'otherPatients' && row.isOwnPatient) return false;
    if (q) {
      const hay = `${row.visitNumber} ${row.patientName} ${row.patientId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.gender && row.gender !== filters.gender) return false;
    if (filters.ageGroup && !matchesAgeGroup(row.age, filters.ageGroup)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.doctorId && row.doctorId !== filters.doctorId) return false;
    if (filters.startDate && row.visitCreatedAt < filters.startDate) return false;
    if (filters.endDate && row.visitCreatedAt > filters.endDate) return false;
    return true;
  });
}

export function computeOpdPatientsStats(rows: OpdPatientVisitRow[]): OpdPatientsStats {
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'registered' || r.status === 'in-progress').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    reviewed: rows.filter((r) => r.status === 'completed').length,
  };
}
