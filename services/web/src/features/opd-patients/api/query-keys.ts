import type { OpdPatientVisitRow, OpdPatientsListParams } from '../types';

export const opdPatientsQueryKeys = {
  all: ['opd-patients'] as const,
  list: (params: OpdPatientsListParams) => [...opdPatientsQueryKeys.all, 'list', params] as const,
  detail: (row: OpdPatientVisitRow | null) =>
    [...opdPatientsQueryKeys.all, 'detail', row?.patientId ?? '', row?.id ?? ''] as const,
};
