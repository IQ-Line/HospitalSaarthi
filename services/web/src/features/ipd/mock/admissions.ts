import type {
  AdmissionDetail,
  AdmissionFormInput,
  AdmissionRow,
  AdmissionsListParams,
  AdmissionsListResponse,
  WardBeds,
} from '../types';

export const MOCK_WARDS: WardBeds[] = [
  {
    id: 'gw1a',
    name: 'General Ward 1A',
    beds: Array.from({ length: 24 }, (_, i) => ({
      id: `GW1A-${String(i + 1).padStart(3, '0')}`,
      label: `GW1A-${String(i + 1).padStart(3, '0')}`,
      class: 'general',
    })),
  },
  {
    id: 'gw1b',
    name: 'General Ward 1B',
    beds: Array.from({ length: 24 }, (_, i) => ({
      id: `GW1B-${String(i + 1).padStart(3, '0')}`,
      label: `GW1B-${String(i + 1).padStart(3, '0')}`,
      class: 'general',
    })),
  },
  {
    id: 'how',
    name: 'Haemato-Oncology Ward',
    beds: [
      { id: 'HOW-HO-01', label: 'HOW-HO-01', class: 'isolation' },
      { id: 'HOW-HO-02', label: 'HOW-HO-02', class: 'isolation' },
      { id: 'HOW-HO-03', label: 'HOW-HO-03', class: 'general' },
    ],
  },
  {
    id: 'pw2a',
    name: 'Private Ward 2A',
    beds: Array.from({ length: 12 }, (_, i) => ({
      id: `PW2A-${String(i + 1).padStart(3, '0')}`,
      label: `PW2A-${String(i + 1).padStart(3, '0')}`,
      class: 'private',
    })),
  },
];

function toPatientLabel(name: string, uhid: string): string {
  return `${name} · ${uhid}`;
}

function seedDetail(
  row: AdmissionRow,
  form: Partial<AdmissionFormInput>,
): AdmissionDetail {
  return {
    ...row,
    patientId: form.patientId ?? `mock-${row.id}`,
    patientLabel: form.patientLabel ?? toPatientLabel(row.patientName, row.uhid),
    admissionType: form.admissionType ?? row.type,
    admissionSource: form.admissionSource ?? 'opd_referral',
    specialty: form.specialty ?? row.specialty,
    consultant: form.consultant ?? 'dr_demo',
    dayCare: form.dayCare ?? false,
    mlc: form.mlc ?? false,
    provisionalDiagnosis: form.provisionalDiagnosis ?? '',
    expectedLosDays: form.expectedLosDays ?? 3,
    wardPreference: form.wardPreference ?? 'general',
    flags: form.flags ?? [],
    bedId: form.bedId ?? 'GW1A-001',
    financialClass: form.financialClass ?? 'general',
  };
}

const ALL_ADMISSIONS: AdmissionDetail[] = [
  seedDetail(
    {
      id: 'a-5',
      episodeNumber: 'IPD-2026-000005',
      patientName: 'Abhay Kumar Singh',
      uhid: 'PAT-20260605-0036',
      type: 'planned',
      status: 'pending_clearance',
      specialty: 'general_medicine',
      requestedAt: '2026-06-06T08:19:11Z',
      admittedAt: null,
    },
    { provisionalDiagnosis: 'Acute febrile illness', bedId: 'GW1A-007', flags: ['High Risk'] },
  ),
  seedDetail(
    {
      id: 'a-4',
      episodeNumber: 'IPD-2026-000004',
      patientName: 'Priya Sharma',
      uhid: 'PAT-20260604-0012',
      type: 'planned',
      status: 'admitted',
      specialty: 'obstetrics_gynecology',
      requestedAt: '2026-06-06T08:18:45Z',
      admittedAt: '2026-06-06T09:00:00Z',
    },
    { admissionSource: 'direct', bedId: 'PW2A-003', expectedLosDays: 5, financialClass: 'insurance' },
  ),
  seedDetail(
    {
      id: 'a-3',
      episodeNumber: 'IPD-2026-000003',
      patientName: 'Ramesh Patel',
      uhid: 'PAT-20260603-0089',
      type: 'emergency',
      status: 'scheduled',
      specialty: 'oncology',
      requestedAt: '2026-06-06T08:15:30Z',
      admittedAt: null,
    },
    { admissionSource: 'er', mlc: true, bedId: 'HOW-HO-02', flags: ['Isolation', 'Allergy Alert'] },
  ),
  seedDetail(
    {
      id: 'a-2',
      episodeNumber: 'IPD-2026-000002',
      patientName: 'Sunita Devi',
      uhid: 'PAT-20260602-0044',
      type: 'planned',
      status: 'scheduled',
      specialty: 'cardiology',
      requestedAt: '2026-06-05T14:22:00Z',
      admittedAt: null,
    },
    { admissionSource: 'transfer', bedId: 'GW1B-012' },
  ),
  seedDetail(
    {
      id: 'a-1',
      episodeNumber: 'IPD-2026-000001',
      patientName: 'Vikram Joshi',
      uhid: 'PAT-20260601-0077',
      type: 'emergency',
      status: 'scheduled',
      specialty: 'general_medicine',
      requestedAt: '2026-06-05T09:10:00Z',
      admittedAt: null,
    },
    { dayCare: true, bedId: 'GW1A-001' },
  ),
];

