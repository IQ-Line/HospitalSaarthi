import { ApiError, apiClient } from '@/lib/api-client';
import { executeVisitRegistrationBilling } from '@/features/frontdesk/api/visit-registration-billing';
import {
  mapVisitRegistrationToAppointmentBody,
  mapVisitRegistrationToExistingPatientIntakeBody,
  mapVisitRegistrationToNewPatientIntakeBody,
  resolveRegistrationPatientId,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { formatPatientAddressForReport } from '@/features/frontdesk/utils/report-address';
import { persistEmpiPatientPermanentAddress } from '@/features/opd-patients/api/empi-patients';
import type { RegistrationReportQueryContext } from '@/features/frontdesk/api/registration-documents';
import type {
  CreateNewPatientRegistrationResponse,
  CreateVisitRequestBody,
  RegistrationListPageResponse,
  RegistrationVisitListPageResponse,
  RegistrationVisitResponse,
} from '@/features/frontdesk/types';

/**
 * Registration API base path. In dev, use same-origin `/api/registration/v1` (Vite → :3006).
 * Set `VITE_REGISTRATION_SERVICE_ORIGIN` to call registration-svc directly (no trailing slash).
 */
const REGISTRATION_V1_PATH = '/api/registration/v1';

/** Simulated network latency for stub phases (ms). */
const STUB_PHASE_DELAY_MS = 200;

function registrationServiceOrigin(): string {
  const fromEnv = import.meta.env.VITE_REGISTRATION_SERVICE_ORIGIN?.trim().replace(/\/$/, '');
  return fromEnv ?? '';
}

/** Full base including path, e.g. `http://localhost:3006/api/registration/v1` */
function registrationApiBase(): string {
  const origin = registrationServiceOrigin();
  return origin ? `${origin}${REGISTRATION_V1_PATH}` : REGISTRATION_V1_PATH;
}

export interface ListRegistrationsParams {
  page?: number;
  limit?: number;
  /** Substring match on snapshot UHID, phone, or patient name. */
  q?: string;
  patient_id?: string;
  mobile?: string;
  uhid?: string;
  name?: string;
  abha_number?: string;
  abha_address?: string;
}

export interface ListRegistrationVisitsParams {
  page?: number;
  limit?: number;
  status?: string;
  patient_id?: string;
  facility_id?: string;
  department_id?: string;
  doctor_id?: string;
  /** Inclusive calendar-date filter on visit `updated_at` (YYYY-MM-DD). */
  updated_from?: string;
  /** Inclusive calendar-date filter on visit `updated_at` (YYYY-MM-DD). */
  updated_to?: string;
}

export async function listRegistrations(
  params: ListRegistrationsParams,
): Promise<RegistrationListPageResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.patient_id?.trim()) sp.set('patient_id', params.patient_id.trim());
  if (params.mobile?.trim()) sp.set('mobile', params.mobile.trim());
  if (params.uhid?.trim()) sp.set('uhid', params.uhid.trim());
  if (params.name?.trim()) sp.set('name', params.name.trim());
  if (params.abha_number?.trim()) sp.set('abha_number', params.abha_number.trim());
  if (params.abha_address?.trim()) sp.set('abha_address', params.abha_address.trim());
  const qs = sp.toString();
  return apiClient<RegistrationListPageResponse>(
    `${registrationApiBase()}/registrations${qs ? `?${qs}` : ''}`,
  );
}

/** Paginated encounters from registration.visit (doctor/nurse patient queues). */
export async function listRegistrationVisits(
  params: ListRegistrationVisitsParams,
): Promise<RegistrationVisitListPageResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.status?.trim()) sp.set('status', params.status.trim());
  if (params.patient_id?.trim()) sp.set('patient_id', params.patient_id.trim());
  if (params.facility_id?.trim()) sp.set('facility_id', params.facility_id.trim());
  if (params.department_id?.trim()) sp.set('department_id', params.department_id.trim());
  if (params.doctor_id?.trim()) sp.set('doctor_id', params.doctor_id.trim());
  if (params.updated_from?.trim()) sp.set('updated_from', params.updated_from.trim());
  if (params.updated_to?.trim()) sp.set('updated_to', params.updated_to.trim());
  const qs = sp.toString();
  return apiClient<RegistrationVisitListPageResponse>(
    `${registrationApiBase()}/visits${qs ? `?${qs}` : ''}`,
  );
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function createNewPatientRegistration(
  body: Record<string, unknown>,
  options?: { idempotencyKey?: string },
): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/workflows/new-patient/registrations`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': options?.idempotencyKey ?? newIdempotencyKey(),
      },
      body: JSON.stringify(body),
    },
  );
}

export async function createExistingPatientRegistration(
  body: Record<string, unknown>,
  options?: { idempotencyKey?: string },
): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/workflows/existing-patient/registrations`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': options?.idempotencyKey ?? newIdempotencyKey(),
      },
      body: JSON.stringify(body),
    },
  );
}

import type { VisitTypeDecisionPatientPayload } from '@/features/frontdesk/utils/visit-registration-helpers';

export type VisitTypeDecisionResult = {
  consultation_type: 'new' | 'followup' | 'free-followup';
  visit_type_code: string;
  fee: 0 | 1;
  is_locked: boolean;
  resolved_patient_id: string | null;
  valid_till: string | null;
  free_follow_up_visit_count: number;
  free_follow_up_visits_allowed: number;
  free_follow_up_visits_remaining: number;
};

