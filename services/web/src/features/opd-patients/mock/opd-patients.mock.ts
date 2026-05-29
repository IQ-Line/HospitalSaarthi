import type {
  OpdPatientVisitRow,
  OpdPatientsFilters,
  OpdPatientsListParams,
  OpdPatientsListResponse,
  OpdPatientsStats,
} from '../types';

const MOCK_ROWS: OpdPatientVisitRow[] = [
  {
    id: 'v-19',
    visitNumber: 'OP2605130000019',
    patientId: 'p-19',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-18',
    visitNumber: 'OP2605130000018',
    patientId: 'p-18',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-17',
    visitNumber: 'OP2605130000017',
    patientId: 'p-17',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: false,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-16',
    visitNumber: 'OP2605130000016',
    patientId: 'p-16',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-15',
    visitNumber: 'OP2605130000015',
    patientId: 'p-15',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: false,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-14',
    visitNumber: 'OP2605130000014',
    patientId: 'p-14',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-13',
    visitNumber: 'OP2605130000013',
    patientId: 'p-13',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-12',
    visitNumber: 'OP2605130000012',
    patientId: 'p-12',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'completed',
    isOwnPatient: true,
    actionLabel: 'View RX',
  },
  {
    id: 'v-11',
    visitNumber: 'OP2605130000011',
    patientId: 'p-11',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'completed',
    isOwnPatient: false,
    actionLabel: 'View RX',
  },
  {
    id: 'v-10',
    visitNumber: 'OP2605130000010',
    patientId: 'p-10',
    patientName: 'Yash',
    age: 45,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-13',
    status: 'completed',
    isOwnPatient: true,
    actionLabel: 'View RX',
  },
  {
    id: 'v-9',
    visitNumber: 'OP2605120000009',
    patientId: 'p-9',
    patientName: 'Priya Sharma',
    age: 32,
    gender: 'female',
    doctorName: 'Dr. Demo DoctorTwo',
    doctorId: 'doc-2',
    visitCreatedAt: '2026-05-12',
    status: 'in-progress',
    isOwnPatient: false,
    actionLabel: 'Start RX',
  },
  {
    id: 'v-8',
    visitNumber: 'OP2605120000008',
    patientId: 'p-8',
    patientName: 'Rahul Verma',
    age: 28,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-12',
    status: 'registered',
    isOwnPatient: true,
    actionLabel: 'Start RX',
  },
  {
    id: 'v-7',
    visitNumber: 'OP2605110000007',
    patientId: 'p-7',
    patientName: 'Anita Devi',
    age: 55,
    gender: 'female',
    doctorName: 'Dr. Demo DoctorTwo',
    doctorId: 'doc-2',
    visitCreatedAt: '2026-05-11',
    status: 'in-progress',
    isOwnPatient: false,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-6',
    visitNumber: 'OP2605110000006',
    patientId: 'p-6',
    patientName: 'Vikram Singh',
    age: 41,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-11',
    status: 'cancelled',
    isOwnPatient: true,
    actionLabel: 'View RX',
  },
  {
    id: 'v-5',
    visitNumber: 'OP2605100000005',
    patientId: 'p-5',
    patientName: 'Meera Nair',
    age: 19,
    gender: 'female',
    doctorName: 'Dr. Demo DoctorTwo',
    doctorId: 'doc-2',
    visitCreatedAt: '2026-05-10',
    status: 'completed',
    isOwnPatient: false,
    actionLabel: 'View RX',
  },
  {
    id: 'v-4',
    visitNumber: 'OP2605100000004',
    patientId: 'p-4',
    patientName: 'Arjun Patel',
    age: 8,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-10',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-3',
    visitNumber: 'OP2605090000003',
    patientId: 'p-3',
    patientName: 'Sunita Rao',
    age: 62,
    gender: 'female',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-09',
    status: 'completed',
    isOwnPatient: true,
    actionLabel: 'View RX',
  },
  {
    id: 'v-2',
    visitNumber: 'OP2605090000002',
    patientId: 'p-2',
    patientName: 'Karan Mehta',
    age: 24,
    gender: 'male',
    doctorName: 'Dr. Demo DoctorTwo',
    doctorId: 'doc-2',
    visitCreatedAt: '2026-05-09',
    status: 'registered',
    isOwnPatient: false,
    actionLabel: 'Start RX',
  },
  {
    id: 'v-1',
    visitNumber: 'OP2605080000001',
    patientId: 'p-1',
    patientName: 'Lakshmi Iyer',
    age: 37,
    gender: 'female',
    doctorName: 'Dr. Demo DoctorOne',
    doctorId: 'doc-1',
    visitCreatedAt: '2026-05-08',
    status: 'in-progress',
    isOwnPatient: true,
    actionLabel: 'Edit RX',
  },
  {
    id: 'v-0',
    visitNumber: 'OP2605080000000',
    patientId: 'p-0',
    patientName: 'Guest Walk-in',
    age: 50,
    gender: 'other',
    doctorName: 'Dr. Demo DoctorTwo',
    doctorId: 'doc-2',
    visitCreatedAt: '2026-05-08',
    status: 'in-progress',
    isOwnPatient: false,
    actionLabel: 'Edit RX',
  },
];

function matchesAgeGroup(age: number, group: string): boolean {
  if (!group) return true;
  if (group === '0-12') return age <= 12;
  if (group === '13-18') return age >= 13 && age <= 18;
  if (group === '19-30') return age >= 19 && age <= 30;
  if (group === '31-50') return age >= 31 && age <= 50;
  if (group === '51+') return age >= 51;
  return true;
}

function filterRows(rows: OpdPatientVisitRow[], filters: OpdPatientsFilters, doctorScope: string): OpdPatientVisitRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (doctorScope === 'myPatients' && !row.isOwnPatient) return false;
    if (doctorScope === 'otherPatients' && row.isOwnPatient) return false;
    if (q) {
      const hay = `${row.visitNumber} ${row.patientName} ${row.patientId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.gender && row.gender !== filters.gender) return false;
    if (filters.ageGroup && !matchesAgeGroup(row.age, filters.ageGroup)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.doctorId && row.doctorId !== filters.doctorId) return false;
    if (filters.startDate && row.visitCreatedAt < filters.startDate) return false;
    if (filters.endDate && row.visitCreatedAt > filters.endDate) return false;
    return true;
  });
}

function computeStats(rows: OpdPatientVisitRow[]): OpdPatientsStats {
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'registered' || r.status === 'in-progress').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    reviewed: rows.filter((r) => r.status === 'completed').length,
  };
}

export function getMockOpdPatientsList(params: OpdPatientsListParams): OpdPatientsListResponse {
  const filtered = filterRows(MOCK_ROWS, params.filters, params.doctorScope);
  const stats = computeStats(filtered);
  const start = (params.page - 1) * params.limit;
  const items = filtered.slice(start, start + params.limit);
  return { items, total: filtered.length, stats };
}

export const MOCK_OPD_DOCTORS = [
  { id: 'doc-1', name: 'Dr. Demo DoctorOne' },
  { id: 'doc-2', name: 'Dr. Demo DoctorTwo' },
] as const;
