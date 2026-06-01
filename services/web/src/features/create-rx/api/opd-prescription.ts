import { ApiError, apiClient } from '@/lib/api-client';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import type { CreateRxFormData } from '../types';
import { sanitizeCreateRxFormDataForPersist } from '../lib/form-data-session';
import type { OpdPrescriptionSession } from './opd-prescription-types';

const OPD_PREFIX = '/api/v1/opd';

interface OpdPrescriptionApiResponse {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: 'draft' | 'final' | 'cancelled';
  is_read_only: boolean;
  form_data: CreateRxFormData;
}

interface OpdVisitListApiResponse {
  items: Array<{
    visit_id: string;
    patient_id: string;
    status: string;
    updated_at: string;
  }>;
}

function requirePatientId(patientId: string): string {
  const id = patientId.trim();
  if (!id) {
    throw new Error('Patient id is required for OPD');
  }
  return id;
}

function apiResponseToSession(response: OpdPrescriptionApiResponse): OpdPrescriptionSession {
  return {
    prescription_id: response.prescription_id,
    visit_id: response.visit_id,
    patient_id: response.patient_id,
    prescription_status: response.prescription_status,
    is_read_only: response.is_read_only,
    form_data: response.form_data ?? ({} as CreateRxFormData),
  };
}

export type { OpdPrescriptionSession } from './opd-prescription-types';

/** Visit summary for patients table status overlay (from OPD visits API). */
export interface OpdVisitSummary {
  visit_id: string;
  patient_id: string;
  status: 'registered' | 'in_progress' | 'completed' | 'cancelled';
  updated_at: string;
}

export function prescriptionStatusToVisitStatus(
  prescriptionStatus: 'draft' | 'final' | 'cancelled',
): OpdVisitSummary['status'] {
  if (prescriptionStatus === 'final') return 'completed';
  if (prescriptionStatus === 'cancelled') return 'cancelled';
  return 'in_progress';
}

function normalizeVisitStatus(status: string): OpdVisitSummary['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'in_progress') return 'in_progress';
  return 'registered';
}

async function fetchOpdPrescriptionSessionByKey(
  path: string,
): Promise<OpdPrescriptionSession | null> {
  try {
    const response = await apiClient<OpdPrescriptionApiResponse>(path);
    return apiResponseToSession(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Load prescription by visit id, prescription id, or (legacy) patient id.
 * Create-rx routes use OPD visit UUID from the patients queue.
 */
export async function fetchOpdPrescriptionSession(
  visitOrPrescriptionId: string,
  patientId = '',
): Promise<OpdPrescriptionSession | null> {
  const key = visitOrPrescriptionId.trim();
  if (!key) {
    return null;
  }

  const encoded = encodeURIComponent(key);

  const byVisit = await fetchOpdPrescriptionSessionByKey(
    `${OPD_PREFIX}/visits/${encoded}/prescription`,
  );
  if (byVisit) return byVisit;

  const byPrescription = await fetchOpdPrescriptionSessionByKey(
    `${OPD_PREFIX}/prescriptions/${encoded}`,
  );
  if (byPrescription) return byPrescription;

  const patientKey = patientId.trim() || key;
  return fetchOpdPrescriptionSessionByKey(
    `${OPD_PREFIX}/patients/${encodeURIComponent(patientKey)}/prescription`,
  );
}

function persistFormDataBody(formData: CreateRxFormData): string {
  return JSON.stringify({ form_data: sanitizeCreateRxFormDataForPersist(formData) });
}

export async function saveOpdPrescriptionDraft(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  _existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription`,
    {
      method: 'PUT',
      body: persistFormDataBody(formData),
    },
  );
  return apiResponseToSession(response);
}

export async function endOpdConsultation(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  _existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  if (!resolveOpdConsultationTenantId()) {
    throw new Error('Tenant context is missing');
  }

  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  void requirePatientId(patientId);

  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription/end`,
    {
      method: 'POST',
      body: persistFormDataBody(formData),
    },
  );
  return apiResponseToSession(response);
}

/** List OPD visits (optional patient filter). Used for status overlay on /patients. */
export async function listOpdVisits(
  options: { patientId?: string; limit?: number } = {},
): Promise<OpdVisitSummary[]> {
  const search = new URLSearchParams({ limit: String(options.limit ?? 100) });
  if (options.patientId?.trim()) {
    search.set('patient_id', options.patientId.trim());
  }

  const response = await apiClient<OpdVisitListApiResponse>(
    `${OPD_PREFIX}/visits?${search.toString()}`,
  );

  return response.items.map((row) => ({
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    status: normalizeVisitStatus(row.status),
    updated_at: row.updated_at,
  }));
}

export async function listOpdVisitsForPatient(
  patientId: string,
  limit = 50,
): Promise<OpdVisitSummary[]> {
  return listOpdVisits({ patientId: requirePatientId(patientId), limit });
}

/** Latest visit summary for a patient, or undefined if none. */
export async function fetchLatestOpdVisitForPatient(
  patientId: string,
): Promise<OpdVisitSummary | undefined> {
  const items = await listOpdVisitsForPatient(patientId, 50);
  if (items.length === 0) return undefined;
  return items.reduce((latest, row) =>
    row.updated_at > latest.updated_at ? row : latest,
  );
}
