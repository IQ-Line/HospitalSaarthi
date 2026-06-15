import { useQuery } from '@tanstack/react-query';
import type { UseFormSetValue } from 'react-hook-form';
import { abdmFetch } from '@/features/abha/api/abdm-client';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import { ageYmdSinceBirth } from '@/features/frontdesk/utils/visit-registration-helpers';
import { apiClientWithIqTenant } from '@/lib/api-client';

export interface ScanShareTokenMetadata {
  fullName?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  abhaAddress?: string;
  aabha_address?: string;
  abhaNumber?: string;
  aabha_uhid?: string;
  gender?: string;
  age?: number;
  yearOfBirth?: number | string;
  birth_date?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
}

export interface ScanShareTokenDoc {
  _id: string;
  token: number;
  aabha_address: string;
  patient_metadata: ScanShareTokenMetadata;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface QueuePatient {
  token: number;
  patientName: string;
  phoneNumber: string;
  abhaAddress: string;
  abhaNumber: string;
  age: number;
  gender: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  birth_date: string;
}

export interface AbdmIntegrationProfile {
  hip_id: string;
  hip_display_name: string | null;
  gateway_environment: 'sandbox' | 'production';
}

const IS_ABHA_LIVE = import.meta.env.VITE_ABHA_LIVE === 'true';
const PHR_SHARE_PROFILE_URL = IS_ABHA_LIVE
  ? 'https://phr.abdm.gov.in'
  : 'https://phrsbx.abdm.gov.in';
const SCAN_SHARE_COUNTER_ID = '1';

interface ScanShareListResponse {
  code: number;
  data: ScanShareTokenDoc[];
  message: string;
  runningToken?: number;
}

interface ScanShareTokenResponse {
  code: number;
  data: ScanShareTokenDoc;
  message: string;
}

function isProductionAbdmEnvironment(
  gatewayEnvironment: 'sandbox' | 'production' | string | undefined,
): boolean {
  if (gatewayEnvironment === 'production') return true;
  if (gatewayEnvironment === 'sandbox') return false;
  return IS_ABHA_LIVE;
}

export function buildScanShareQrValue(input: {
  hipId: string;
  facilityName: string;
  gatewayEnvironment: 'sandbox' | 'production' | string | undefined;
}): string {
  const hipId = input.hipId.trim();
  const isLive = isProductionAbdmEnvironment(input.gatewayEnvironment);
  if (isLive) {
    return JSON.stringify({
      hipId,
      code: SCAN_SHARE_COUNTER_ID,
      facilityName: input.facilityName.trim(),
    });
  }
  return `${PHR_SHARE_PROFILE_URL}/share-profile?hip-id=${hipId}&counter-id=${SCAN_SHARE_COUNTER_ID}`;
}

async function fetchActiveAbdmIntegrationProfile(
  tenantId: string,
): Promise<AbdmIntegrationProfile | null> {
  const qs = new URLSearchParams({ integration_kind: 'abdm', is_active: 'true' });
  const res = await apiClientWithIqTenant<{ data: AbdmIntegrationProfile[] }>(
    tenantId,
    `/api/configurator/v1/tenants/${encodeURIComponent(tenantId)}/integration-profiles?${qs}`,
  );
  return res.data[0] ?? null;
}

export function useAbdmIntegrationProfile(tenantId: string | null) {
  return useQuery({
    queryKey: ['abdm-integration-profile', tenantId] as const,
    queryFn: () => fetchActiveAbdmIntegrationProfile(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
}

export async function fetchActiveScanShareTokens(filters?: {
  aabha_address?: string;
  token?: number;
}): Promise<{ data: ScanShareTokenDoc[]; runningToken: number }> {
  const res = await abdmFetch<ScanShareListResponse>('/token/patient-with-token-id-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aabha_address: filters?.aabha_address,
      token: filters?.token,
    }),
  });
  return {
    data: Array.isArray(res.data) ? res.data : [],
    runningToken: res.runningToken ?? 0,
  };
}

export async function fetchScanSharePatientByToken(tokenId: number): Promise<ScanShareTokenDoc> {
  const res = await abdmFetch<ScanShareTokenResponse>('/m1/patient/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_id: tokenId }),
  });
  return res.data;
}

