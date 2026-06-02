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

/** Idempotent: OPD visit + draft rx for a registration visit id (desk may skip this). */
export async function ensureOpdRegistrationEncounter(
  visitId: string,
  patientId: string,
  doctorId?: string,
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  const patientKey = requirePatientId(patientId);
  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/encounter`,
    {
      method: 'PUT',
      body: JSON.stringify({
        patient_id: patientKey,
        ...(doctorId?.trim() ? { doctor_id: doctorId.trim() } : {}),
      }),
    },
  );
  return apiResponseToSession(response);
}

/**
 * Create-rx opened from registration queue before an OPD visit exists — route param is
 * the EMPI patient id, not `opd.visits.id`.
 */
export function isPatientScopedOpdRoute(visitId: string, patientId: string): boolean {
  const visitKey = visitId.trim();
  const patientKey = patientId.trim();
  return visitKey.length > 0 && visitKey === patientKey;
}

export async function saveOpdPrescriptionDraft(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  _existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const patientKey = requirePatientId(patientId);
  const body = persistFormDataBody(formData);

  if (isPatientScopedOpdRoute(visitId, patientKey)) {
    const response = await apiClient<OpdPrescriptionApiResponse>(
      `${OPD_PREFIX}/patients/${encodeURIComponent(patientKey)}/prescription`,
      { method: 'PUT', body },
    );
    return apiResponseToSession(response);
  }

  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription`,
    { method: 'PUT', body },
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

  const patientKey = requirePatientId(patientId);
  const body = persistFormDataBody(formData);

  if (isPatientScopedOpdRoute(visitId, patientKey)) {
    const response = await apiClient<OpdPrescriptionApiResponse>(
      `${OPD_PREFIX}/patients/${encodeURIComponent(patientKey)}/prescription/end`,
      { method: 'POST', body },
    );
    return apiResponseToSession(response);
  }

  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription/end`,
    { method: 'POST', body },
  );
  return apiResponseToSession(response);
}

/** OPD `GET /visits` enforces `limit` ≤ 100 (see opd.v1.yaml). */
export const OPD_VISITS_LIST_MAX = 100;

/** List OPD visits (optional patient filter). Used for status overlay on /patients. */
export async function listOpdVisits(
  options: { patientId?: string; limit?: number } = {},
): Promise<OpdVisitSummary[]> {
  const limit = Math.min(Math.max(options.limit ?? OPD_VISITS_LIST_MAX, 1), OPD_VISITS_LIST_MAX);
  const search = new URLSearchParams({ limit: String(limit) });
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

/** Latest visit per patient for a registration page (one bounded call per patient). */
export async function listOpdVisitsForPatients(
  patientIds: readonly string[],
): Promise<OpdVisitSummary[]> {
  const unique = [...new Set(patientIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const batches = await Promise.all(
    unique.map((patientId) => listOpdVisits({ patientId, limit: OPD_VISITS_LIST_MAX })),
  );
  return batches.flat();
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

