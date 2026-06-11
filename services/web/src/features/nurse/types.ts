import type { OpdPatientsFilters, OpdPatientsListParams, OpdVisitStatus } from '@/features/opd-patients/types';
import type { OpdEncounterOverlay } from '@/features/opd-patients/api/opd-encounter-overlay';

export type { OpdPatientsFilters, OpdPatientsListParams };

export interface NursePatientVisitRow {
  id: string;
  visitNumber: string;
  uhid: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  doctorName: string;
  visitCreatedAt: string;
  status: OpdVisitStatus;
  consultationType: string;
  vitalsRecorded: boolean;
  vitalsActionLabel: 'Add Vitals' | 'Edit Vitals' | 'View Vitals';
}

export interface NursePatientsStats {
  total: number;
  pendingVitals: number;
  vitalsTaken: number;
  doctorReviewed: number;
}

export interface NursePatientsListResponse {
  items: NursePatientVisitRow[];
  total: number;
  stats: NursePatientsStats;
  encounterOverlaysByVisitId?: Record<string, OpdEncounterOverlay>;
}
