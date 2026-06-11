import type { HistoricalRecordsFilters } from '../types';

export const historicalRecordsQueryKeys = {
  all: ['historical-records'] as const,
  list: (params: { page: number; limit: number; filters: HistoricalRecordsFilters }) =>
    [...historicalRecordsQueryKeys.all, 'list', params] as const,
  patientProfile: (patientId: string) =>
    [...historicalRecordsQueryKeys.all, 'profile', patientId] as const,
  patientDocuments: (patientId: string, filters: Record<string, string>) =>
    [...historicalRecordsQueryKeys.all, 'documents', patientId, filters] as const,
  patientReports: (patientId: string, filters: Record<string, string>) =>
    [...historicalRecordsQueryKeys.all, 'reports', patientId, filters] as const,
  doctorLookup: () => [...historicalRecordsQueryKeys.all, 'doctors'] as const,
};