function toListRow(detail: AdmissionDetail): AdmissionRow {
  return {
    id: detail.id,
    episodeNumber: detail.episodeNumber,
    patientName: detail.patientName,
    uhid: detail.uhid,
    type: detail.type,
    status: detail.status,
    specialty: detail.specialty,
    requestedAt: detail.requestedAt,
    admittedAt: detail.admittedAt,
  };
}

function filterRows(params: AdmissionsListParams): AdmissionDetail[] {
  const q = params.filters.search.trim().toLowerCase();
  return ALL_ADMISSIONS.filter((row) => {
    if (params.filters.status && row.status !== params.filters.status) return false;
    if (params.filters.type && row.type !== params.filters.type) return false;
    if (q && !`${row.patientName} ${row.uhid} ${row.episodeNumber}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

export function getMockAdmissionsList(params: AdmissionsListParams): AdmissionsListResponse {
  const filtered = filterRows(params);
  const start = (params.page - 1) * params.limit;
  return {
    items: filtered.slice(start, start + params.limit).map(toListRow),
    total: filtered.length,
  };
}

export function getMockAdmissionById(id: string): AdmissionDetail | null {
  return ALL_ADMISSIONS.find((a) => a.id === id) ?? null;
}

let nextEpisode = 6;

function applyFormToDetail(
  existing: AdmissionDetail,
  input: AdmissionFormInput,
): AdmissionDetail {
  const [patientName, uhidPart] = input.patientLabel.split('·').map((s) => s.trim());
  return {
    ...existing,
    ...input,
    patientName: patientName || existing.patientName,
    uhid: uhidPart || existing.uhid,
    type: input.admissionType === 'emergency' ? 'emergency' : 'planned',
    specialty: input.specialty || existing.specialty,
  };
}

export async function createMockAdmission(
  input: AdmissionFormInput,
): Promise<{ id: string; episodeNumber: string }> {
  await new Promise((r) => setTimeout(r, 300));
  const episodeNumber = `IPD-2026-${String(nextEpisode).padStart(6, '0')}`;
  const id = `a-${nextEpisode}`;
  nextEpisode += 1;
  const [patientName, uhidPart] = input.patientLabel.split('·').map((s) => s.trim());
  const detail = seedDetail(
    {
      id,
      episodeNumber,
      patientName: patientName || 'Unknown',
      uhid: uhidPart || '—',
      type: input.admissionType === 'emergency' ? 'emergency' : 'planned',
      status: 'scheduled',
      specialty: input.specialty || 'general_medicine',
      requestedAt: new Date().toISOString(),
      admittedAt: null,
    },
    input,
  );
  ALL_ADMISSIONS.unshift(detail);
  return { id, episodeNumber };
}

export async function updateMockAdmission(
  id: string,
  input: AdmissionFormInput,
): Promise<{ id: string; episodeNumber: string }> {
  await new Promise((r) => setTimeout(r, 300));
  const index = ALL_ADMISSIONS.findIndex((a) => a.id === id);
  if (index < 0) throw new Error('Admission not found');
  const updated = applyFormToDetail(ALL_ADMISSIONS[index]!, input);
  ALL_ADMISSIONS[index] = updated;
  return { id: updated.id, episodeNumber: updated.episodeNumber };
}

export async function confirmMockAdmission(
  id: string,
): Promise<{ id: string; episodeNumber: string; status: 'admitted' }> {
  await new Promise((r) => setTimeout(r, 300));
  const index = ALL_ADMISSIONS.findIndex((a) => a.id === id);
  if (index < 0) throw new Error('Admission not found');
  const row = ALL_ADMISSIONS[index]!;
  if (row.status !== 'scheduled') {
    throw new Error('Only scheduled admissions can be confirmed');
  }
  if (!row.bedId) {
    throw new Error('Assign a bed before confirming admission');
  }
  const admittedAt = new Date().toISOString();
  ALL_ADMISSIONS[index] = {
    ...row,
    status: 'admitted',
    admittedAt,
  };
  return { id: row.id, episodeNumber: row.episodeNumber, status: 'admitted' };
}
