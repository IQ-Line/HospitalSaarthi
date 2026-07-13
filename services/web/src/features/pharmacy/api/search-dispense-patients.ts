import { apiClient } from '@/lib/api-client';
import {
  fetchEmpiPatientDetail,
  type EmpiPatient,
  type EmpiPatientSearchResponse,
} from '@/features/opd-patients/api/empi-patients';
import {
  normalizeAbhaForSearch,
  normalizeIndianPhoneForSearch,
} from '@/features/historical-records/lib/formatters';
import type { DispensePatientSearchResult } from '../types/dispense-ui.types';
import { fetchPharmacyQueue } from './pharmacy-queue';
import type { PharmacyQueueItem } from '../types';

const EMPI_PATIENTS_BASE = '/api/empi/v1/patients';

function mapEmpiToDispenseSearchResult(patient: EmpiPatient): DispensePatientSearchResult {
  return {
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name?.trim() || '',
    uhid: patient.uhid,
    mrn: patient.uhid,
    phone: patient.phone_number ?? '',
    gender: patient.gender,
    date_of_birth: patient.date_of_birth ?? '',
    email: '',
  };
}

/** Build EMPI search query from free-text (UHID, phone, ABHA, or name). */
export function buildDispensePatientSearchParams(query: string): URLSearchParams | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  const sp = new URLSearchParams({
    page: '1',
    limit: '20',
    status: 'active',
  });

  if (digits.length >= 15 && !trimmed.includes('@') && !trimmed.includes(' ')) {
    sp.set('uhid', trimmed);
    return sp;
  }

  if (digits.length === 14) {
    sp.set('abha_number', normalizeAbhaForSearch(trimmed));
    return sp;
  }

  const phone = normalizeIndianPhoneForSearch(trimmed);
  if (phone && !/[a-zA-Z]/.test(trimmed.replace(/\s/g, ''))) {
    sp.set('phone', phone);
    return sp;
  }

  if (trimmed.length >= 2) {
    sp.set('name', trimmed);
    return sp;
  }

  return null;
}

/** Search registered patients via EMPI for dispense / walk-in. */
export async function searchDispensePatients(
  query: string,
): Promise<DispensePatientSearchResult[]> {
  const params = buildDispensePatientSearchParams(query);
  if (!params) return [];

  const response = await apiClient<EmpiPatientSearchResponse>(
    `${EMPI_PATIENTS_BASE}?${params.toString()}`,
  );
  return response.data.map(mapEmpiToDispenseSearchResult);
}

export async function fetchDispensePatientById(
  patientId: string,
): Promise<DispensePatientSearchResult | null> {
  const id = patientId.trim();
  if (!id) return null;
  try {
    const detail = await fetchEmpiPatientDetail(id);
    return mapEmpiToDispenseSearchResult(detail.patient);
  } catch {
    return null;
  }
}

/**
 * Find an open OPD pharmacy-queue visit for this patient (has prescription to dispense).
 * Prefer pending / partial; fall back to any queue row for the patient.
 */
export async function findOpenQueueVisitForPatient(patient: {
  id: string;
  uhid: string;
}): Promise<PharmacyQueueItem | null> {
  const searchValues = [patient.uhid, patient.id].map((v) => v.trim()).filter(Boolean);

  for (const q of searchValues) {
    const result = await fetchPharmacyQueue({
      kind: 'opd',
      page: 1,
      limit: 20,
      q,
      status: 'all',
    });

    const match =
      result.items.find(
        (row) =>
          row.patient_id === patient.id &&
          (row.dispense_status === 'pending' || row.dispense_status === 'partial_issue'),
      ) ?? result.items.find((row) => row.patient_id === patient.id);

    if (match) return match;
  }

  return null;
}
