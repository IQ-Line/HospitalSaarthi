import { apiClient } from '@/lib/api-client';
import type { VisitRegistrationAddressBlock } from '@/features/frontdesk/types';
import {
  formatEmpiAddressForDisplay,
  registrationAddressBlockFromForm,
  resolveDistrictDisplayName,
  resolveStateDisplayName,
} from '@/features/frontdesk/utils/report-address';
import type { OpdPatientDetails, OpdPatientsFilters, OpdVisitStatus } from '../types';

const EMPI_PATIENTS_BASE = '/api/empi/v1/patients';

export interface EmpiPatient {
  id: string;
  iq_tenant_id: string;
  uhid: string;
  abha_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;
  date_of_birth: string | null;
  age_years: number | null;
  gender: 'male' | 'female' | 'other';
  phone_number: string;
  status: 'active' | 'inactive' | 'deceased';
  created_at: string;
  updated_at: string;
}

export interface EmpiPatientSearchResponse {
  data: EmpiPatient[];
  total: number;
  page?: number;
  limit?: number;
  total_pages?: number;
}

export interface EmpiPatientAddress {
  id: string;
  address_type: 'permanent' | 'current' | 'temporary';
  street: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
}

export interface EmpiPatientDetailResponse {
  patient: EmpiPatient;
  addresses: EmpiPatientAddress[];
  identifiers: Array<{ identifier_type: string; identifier_value: string }>;
}

function buildSearchQuery(
  filters: OpdPatientsFilters,
  page: number,
  limit: number,
): string {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('limit', String(limit));

  const q = filters.search.trim();
  if (q.length >= 2) {
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 10) {
      sp.set('phone', digits);
    } else {
      sp.set('name', q);
    }
  }

  if (filters.status === 'cancelled') {
    sp.set('status', 'inactive');
  }

  return sp.toString();
}

export async function searchEmpiPatients(
  filters: OpdPatientsFilters,
  page: number,
  limit: number,
): Promise<EmpiPatientSearchResponse> {
  const qs = buildSearchQuery(filters, page, limit);
  return apiClient<EmpiPatientSearchResponse>(`${EMPI_PATIENTS_BASE}?${qs}`);
}

export async function fetchEmpiPatientDetail(
  patientId: string,
): Promise<EmpiPatientDetailResponse> {
  return apiClient<EmpiPatientDetailResponse>(`${EMPI_PATIENTS_BASE}/${encodeURIComponent(patientId)}`);
}

/** Idempotent — links desk-verified ABHA address for M2 / consent lookup. */
export async function ensurePatientAbhaAddressIdentifier(
  patientId: string,
  abhaAddress: string,
): Promise<void> {
  const value = abhaAddress.trim();
  if (!value) return;

  await apiClient(`${EMPI_PATIENTS_BASE}/${encodeURIComponent(patientId)}/identifiers`, {
    method: 'POST',
    body: JSON.stringify({
      identifier_type: 'abha_address',
      identifier_value: value,
      issuing_system: 'abdm',
    }),
  });
}

/** Resolve EMPI display fields per patient id (detail API; used when snapshot is insufficient). */
export async function fetchEmpiPatientLookupMap(
  patientIds: string[],
): Promise<Map<string, EmpiPatient>> {
  if (patientIds.length === 0) return new Map();

  const map = new Map<string, EmpiPatient>();
  const uniqueIds = [...new Set(patientIds)];

  const results = await Promise.allSettled(
    uniqueIds.map(async (id) => {
      const detail = await fetchEmpiPatientDetail(id);
      return { id, patient: detail.patient };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.id, result.value.patient);
    }
  }

  return map;
}

