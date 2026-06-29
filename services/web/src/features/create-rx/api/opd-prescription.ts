import { ApiError, apiClient } from '@/lib/api-client';
import { updateRegistrationVisitStatus } from '@/features/frontdesk/api/registrations';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import { useAuthStore } from '@/stores/auth.store';
import type { CreateRxFormData } from '../types';
import {
  createRxFormDataToClinical,
  emptyDraftFormData,
  prescriptionDetailToSession,
} from '../lib/opd-prescription-mapper';
import type {
  OpdPrescriptionCreateBody,
  OpdPrescriptionFinalizeBody,
  OpdPrescriptionSingleResponse,
  OpdPrescriptionUpdateBody,
} from './opd-prescription-types';
import type { OpdPrescriptionSession } from './opd-prescription-types';

const OPD_PREFIX = '/api/v1/opd';
const PRESCRIPTIONS_PREFIX = `${OPD_PREFIX}/prescriptions`;

function requirePatientId(patientId: string): string {
  const id = patientId.trim();
  if (!id) {
    throw new Error('Patient id is required for OPD');
  }
  return id;
}

function jwtSubject(accessToken: string | null): string | undefined {
  if (!accessToken) return undefined;
  const parts = accessToken.split('.');
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: unknown;
    };
    return typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub.trim() : undefined;
  } catch {
    return undefined;
  }
}

function resolveOpdDoctorId(): string {
  const userId = useAuthStore.getState().userId?.trim();
  if (userId) return userId;
  const sub = jwtSubject(useAuthStore.getState().accessToken);
  if (sub) return sub;
  throw new Error('Doctor context is missing');
}

export type { OpdPrescriptionSession } from './opd-prescription-types';

export function prescriptionStatusToVisitStatus(
  prescriptionStatus: 'draft' | 'final' | 'cancelled',
): 'registered' | 'in_progress' | 'completed' | 'cancelled' {
  if (prescriptionStatus === 'final') return 'completed';
  if (prescriptionStatus === 'cancelled') return 'cancelled';
  return 'in_progress';
}

async function fetchPrescriptionDetail(
  prescriptionId: string,
): Promise<OpdPrescriptionSession | null> {
  try {
    const response = await apiClient<OpdPrescriptionSingleResponse>(
      `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId.trim())}`,
    );
    return prescriptionDetailToSession(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchPrescriptionByVisitId(visitId: string): Promise<OpdPrescriptionSession | null> {
  const visitKey = visitId.trim();
  if (!visitKey) return null;
  try {
    const response = await apiClient<OpdPrescriptionSingleResponse>(
      `${PRESCRIPTIONS_PREFIX}/by-visit/${encodeURIComponent(visitKey)}`,
    );
    return prescriptionDetailToSession(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createPrescriptionForVisit(
  visitId: string,
  patientId: string,
  formData?: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const body: OpdPrescriptionCreateBody = {
    visit_id: visitId.trim(),
    patient_id: requirePatientId(patientId),
    clinical: createRxFormDataToClinical(formData ?? emptyDraftFormData()),
  };
  const response = await apiClient<OpdPrescriptionSingleResponse>(PRESCRIPTIONS_PREFIX, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return prescriptionDetailToSession(response.data);
}

async function updatePrescriptionClinical(
  prescriptionId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const body: OpdPrescriptionUpdateBody = {
    updated_by: resolveOpdDoctorId(),
    clinical: createRxFormDataToClinical(formData),
  };
  const response = await apiClient<OpdPrescriptionSingleResponse>(
    `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return prescriptionDetailToSession(response.data);
}

async function finalizePrescriptionRecord(prescriptionId: string): Promise<OpdPrescriptionSession> {
  const body: OpdPrescriptionFinalizeBody = { changed_by: resolveOpdDoctorId() };
  const response = await apiClient<OpdPrescriptionSingleResponse>(
    `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId)}/finalize`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return prescriptionDetailToSession(response.data);
}

async function ensureDraftPrescription(
  visitId: string,
  patientId: string,
): Promise<OpdPrescriptionSession> {
  const existing = await fetchPrescriptionByVisitId(visitId);
  if (existing) {
    if (existing.prescription_status === 'final' || existing.prescription_status === 'cancelled') {
      throw new Error('Prescription is read-only');
    }
    return existing;
  }
  return createPrescriptionForVisit(visitId, patientId);
}

/**
 * Load a prescription by registration visit id, then prescription id, then latest-for-patient.
 * All three lookups hit the normalized `/prescriptions` family.
 */
export async function fetchOpdPrescriptionSession(
  visitOrPrescriptionId: string,
  patientId = '',
): Promise<OpdPrescriptionSession | null> {
  const key = visitOrPrescriptionId.trim();
  if (!key) return null;

  const byVisit = await fetchPrescriptionByVisitId(key);
  if (byVisit) return byVisit;

  const byPrescription = await fetchPrescriptionDetail(key);
  if (byPrescription) return byPrescription;

  const patientKey = patientId.trim() || key;
  if (!resolveOpdConsultationTenantId()) return null;

  try {
    const list = await apiClient<{ data: Array<{ id: string }>; total: number }>(
      `${PRESCRIPTIONS_PREFIX}?patient_id=${encodeURIComponent(patientKey)}&limit=1`,
    );
    const latestId = list.data[0]?.id;
    if (!latestId) return null;
    return fetchPrescriptionDetail(latestId);
  } catch {
    return null;
  }
}

/** Idempotent draft for a registration encounter (POST /prescriptions). */
export async function bootstrapOpdPrescriptionForVisit(
  visitId: string,
  patientId: string,
): Promise<OpdPrescriptionSession> {
  const existing = await fetchPrescriptionByVisitId(visitId);
  if (existing) return existing;
  return createPrescriptionForVisit(visitId, patientId);
}

export async function saveOpdPrescriptionDraft(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const patientKey = requirePatientId(patientId);
  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  const rxId =
    existingPrescriptionId?.trim() ||
    (await ensureDraftPrescription(visitKey, patientKey)).prescription_id;
  return updatePrescriptionClinical(rxId, formData);
}

/**
 * End consultation: finalize OPD prescription (REST /prescriptions), then registration visit status.
 */
export async function endConsultation(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  const patientKey = requirePatientId(patientId);

  let session: OpdPrescriptionSession;
  try {
    if (!visitKey) {
      throw new Error('Visit id is required for OPD');
    }
    const rxId =
      existingPrescriptionId?.trim() ||
      (await ensureDraftPrescription(visitKey, patientKey)).prescription_id;
    await updatePrescriptionClinical(rxId, formData);
    session = await finalizePrescriptionRecord(rxId);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(
        `Could not save prescription (${error.status}): ${error.message || 'OPD service error'}`,
        { cause: error },
      );
    }
    throw new Error(
      error instanceof Error ? error.message : 'Could not save final prescription.',
      { cause: error },
    );
  }

  try {
    await updateRegistrationVisitStatus(visitKey, 'completed');
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Prescription saved but visit status was not updated: ${error.message}`
        : 'Prescription saved but visit status was not updated.',
      { cause: error },
    );
  }

  return session;
}
