import type { OpdPatientDetails, OpdPatientVisitRow } from '../types';

const YASH_DETAILS: OpdPatientDetails = {
  firstName: 'Yash',
  middleName: '-',
  lastName: '-',
  uhid: '260513000010000018',
  dateOfBirth: '13/5/1981',
  ageDisplay: '45 years',
  gender: 'Male',
  abhaNumber: 'N/A',
  abhaAddress: 'N/A',
  phoneNumber: '8765456789',
  streetAddress: '-',
  district: 'Bichom',
  state: 'Arunachal Pradesh',
  pinCode: '-',
  visitCount: 1,
  lastUpdated: '13/5/2026, 7:42:45 pm',
};

function genderLabel(gender: OpdPatientVisitRow['gender']): string {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  return 'Other';
}

function splitName(fullName: string): { first: string; middle: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '-', middle: '-', last: '-' };
  if (parts.length === 1) return { first: parts[0] ?? '-', middle: '-', last: '-' };
  if (parts.length === 2) return { first: parts[0] ?? '-', middle: '-', last: parts[1] ?? '-' };
  return {
    first: parts[0] ?? '-',
    middle: parts.slice(1, -1).join(' ') || '-',
    last: parts[parts.length - 1] ?? '-',
  };
}

function estimateDobFromAge(age: number, visitCreatedAt: string): string {
  const ref = new Date(visitCreatedAt);
  if (Number.isNaN(ref.getTime())) return '-';
  const dob = new Date(ref);
  dob.setFullYear(dob.getFullYear() - age);
  return dob.toLocaleDateString('en-IN');
}

function formatLastUpdated(visitCreatedAt: string): string {
  const d = new Date(`${visitCreatedAt}T19:12:45`);
  if (Number.isNaN(d.getTime())) return visitCreatedAt;
  return d.toLocaleString('en-IN');
}

/** Mock resolver until EMPI/OPD patient detail API is wired. */
export function getMockOpdPatientDetails(row: OpdPatientVisitRow): OpdPatientDetails {
  if (row.patientName === 'Yash') {
    return YASH_DETAILS;
  }

  const { first, middle, last } = splitName(row.patientName);
  const visitOrdinal = Number.parseInt(row.visitNumber.replace(/\D/g, '').slice(-2), 10) || 1;

  return {
    firstName: first,
    middleName: middle,
    lastName: last,
    uhid: `26${row.patientId.replace(/\D/g, '').padStart(16, '0').slice(0, 16)}`,
    dateOfBirth: estimateDobFromAge(row.age, row.visitCreatedAt),
    ageDisplay: `${row.age} years`,
    gender: genderLabel(row.gender),
    abhaNumber: 'N/A',
    abhaAddress: 'N/A',
    phoneNumber: '9876543210',
    streetAddress: '-',
    district: '-',
    state: '-',
    pinCode: '-',
    visitCount: visitOrdinal,
    lastUpdated: formatLastUpdated(row.visitCreatedAt),
  };
}
