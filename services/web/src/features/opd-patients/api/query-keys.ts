import type { OpdPatientVisitRow, OpdPatientsListParams } from '../types';

export const opdPatientsQueryKeys = {
  all: ['opd-patients'] as const,
  list: (params: OpdPatientsListParams) =>
    [
      ...opdPatientsQueryKeys.all,
      'list',
      params.page,
      params.limit,
      params.doctorScope,
      params.filters.search,
      params.filters.startDate,
      params.filters.endDate,
      params.filters.gender,
      params.filters.ageGroup,
      params.filters.visitType,
      params.filters.status,
      params.filters.doctorId,
    ] as const,
  detail: (row: OpdPatientVisitRow | null) =>
    [...opdPatientsQueryKeys.all, 'detail', row?.patientId ?? '', row?.id ?? ''] as const,
};