export async function fetchVisitTypeDecision(input: {
  department_id: string;
  patient?: VisitTypeDecisionPatientPayload;
}): Promise<VisitTypeDecisionResult> {
  const res = await apiClient<{ success: true; data: VisitTypeDecisionResult }>(
    `${registrationApiBase()}/visit-type-decision`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return res.data;
}

const PATIENT_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function patientIdFromAlreadyExistsError(err: ApiError): string | undefined {
  if (err.status !== 409) return undefined;
  try {
    const parsed = JSON.parse(err.body) as { patient_id?: unknown; code?: unknown };
    if (parsed.code !== 'patient_already_exists') return undefined;
    const id = typeof parsed.patient_id === 'string' ? parsed.patient_id.trim() : '';
    return PATIENT_ID_UUID.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

async function registerVisitIntake(
  form: CreateVisitRequestBody,
  options: {
    idempotencyKey: string;
    existingPatientId?: string;
    resolvedPatientId?: string | null;
  },
): Promise<CreateNewPatientRegistrationResponse> {
  const patientId = resolveRegistrationPatientId(
    options.resolvedPatientId,
    options.existingPatientId,
  );
  if (patientId) {
    return createExistingPatientRegistration(
      mapVisitRegistrationToExistingPatientIntakeBody(form, patientId),
      { idempotencyKey: options.idempotencyKey },
    );
  }
  try {
    return await createNewPatientRegistration(
      mapVisitRegistrationToNewPatientIntakeBody(form),
      { idempotencyKey: options.idempotencyKey },
    );
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    const duplicateId = patientIdFromAlreadyExistsError(err);
    if (!duplicateId) throw err;
    return createExistingPatientRegistration(
      mapVisitRegistrationToExistingPatientIntakeBody(form, duplicateId),
      { idempotencyKey: options.idempotencyKey },
    );
  }
}

export interface StubAppointmentResponse {
  appointment_id: string;
  registration_id: string;
  patient_id: string;
  stub: true;
}

export interface VisitRegistrationBillingFlowResult {
  bill_id: string;
}

function stubDelay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, STUB_PHASE_DELAY_MS);
  });
}

/**
 * Phase 2 stub — replace with `POST` to appointment-svc when available.
 * Logs the would-be body in dev; returns a synthetic `appointment_id`.
 */
export async function createAppointmentStub(
  form: CreateVisitRequestBody,
  registration: CreateNewPatientRegistrationResponse,
): Promise<StubAppointmentResponse> {
  const body = mapVisitRegistrationToAppointmentBody(form, registration);
  if (import.meta.env.DEV) {
    console.info('[visit-registration] stub POST appointment-svc', body);
  }
  await stubDelay();
  return {
    appointment_id: crypto.randomUUID(),
    registration_id: registration.registration_id,
    patient_id: registration.patient_id,
    stub: true,
  };
}

export interface RegistrationReportMeta {
  departmentName?: string;
  doctorName?: string;
  facilityName?: string;
}

export interface CreateVisitFlowResult extends CreateNewPatientRegistrationResponse {
  bill_id: string;
  report_context: RegistrationReportQueryContext;
}

/**
 * Desk **Create Visit** orchestration (sequential).
 *
 * 1. registration-svc — new-patient or existing-patient workflow (real)
 * 2. appointment-svc — stub
 * 3. billing-svc — charges, discount, finalize, payment (real)
 * 4. registration-svc — `POST .../visits/:id/complete` (real)
 */
export async function executeCreateVisitFlow(
  form: CreateVisitRequestBody,
  options: {
    idempotencyKey: string;
    reportMeta?: RegistrationReportMeta;
    existingPatientId?: string;
    resolvedPatientId?: string | null;
  },
): Promise<CreateVisitFlowResult> {
  const registration = await registerVisitIntake(form, {
    idempotencyKey: options.idempotencyKey,
    existingPatientId: options.existingPatientId,
    resolvedPatientId: options.resolvedPatientId,
  });

  await createAppointmentStub(form, registration);
  const billing = await executeVisitRegistrationBilling(form, {
    patient_id: registration.patient_id,
    registration_id: registration.registration_id,
    visit_id: registration.id,
    idempotencyKey: options.idempotencyKey,
  });

  const completed = await completeVisitIntake(registration.id!);
  const addressBlock =
    form.residential_address?.line1?.trim()
      ? form.residential_address
      : form.permanent_address;

  try {
    await persistEmpiPatientPermanentAddress(registration.patient_id, addressBlock);
  } catch (err) {
    console.warn('[registration] EMPI patient address persist failed', {
      patientId: registration.patient_id,
      err,
    });
  }

  const patientAddress = formatPatientAddressForReport(addressBlock);

  return {
    ...completed,
    bill_id: billing.bill_id,
    report_context: {
      bill_id: billing.bill_id,
      department_name:
        options.reportMeta?.departmentName?.trim() || form.appointment?.department_name?.trim(),
      doctor_name: options.reportMeta?.doctorName?.trim(),
      room_number: form.appointment?.room_number?.trim(),
      patient_address: patientAddress,
      payment_method: form.billing?.payment_mode?.trim()?.toUpperCase(),
      facility_name: options.reportMeta?.facilityName?.trim(),
    },
  };
}

/** After appointment + billing succeed, mark the visit row completed. */
export async function completeVisitIntake(
  visitId: string,
): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/visits/${encodeURIComponent(visitId)}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

/** Update registration.visit lifecycle (e.g. doctor end consultation → `completed`). */
export async function updateRegistrationVisitStatus(
  visitId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
): Promise<RegistrationVisitResponse> {
  return apiClient<RegistrationVisitResponse>(
    `${registrationApiBase()}/visits/${encodeURIComponent(visitId)}/status`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
  );
}
