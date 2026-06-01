import type { NursePatientVisitRow, NursePatientsStats } from '../types';

export function computeNursePatientsStats(rows: NursePatientVisitRow[]): NursePatientsStats {
  return {
    total: rows.length,
    pendingVitals: rows.filter((r) => !r.vitalsRecorded && r.status === 'registered').length,
    vitalsTaken: rows.filter((r) => r.vitalsRecorded || r.status === 'pre-consulted').length,
    doctorReviewed: rows.filter((r) => r.status === 'completed').length,
  };
}
