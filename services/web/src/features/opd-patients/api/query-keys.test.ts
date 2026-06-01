import { describe, expect, it } from 'vitest';
import { opdPatientsQueryKeys } from './query-keys';
import type { OpdPatientsListParams } from '../types';

const params: OpdPatientsListParams = {
  page: 1,
  limit: 10,
  doctorScope: 'all',
  filters: {
    search: '',
    startDate: '',
    endDate: '',
    gender: '',
    ageGroup: '',
    visitType: '',
    status: '',
    doctorId: '',
  },
};

describe('opdPatientsQueryKeys.list', () => {
  it('uses stable primitive segments for the same filters', () => {
    const a = opdPatientsQueryKeys.list(params);
    const b = opdPatientsQueryKeys.list({ ...params, filters: { ...params.filters } });
    expect(a).toEqual(b);
  });

  it('changes when page or filters change', () => {
    const base = opdPatientsQueryKeys.list(params);
    const nextPage = opdPatientsQueryKeys.list({ ...params, page: 2 });
    const withSearch = opdPatientsQueryKeys.list({
      ...params,
      filters: { ...params.filters, search: 'ada' },
    });
    expect(base).not.toEqual(nextPage);
    expect(base).not.toEqual(withSearch);
  });
});
