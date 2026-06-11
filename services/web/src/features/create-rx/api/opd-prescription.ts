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
import { sanitizeCreateRxFormDataForPersist } from '../lib/form-data-session';
import type {
  OpdPrescriptionCreateBody,
  OpdPrescriptionFinalizeBody,
  OpdPrescriptionSingleResponse,
  OpdPrescriptionStatus,
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

function requireTenantId(): string {
  const tenantId = resolveOpdConsultationTenantId();
  if (!tenantId) {
    throw new Error('Tenant context is missing');
  }
  return tenantId;
}

function tenantQueryParam(tenantId: string): string {
  return `tenant_id=${encodeURIComponent(tenantId)}`;
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

/** Response from `/visits/{visitId}/prescription` — includes merged Create-RX form_data. */
export interface OpdVisitPrescriptionResponse {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: OpdPrescriptionStatus;
  is_read_only: boolean;
  form_data: CreateRxFormData;
}

export function visitPrescriptionResponseToSession(
  response: OpdVisitPrescriptionResponse,
): OpdPrescriptionSession {
  return {
    prescription_id: response.prescription_id,
    visit_id: response.visit_id,
    patient_id: response.patient_id,
    prescription_status: response.prescription_status,
    is_read_only: response.is_read_only,
    form_data: response.form_data ?? emptyDraftFormData(),
  };
}

/** Persist Create-RX form_data for a registration visit (same path nurse pre-consult uses). */
async function upsertVisitPrescriptionFormData(
  visitId: string,
  formData: CreateRxFormData,
  options?: { finalize?: boolean; endConsultation?: boolean },
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  const path = options?.endConsultation
    ? `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription/end`
    : `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription`;

  const response = await apiClient<OpdVisitPrescriptionResponse>(path, {
    method: options?.endConsultation ? 'POST' : 'PUT',
    body: JSON.stringify({
      form_data: sanitizeCreateRxFormDataForPersist(formData),
      finalize: options?.finalize ?? false,
    }),
  });
  return visitPrescriptionResponseToSession(response);
}

/** Visit summary for legacy status helpers (OPD visits list is deprecated for queues). */
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

async function fetchPrescriptionDetail(
  prescriptionId: string,
): Promise<OpdPrescriptionSession | null> {
  const tenantId = requireTenantId();
  try {
    const response = await apiClient<OpdPrescriptionSingleResponse>(
      `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId.trim())}?${tenantQueryParam(tenantId)}`,
    );
    return prescriptionDetailToSession(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Latest prescription status per registration visit id (404 → omitted). */
export async function fetchPrescriptionStatusesByVisitIds(
  visitIds: readonly string[],
): Promise<Map<string, OpdPrescriptionStatus>> {
  const unique = [...new Set(visitIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const pairs = await Promise.all(
    unique.map(async (visitId) => {
      const session = await fetchPrescriptionByVisitId(visitId);
      return session ? ([visitId, session.prescription_status] as const) : null;
    }),
  );

  const map = new Map<string, OpdPrescriptionStatus>();
  for (const pair of pairs) {
    if (pair) map.set(pair[0], pair[1]);
  }
  return map;
}

export async function fetchPrescriptionByVisitId(visitId: string): Promise<OpdPrescriptionSession | null> {
  const visitKey = visitId.trim();
  if (!visitKey) return null;
  try {
    const response = await apiClient<OpdVisitPrescriptionResponse>(
      `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription`,
    );
    return visitPrescriptionResponseToSession(response);
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
  const tenantId = requireTenantId();
  const body: OpdPrescriptionCreateBody = {
    tenant_id: tenantId,
    visit_id: visitId.trim(),
    patient_id: requirePatientId(patientId),
    doctor_id: resolveOpdDoctorId(),
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
  const tenantId = requireTenantId();
  const body: OpdPrescriptionUpdateBody = {
    updated_by: resolveOpdDoctorId(),
    clinical: createRxFormDataToClinical(formData),
  };
  const response = await apiClient<OpdPrescriptionSingleResponse>(
    `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId)}?${tenantQueryParam(tenantId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return prescriptionDetailToSession(response.data);
}

async function finalizePrescriptionRecord(prescriptionId: string): Promise<OpdPrescriptionSession> {
  const tenantId = requireTenantId();
  const body: OpdPrescriptionFinalizeBody = { changed_by: resolveOpdDoctorId() };
  const response = await apiClient<OpdPrescriptionSingleResponse>(
    `${PRESCRIPTIONS_PREFIX}/${encodeURIComponent(prescriptionId)}/finalize?${tenantQueryParam(tenantId)}`,
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
 * Load prescription by registration visit id, prescription id, or patient id (legacy route).
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
  const tenantId = resolveOpdConsultationTenantId();
  if (!tenantId) return null;

  try {
    const list = await apiClient<{ data: Array<{ id: string }>; total: number }>(
      `${PRESCRIPTIONS_PREFIX}?${tenantQueryParam(tenantId)}&patient_id=${encodeURIComponent(patientKey)}&limit=1`,
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

/** @deprecated Use {@link bootstrapOpdPrescriptionForVisit}. */
export async function ensureOpdRegistrationEncounter(
  visitId: string,
  patientId: string,
): Promise<OpdPrescriptionSession> {
  return bootstrapOpdPrescriptionForVisit(visitId, patientId);
}

export function isPatientScopedOpdRoute(visitId: string, patientId: string): boolean {
  const visitKey = visitId.trim();
  const patientKey = patientId.trim();
  return visitKey.length > 0 && visitKey === patientKey;
}

export async function saveOpdPrescriptionDraft(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  const patientKey = requirePatientId(patientId);

  if (isPatientScopedOpdRoute(visitId, patientKey)) {
    const existing =
      (existingPrescriptionId && (await fetchPrescriptionDetail(existingPrescriptionId))) ||
      (await fetchOpdPrescriptionSession(patientKey, patientKey));
    const rxId =
      existing?.prescription_id ??
      (await createPrescriptionForVisit(patientKey, patientKey, formData)).prescription_id;
    return updatePrescriptionClinical(rxId, formData);
  }

  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  return upsertVisitPrescriptionFormData(visitKey, formData);
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
    session = await endOpdPrescription(visitKey, patientKey, formData, existingPrescriptionId);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(
        `Could not save prescription (${error.status}): ${error.message || 'OPD service error'}`,
      );
    }
    throw new Error(
      error instanceof Error ? error.message : 'Could not save final prescription.',
    );
  }

  try {
    await updateRegistrationVisitStatus(visitKey, 'completed');
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Prescription saved but visit status was not updated: ${error.message}`
        : 'Prescription saved but visit status was not updated.',
    );
  }

  return session;
}

async function endOpdPrescription(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  requireTenantId();
  const patientKey = requirePatientId(patientId);

  if (isPatientScopedOpdRoute(visitId, patientKey)) {
    const existing =
      (existingPrescriptionId && (await fetchPrescriptionDetail(existingPrescriptionId))) ||
      (await fetchOpdPrescriptionSession(patientKey, patientKey));
    const rxId =
      existing?.prescription_id ??
      (await createPrescriptionForVisit(patientKey, patientKey, formData)).prescription_id;
    await updatePrescriptionClinical(rxId, formData);
    return finalizePrescriptionRecord(rxId);
  }

  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required for OPD');
  }

  return upsertVisitPrescriptionFormData(visitKey, formData, { endConsultation: true });
}

/** @deprecated Use {@link endConsultation}. */
export async function endOpdConsultation(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
  existingPrescriptionId: string | null,
): Promise<OpdPrescriptionSession> {
  return endOpdPrescription(visitId, patientId, formData, existingPrescriptionId);
}

/** OPD `GET /visits` enforces `limit` ≤ 100 (see opd.v1.yaml). */
export const OPD_VISITS_LIST_MAX = 100;

interface OpdVisitListApiResponse {
  items: Array<{
    visit_id: string;
    patient_id: string;
    status: string;
    updated_at: string;
  }>;
}

/** @deprecated Patient queues use registration visits; kept for optional overlays. */
export async function listOpdVisits(
  params: { patientId?: string; limit?: number } = {},
): Promise<OpdVisitSummary[]> {
  const sp = new URLSearchParams();
  if (params.patientId?.trim()) sp.set('patient_id', params.patientId.trim());
  if (params.limit != null) sp.set('limit', String(Math.min(params.limit, OPD_VISITS_LIST_MAX)));
  const qs = sp.toString();
  const response = await apiClient<OpdVisitListApiResponse>(
    `${OPD_PREFIX}/visits${qs ? `?${qs}` : ''}`,
  );
  return response.items.map((item) => ({
    visit_id: item.visit_id,
    patient_id: item.patient_id,
    status: item.status as OpdVisitSummary['status'],
    updated_at: item.updated_at,
  }));
}

export async function listOpdVisitsForPatient(
  patientId: string,
  limit = OPD_VISITS_LIST_MAX,
): Promise<OpdVisitSummary[]> {
  return listOpdVisits({ patientId: requirePatientId(patientId), limit });
}

export async function listOpdVisitsForPatients(
  patientIds: string[],
): Promise<OpdVisitSummary[]> {
  const unique = [...new Set(patientIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  const pages = await Promise.all(
    unique.map((patientId) => listOpdVisits({ patientId, limit: OPD_VISITS_LIST_MAX })),
  );
  return pages.flat();
}

export async function findLatestOpdVisitForPatient(
  patientId: string,
): Promise<OpdVisitSummary | undefined> {
  const items = await listOpdVisitsForPatient(patientId, 50);
  if (items.length === 0) return undefined;
  return items.reduce((latest, item) =>
    item.updated_at > latest.updated_at ? item : latest,
  );
}
