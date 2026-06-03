import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOpdPatientsList } from './opd-patients';
import type { OpdPatientsListParams } from '../types';

vi.mock('@/features/frontdesk/api/registrations', () => ({
  listRegistrations: vi.fn(),
}));

vi.mock('@/features/create-rx/api/opd-prescription', () => ({
  listOpdVisitsForPatients: vi.fn(),
}));

import { listRegistrations } from '@/features/frontdesk/api/registrations';
import { listOpdVisitsForPatients } from '@/features/create-rx/api/opd-prescription';

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

const sampleRegistration = {
  registration_id: 'reg-1',
  iq_tenant_id: 'tenant-1',
  visit_id: null,
  patient_id: 'p1',
  patient_uhid: 'UHID001',
  patient_full_name: 'Ada Lovelace',
  patient_phone_number: '9999999999',
  patient_gender: 'female',
  patient_date_of_birth: '1990-01-15',
  patient_year_of_birth: null,
  patient_source_record_id: 'src-1',
  facility_id: null,
  visit_type: 'opd_first',
  department_id: null,
  provider_id: null,
  appointment_id: null,
  registration_status: 'completed',
  created_by: null,
  updated_by: null,
  created_at: '2026-06-02T10:00:00Z',
  updated_at: '2026-06-02T10:00:00Z',
};

describe('fetchOpdPatientsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listOpdVisitsForPatients).mockResolvedValue([]);
  });

  it('lists registrations and overlays OPD visit status when present', async () => {
    vi.mocked(listRegistrations).mockResolvedValue({
      data: [sampleRegistration],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
    vi.mocked(listOpdVisitsForPatients).mockResolvedValue([
      {
        visit_id: 'v1',
        patient_id: 'p1',
        status: 'completed',
        updated_at: '2026-06-02T11:00:00Z',
      },
    ]);

    const result = await fetchOpdPatientsList(baseParams);

    expect(listRegistrations).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.patientId).toBe('p1');
    expect(result.items[0]?.patientName).toBe('Ada Lovelace');
    expect(result.items[0]?.id).toBe('v1');
    expect(result.items[0]?.status).toBe('completed');
    expect(result.items[0]?.actionLabel).toBe('View RX');
    expect(result.total).toBe(1);
    expect(result.stats.reviewed).toBe(1);
  });

  it('shows Start RX for registrations without an OPD visit', async () => {
    vi.mocked(listRegistrations).mockResolvedValue({
      data: [sampleRegistration],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.id).toBe('p1');
    expect(result.items[0]?.status).toBe('registered');
    expect(result.items[0]?.actionLabel).toBe('Start RX');
  });
});
