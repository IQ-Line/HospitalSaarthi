import type { EmpiPatient, EmpiPatientSearchResponse } from '@/features/opd-patients/api/empi-patients';

const MOCK_IPD_PATIENTS: EmpiPatient[] = [
  {
    id: 'mock-patient-vikram',
    iq_tenant_id: 'tenant-1',
    uhid: 'PAT-20260601-0077',
    abha_number: null,
    first_name: 'Vikram',
    middle_name: null,
    last_name: 'Joshi',
    full_name: 'Vikram Joshi',
    date_of_birth: '1985-03-12',
    age_years: 41,
    gender: 'male',
    phone_number: '9876543210',
    status: 'active',
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'mock-patient-sunita',
    iq_tenant_id: 'tenant-1',
    uhid: 'PAT-20260602-0044',
    abha_number: null,
    first_name: 'Sunita',
    middle_name: null,
    last_name: 'Devi',
    full_name: 'Sunita Devi',
    date_of_birth: '1990-07-22',
    age_years: 35,
    gender: 'female',
    phone_number: '9123456780',
    status: 'active',
    created_at: '2026-06-02T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'mock-patient-ramesh',
    iq_tenant_id: 'tenant-1',
    uhid: 'PAT-20260603-0089',
    abha_number: null,
    first_name: 'Ramesh',
    middle_name: null,
    last_name: 'Patel',
    full_name: 'Ramesh Patel',
    date_of_birth: '1978-11-05',
    age_years: 47,
    gender: 'male',
    phone_number: '9988776655',
    status: 'active',
    created_at: '2026-06-03T11:00:00Z',
    updated_at: '2026-06-03T11:00:00Z',
  },
  {
    id: 'mock-patient-priya',
    iq_tenant_id: 'tenant-1',
    uhid: 'PAT-20260604-0012',
    abha_number: null,
    first_name: 'Priya',
    middle_name: null,
    last_name: 'Sharma',
    full_name: 'Priya Sharma',
    date_of_birth: '1995-01-18',
    age_years: 31,
    gender: 'female',
    phone_number: '9012345678',
    status: 'active',
    created_at: '2026-06-04T08:00:00Z',
    updated_at: '2026-06-04T08:00:00Z',
  },
  {
    id: 'mock-patient-abhay',
    iq_tenant_id: 'tenant-1',
    uhid: 'PAT-20260605-0036',
    abha_number: null,
    first_name: 'Abhay',
    middle_name: 'Kumar',
    last_name: 'Singh',
    full_name: 'Abhay Kumar Singh',
    date_of_birth: '1982-09-30',
    age_years: 43,
    gender: 'male',
    phone_number: '9876512345',
    status: 'active',
    created_at: '2026-06-05T14:00:00Z',
    updated_at: '2026-06-05T14:00:00Z',
  },
];

export function searchMockIpdPatients(
  query: string,
  page = 1,
  limit = 8,
): EmpiPatientSearchResponse {
  const q = query.trim().toLowerCase();
  const filtered = q.length < 2
    ? []
    : MOCK_IPD_PATIENTS.filter((p) =>
        `${p.full_name} ${p.uhid} ${p.phone_number}`.toLowerCase().includes(q),
      );
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  };
}
