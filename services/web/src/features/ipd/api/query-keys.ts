import type { AdmissionsListParams } from '../types';

export const ipdQueryKeys = {
  all: ['ipd'] as const,
  admissions: () => [...ipdQueryKeys.all, 'admissions'] as const,
  admissionsList: (params: AdmissionsListParams) =>
    [...ipdQueryKeys.admissions(), 'list', params] as const,
  admissionDetail: (id: string) => [...ipdQueryKeys.admissions(), 'detail', id] as const,
  clinicalNotes: (admissionId: string) =>
    [...ipdQueryKeys.admissions(), 'clinical-notes', admissionId] as const,
  vitalCheckIns: (admissionId: string, recorderRole?: string) =>
    [...ipdQueryKeys.admissions(), 'vital-check-ins', admissionId, recorderRole ?? 'all'] as const,
  orders: (admissionId: string, params?: unknown) =>
    [...ipdQueryKeys.admissions(), 'orders', admissionId, params ?? {}] as const,
  wards: () => [...ipdQueryKeys.all, 'wards'] as const,
};
