import type { AdmissionsListParams } from '../types';

export const ipdQueryKeys = {
  all: ['ipd'] as const,
  admissions: () => [...ipdQueryKeys.all, 'admissions'] as const,
  admissionsList: (params: AdmissionsListParams) =>
    [...ipdQueryKeys.admissions(), 'list', params] as const,
  admissionDetail: (id: string) => [...ipdQueryKeys.admissions(), 'detail', id] as const,
  wards: () => [...ipdQueryKeys.all, 'wards'] as const,
};
