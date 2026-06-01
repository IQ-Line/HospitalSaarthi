import { ApiError, apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import type { CreateRxFormData } from '../types';
import {
  createRxFormDataToClinical,
  prescriptionDetailToSession,
} from '../lib/opd-prescription-mapper';
import type {
  OpdPrescriptionCreateBody,
  OpdPrescriptionListResponse,
  OpdPrescriptionSession,
  OpdPrescriptionSingleResponse,
  OpdPrescriptionUpdateBody,
} from './opd-prescription-types';

const OPD_PREFIX = '/api/v1/opd';

function requireTenantId(): string {
  const tenantId = resolveOpdConsultationTenantId();
  if (!tenantId) {
    throw new Error('Tenant context is missing');
  }
  return tenantId;
}

function requireDoctorId(): string {
  const doctorId = useAuthStore.getState().userId?.trim();
  if (!doctorId) {
    throw new Error('Signed-in user id is required for OPD prescriptions');
  }
  return doctorId;
}

function withTenantQuery(path: string, tenantId: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}tenant_id=${encodeURIComponent(tenantId)}`;
}

export type { OpdPrescriptionSession } from './opd-prescription-types';

/** Visit summary derived from prescription list (patients table overlay). */
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

export async function fetchOpdPrescriptionByVisit(
  visitId: string,
): Promise<OpdPrescriptionSingleResponse> {
  const tenantId = requireTenantId();
  return apiClient<OpdPrescriptionSingleResponse>(
    withTenantQuery(`${OPD_PREFIX}/prescriptions/by-visit/${visitId}`, tenantId),
  );
}

function uniqueVisitKeys(visitId: string, patientId: string): string[] {
  return [...new Set([visitId.trim(), patientId.trim()].filter(Boolean))];
}

/** Stable visit_id for OPD create/update when route is patient-centric. */
export function primaryOpdVisitId(visitId: string, patientId: string): string {
  return patientId.trim() || visitId.trim();
}

async function fetchOpdPrescriptionSessionByVisitKey(
  visitKey: string,
): Promise<OpdPrescriptionSession | null> {
  try {
    const response = await fetchOpdPrescriptionByVisit(visitKey);
    return prescriptionDetailToSession(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchOpdPrescriptionSession(
  visitId: string,
  patientId: string,
): Promise<OpdPrescriptionSession | null> {
  for (const key of uniqueVisitKeys(visitId, patientId)) {
    const session = await fetchOpdPrescriptionSessionByVisitKey(key);
    if (session) return session;
  }
  return null;
}

async function createOpdPrescription(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const tenantId = requireTenantId();
  const body: OpdPrescriptionCreateBody = {
    tenant_id: tenantId,
    visit_id: visitId,
    patient_id: patientId,
    doctor_id: requireDoctorId(),
    clinical: createRxFormDataToClinical(formData),
  };
  const response = await apiClient<OpdPrescriptionSingleResponse>(`${OPD_PREFIX}/prescriptions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return prescriptionDetailToSession(response.data);
}

async function updateOpdPrescription(
  prescriptionId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const tenantId = requireTenantId();
  const body: OpdPrescriptionUpdateBody = {
    doctor_id: requireDoctorId(),
    clinical: createRxFormDataToClinical(formData),
  };
  const response = await apiClient<OpdPrescriptionSingleResponse>(
    withTenantQuery(`${OPD_PREFIX}/prescriptions/${prescriptionId}`, tenantId),
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
  return prescriptionDetailToSession(response.data);
}

async function findExistingPrescriptionSession(
  visitId: string,
  patientId: string,
): Promise<OpdPrescriptionSession | null> {
  return fetchOpdPrescriptionSession(visitId, patientId);
}

async function ensureDraftPrescription(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const opdVisitId = primaryOpdVisitId(visitId, patientId);

  if (existingPrescriptionId) {
    return updateOpdPrescription(existingPrescriptionId, formData);
  }

  const existing = await findExistingPrescriptionSession(visitId, patientId);
  if (existing) {
    if (existing.prescription_status === 'final') {
      return createOpdPrescription(opdVisitId, patientId, formData);
    }
    return updateOpdPrescription(existing.prescription_id, formData);
  }

  return createOpdPrescription(opdVisitId, patientId, formData);
}

export async function saveOpdPrescriptionDraft(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  return ensureDraftPrescription(visitId, patientId, formData, existingPrescriptionId);
}

export async function endOpdConsultation(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const tenantId = requireTenantId();
  const draft = await ensureDraftPrescription(
    visitId,
    patientId,
    formData,
    existingPrescriptionId,
  );

  const response = await apiClient<OpdPrescriptionSingleResponse>(
    withTenantQuery(`${OPD_PREFIX}/prescriptions/${draft.prescription_id}/finalize`, tenantId),
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return prescriptionDetailToSession(response.data);
}

/** List prescriptions for one patient (OPD API requires patient_id). */
export async function listOpdPrescriptionsForPatient(
  patientId: string,
  limit = 50,
): Promise<OpdVisitSummary[]> {
  const tenantId = requireTenantId();
  const search = new URLSearchParams({
    tenant_id: tenantId,
    patient_id: patientId,
    limit: String(limit),
  });

  const response = await apiClient<OpdPrescriptionListResponse>(
    `${OPD_PREFIX}/prescriptions?${search.toString()}`,
  );

  return response.data.map((row) => ({
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    status: prescriptionStatusToVisitStatus(row.status),
    updated_at: row.updated_at,
  }));
}

/** Latest prescription summary for a patient, or undefined if none. */
export async function fetchLatestOpdVisitForPatient(
  patientId: string,
): Promise<OpdVisitSummary | undefined> {
  const items = await listOpdPrescriptionsForPatient(patientId, 50);
  if (items.length === 0) return undefined;
  return items.reduce((latest, row) =>
    row.updated_at > latest.updated_at ? row : latest,
  );
}
