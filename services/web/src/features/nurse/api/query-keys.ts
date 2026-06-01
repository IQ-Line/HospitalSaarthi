import type { OpdPatientsListParams } from '../types';

export const nursePatientsQueryKeys = {
  all: ['nurse-patients'] as const,
  list: (params: OpdPatientsListParams) =>
    [
      ...nursePatientsQueryKeys.all,
      'list',
      params.page,
      params.limit,
      params.filters.search,
      params.filters.startDate,
      params.filters.endDate,
      params.filters.gender,
      params.filters.ageGroup,
      params.filters.visitType,
      params.filters.status,
      params.filters.doctorId,
    ] as const,
};
