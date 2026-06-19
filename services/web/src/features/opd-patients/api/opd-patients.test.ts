import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOpdPatientsList } from './opd-patients';
import type { OpdPatientsListParams } from '../types';

vi.mock('@/features/frontdesk/api/registrations', () => ({
  listRegistrationVisits: vi.fn(),
}));

vi.mock('./empi-patients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./empi-patients')>();
  return {
    ...actual,
    fetchEmpiPatientLookupMap: vi.fn(),
  };
});

vi.mock('./opd-encounter-overlay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./opd-encounter-overlay')>();
  return {
    ...actual,
    fetchOpdEncounterOverlaysByVisitIds: vi.fn(),
  };
});

import { listRegistrationVisits } from '@/features/frontdesk/api/registrations';
import { fetchOpdEncounterOverlaysByVisitIds } from './opd-encounter-overlay';
import { fetchEmpiPatientLookupMap } from './empi-patients';

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

const sampleVisit = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  visit_id: 'VIS-ABC12345',
  iq_tenant_id: 'tenant-1',
  patient_id: '660e8400-e29b-41d4-a716-446655440001',
  visit_type: 'opd_first',
  status: 'pending',
  facility_id: null,
  department_id: null,
  doctor_id: '880e8400-e29b-41d4-a716-446655440003',
  appointment_id: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-06-02T10:00:00Z',
  updated_at: '2026-06-02T10:00:00Z',
};

describe('fetchOpdPatientsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOpdEncounterOverlaysByVisitIds).mockResolvedValue(new Map());
    vi.mocked(fetchEmpiPatientLookupMap).mockResolvedValue(
      new Map([
        [
          sampleVisit.patient_id,
          {
            id: sampleVisit.patient_id,
            iq_tenant_id: 'tenant-1',
            uhid: 'UHID001',
            abha_number: null,
            first_name: 'Ada',
            middle_name: null,
            last_name: 'Lovelace',
            full_name: 'Ada Lovelace',
            date_of_birth: '1990-01-15',
            age_years: 36,
            gender: 'female',
            phone_number: '9999999999',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      ]),
    );
  });

  it('lists registration visits with EMPI demographics', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [sampleVisit],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(listRegistrationVisits).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.patientId).toBe(sampleVisit.patient_id);
    expect(result.items[0]?.patientName).toBe('Ada Lovelace');
    expect(result.items[0]?.id).toBe(sampleVisit.id);
    expect(result.items[0]?.visitNumber).toBe('VIS-ABC12345');
    expect(result.items[0]?.status).toBe('registered');
    expect(result.items[0]?.actionLabel).toBe('Create Rx');
    expect(result.total).toBe(1);
  });

  it('maps desk-completed visit without final RX as registered / Create Rx', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'completed' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('registered');
    expect(result.items[0]?.actionLabel).toBe('Create Rx');
  });

  it('shows Create Rx for in-progress registration without a draft prescription', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'in_progress' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('registered');
    expect(result.items[0]?.actionLabel).toBe('Create Rx');
  });

  it('shows Create Rx for auto-created draft before nurse or doctor acts', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'completed' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
    vi.mocked(fetchOpdEncounterOverlaysByVisitIds).mockResolvedValue(
      new Map([
        [sampleVisit.id, { prescriptionStatus: 'draft', visitStatus: 'registered' }],
      ]),
    );

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('registered');
    expect(result.items[0]?.actionLabel).toBe('Create Rx');
  });

  it('shows Edit RX and pre-consulted when doctor has saved partial consultation', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'pending' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
    vi.mocked(fetchOpdEncounterOverlaysByVisitIds).mockResolvedValue(
      new Map([
        [sampleVisit.id, { prescriptionStatus: 'draft', visitStatus: 'in_progress' }],
      ]),
    );

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('pre-consulted');
    expect(result.items[0]?.actionLabel).toBe('Edit RX');
  });

  it('maps nurse pre-consulted OPD overlay to Pre Consulted queue status', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'completed' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
    vi.mocked(fetchOpdEncounterOverlaysByVisitIds).mockResolvedValue(
      new Map([
        [
          sampleVisit.id,
          { prescriptionStatus: 'draft', visitStatus: 'pre_consulted' },
        ],
      ]),
    );

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('pre-consulted');
    expect(result.items[0]?.actionLabel).toBe('Edit RX');
  });

  it('maps cancelled registration visits', async () => {
    vi.mocked(listRegistrationVisits).mockResolvedValue({
      data: [{ ...sampleVisit, status: 'cancelled' }],
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    const result = await fetchOpdPatientsList(baseParams);

    expect(result.items[0]?.status).toBe('cancelled');
    expect(result.items[0]?.actionLabel).toBe('Create Rx');
  });
});