function parsePatientFullName(fullName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, middleName: '', lastName: '' };
  if (parts.length === 2) {
    return { firstName: parts[0]!, middleName: '', lastName: parts[1]! };
  }
  return {
    firstName: parts[0]!,
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]!,
  };
}

function normalizeQueueGender(gender: string): CreateVisitRequestBody['patient']['gender'] {
  const g = gender.trim().toLowerCase();
  if (g === 'm' || g === 'male') return 'male';
  if (g === 'f' || g === 'female') return 'female';
  if (g === 'other') return 'other';
  return '';
}

export function mapScanShareTokenDocToQueuePatient(doc: ScanShareTokenDoc): QueuePatient {
  const meta: ScanShareTokenMetadata = doc.patient_metadata ?? {};
  const birthDate = meta.birth_date?.trim() ?? '';
  const ageFromDob = birthDate ? ageYmdSinceBirth(birthDate) : null;
  const computedAge =
    ageFromDob?.years ?? (typeof meta.age === 'number' ? meta.age : undefined) ?? 0;

  return {
    token: doc.token,
    patientName: meta.fullName || meta.name || '',
    phoneNumber: meta.phone || meta.phoneNumber || '',
    abhaAddress: meta.abhaAddress || doc.aabha_address || meta.aabha_address || '',
    abhaNumber: meta.abhaNumber || meta.aabha_uhid || '',
    age: computedAge,
    gender: (meta.gender as string) || '',
    address: meta.address || '',
    city: meta.city || '',
    district: meta.district || '',
    state: meta.state || '',
    pin: meta.pin || '',
    birth_date: birthDate,
  };
}

export function applyQueuePatientToVisitForm(
  patient: QueuePatient,
  setValue: UseFormSetValue<CreateVisitRequestBody>,
): void {
  const { firstName, middleName, lastName } = parsePatientFullName(patient.patientName);
  const gender = normalizeQueueGender(patient.gender);
  const ageFromDob = patient.birth_date ? ageYmdSinceBirth(patient.birth_date) : null;

  if (patient.phoneNumber) {
    setValue('patient.phone', patient.phoneNumber, { shouldValidate: true });
  }
  if (firstName) setValue('patient.first_name', firstName, { shouldValidate: true });
  if (middleName) setValue('patient.middle_name', middleName, { shouldValidate: true });
  if (lastName) setValue('patient.last_name', lastName, { shouldValidate: true });
  if (gender) setValue('patient.gender', gender, { shouldValidate: true });
  if (patient.birth_date) {
    setValue('patient.date_of_birth', patient.birth_date, { shouldValidate: true });
  } else if (patient.age > 0) {
    setValue('patient.age_years', patient.age, { shouldValidate: true });
    setValue('patient.age_months', ageFromDob?.months ?? 0, { shouldValidate: false });
    setValue('patient.age_days', ageFromDob?.days ?? 0, { shouldValidate: false });
  }
  if (patient.abhaNumber) {
    setValue('patient.abha_number', patient.abhaNumber, { shouldValidate: true });
  }
  if (patient.abhaAddress) {
    setValue('patient.abha_address', patient.abhaAddress, { shouldValidate: true });
  }
  if (patient.address) {
    setValue('permanent_address.line1', patient.address, { shouldValidate: true });
    setValue('residential_address.line1', patient.address, { shouldValidate: true });
  }
  if (patient.city) {
    setValue('permanent_address.city', patient.city, { shouldValidate: true });
    setValue('residential_address.city', patient.city, { shouldValidate: true });
  }
  if (patient.state) {
    setValue('permanent_address.state', patient.state, { shouldValidate: true });
    setValue('residential_address.state', patient.state, { shouldValidate: true });
  }
  if (patient.district) {
    setValue('permanent_address.district', patient.district, { shouldValidate: true });
    setValue('residential_address.district', patient.district, { shouldValidate: true });
  }
  if (patient.pin) {
    setValue('permanent_address.pincode', patient.pin, { shouldValidate: true });
    setValue('residential_address.pincode', patient.pin, { shouldValidate: true });
  }
}
