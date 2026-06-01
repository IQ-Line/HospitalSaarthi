import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOpdPatientsList } from './opd-patients';
import type { OpdPatientsListParams } from '../types';

vi.mock('./opd-module-patients', () => ({
  searchOpdModulePatients: vi.fn(),
}));

vi.mock('./empi-patients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./empi-patients')>();
  return {
    ...actual,
    fetchEmpiPatientDetail: vi.fn(),
    searchEmpiPatients: vi.fn(),
  };
});

import { searchOpdModulePatients } from './opd-module-patients';
import { fetchEmpiPatientDetail } from './empi-patients';

const baseParams: OpdPatientsListParams = {
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

describe('fetchOpdPatientsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps OPD encounters when EMPI detail lookup fails', async () => {
    vi.mocked(searchOpdModulePatients).mockResolvedValue({
      items: [
        {
          patient_id: 'p1',
          visit_id: 'v1',
          visit_status: 'completed',
          prescription_status: 'final',
          updated_at: '2026-06-01T08:00:00Z',
          created_at: '2026-06-01T08:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    vi.mocked(fetchEmpiPatientDetail).mockRejectedValue(new Error('not found'));

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.patientId).toBe('p1');
    expect(result.items[0]?.status).toBe('completed');
    expect(result.total).toBe(1);
    expect(result.stats.reviewed).toBe(1);
  });

  it('enriches rows from EMPI when detail lookup succeeds', async () => {
    vi.mocked(searchOpdModulePatients).mockResolvedValue({
      items: [
        {
          patient_id: 'p1',
          visit_id: 'v1',
          visit_status: 'completed',
          prescription_status: 'final',
          updated_at: '2026-06-01T08:00:00Z',
          created_at: '2026-06-01T08:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    vi.mocked(fetchEmpiPatientDetail).mockResolvedValue({
      patient: {
        id: 'p1',
        iq_tenant_id: 't1',
        uhid: 'UHID001',
        abha_number: null,
        first_name: 'Ada',
        middle_name: null,
        last_name: 'Lovelace',
        full_name: 'Ada Lovelace',
        date_of_birth: '1815-12-10',
        age_years: 210,
        gender: 'female',
        phone_number: '9999999999',
        status: 'active',
        created_at: '2026-05-29T04:54:31.522756Z',
        updated_at: '2026-05-29T04:55:49.481139Z',
      },
      addresses: [],
      identifiers: [],
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.patientName).toBe('Ada Lovelace');
    expect(result.items[0]?.visitNumber).toBe('UHID001');
  });
});