export function empiPatientAgeYears(patient: EmpiPatient): number {
  if (patient.age_years != null && patient.age_years >= 0) {
    return patient.age_years;
  }
  if (!patient.date_of_birth) return 0;
  const dob = new Date(patient.date_of_birth);
  if (Number.isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

export function empiStatusToOpdVisitStatus(status: EmpiPatient['status']): OpdVisitStatus {
  if (status === 'active') return 'registered';
  if (status === 'inactive') return 'cancelled';
  return 'cancelled';
}

export function empiPatientCreatedDate(patient: EmpiPatient): string {
  const raw = patient.created_at;
  if (typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function mapEmpiPatientToOpdDetails(
  detail: EmpiPatientDetailResponse,
): OpdPatientDetails {
  const { patient, addresses, identifiers } = detail;
  const primaryAddress =
    addresses.find((a) => a.address_type === 'permanent') ??
    addresses.find((a) => a.street || a.district || a.state) ??
    addresses[0];
  const abhaAddress = identifiers.find((i) => i.identifier_type === 'abha_address');

  const age = empiPatientAgeYears(patient);
  const dob = patient.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString('en-IN')
    : '-';

  const updated = new Date(patient.updated_at);
  const lastUpdated = Number.isNaN(updated.getTime())
    ? String(patient.updated_at)
    : updated.toLocaleString('en-IN');

  const genderLabel =
    patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : 'Other';

  return {
    firstName: patient.first_name || '-',
    middleName: patient.middle_name?.trim() || '-',
    lastName: patient.last_name?.trim() || '-',
    uhid: patient.uhid,
    dateOfBirth: dob,
    ageDisplay: age > 0 ? `${age} years` : '-',
    gender: genderLabel,
    abhaNumber: patient.abha_number?.trim() || 'N/A',
    abhaAddress: abhaAddress?.identifier_value?.trim() || 'N/A',
    phoneNumber: patient.phone_number || '-',
    streetAddress: primaryAddress?.street?.trim() || '-',
    district:
      resolveDistrictDisplayName(primaryAddress?.state, primaryAddress?.district) || '-',
    state: resolveStateDisplayName(primaryAddress?.state) || '-',
    pinCode: primaryAddress?.pincode?.trim() || '-',
    visitCount: 0,
    lastUpdated,
  };
}

function pickPrimaryEmpiAddress(
  addresses: EmpiPatientAddress[],
): EmpiPatientAddress | undefined {
  return (
    addresses.find((row) => row.address_type === 'permanent') ??
    addresses.find((row) => row.street || row.district || row.state || row.pincode) ??
    addresses[0]
  );
}

function mapRegistrationAddressToEmpiPayload(address: VisitRegistrationAddressBlock) {
  const street = [address.line1?.trim(), address.line2?.trim()].filter(Boolean).join(', ');
  return {
    address_type: 'permanent' as const,
    street: street || null,
    city: address.city?.trim() || null,
    district: address.district?.trim() || null,
    state: address.state?.trim() || null,
    pincode: address.pincode?.trim() || null,
  };
}

/** Persist desk-captured permanent address on the EMPI patient record. */
export async function persistEmpiPatientPermanentAddress(
  patientId: string,
  address: VisitRegistrationAddressBlock | undefined,
): Promise<void> {
  const block = registrationAddressBlockFromForm(address);
  const patientKey = patientId.trim();
  if (!block || !patientKey) return;

  const payload = mapRegistrationAddressToEmpiPayload(block);
  const detail = await fetchEmpiPatientDetail(patientKey);
  const existing = pickPrimaryEmpiAddress(detail.addresses);

  if (existing?.id) {
    await apiClient<EmpiPatientAddress>(
      `${EMPI_PATIENTS_BASE}/${encodeURIComponent(patientKey)}/addresses/${encodeURIComponent(existing.id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return;
  }

  await apiClient<EmpiPatientAddress>(
    `${EMPI_PATIENTS_BASE}/${encodeURIComponent(patientKey)}/addresses`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

/** Load formatted patient address for clinical / registration reports. */
export async function fetchFormattedPatientAddressForReport(
  patientId: string,
): Promise<string | undefined> {
  const patientKey = patientId.trim();
  if (!patientKey) return undefined;

  const detail = await fetchEmpiPatientDetail(patientKey);
  const formatted = formatEmpiAddressForDisplay(pickPrimaryEmpiAddress(detail.addresses));
  return formatted || undefined;
}
