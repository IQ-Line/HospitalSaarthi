import { apiClient } from '@/lib/api-client';
import { executeVisitRegistrationBilling } from '@/features/frontdesk/api/visit-registration-billing';
import {
  mapVisitRegistrationToAppointmentBody,
  mapVisitRegistrationToNewPatientIntakeBody,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { formatPatientAddressForReport } from '@/features/frontdesk/utils/report-address';
import type { RegistrationReportQueryContext } from '@/features/frontdesk/api/registration-documents';
import type {
  CreateNewPatientRegistrationResponse,
  CreateVisitRequestBody,
  RegistrationListPageResponse,
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
}

export async function listRegistrations(
  params: ListRegistrationsParams,
): Promise<RegistrationListPageResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.q?.trim()) sp.set('q', params.q.trim());
  const qs = sp.toString();
  return apiClient<RegistrationListPageResponse>(
    `${registrationApiBase()}/registrations${qs ? `?${qs}` : ''}`,
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
 * 1. registration-svc — `POST .../workflows/new-patient/registrations` (real)
 * 2. appointment-svc — stub
 * 3. billing-svc — charges, discount, finalize, payment (real)
 * 4. registration-svc — `POST .../registrations/:id/complete` (real)
 */
export async function executeCreateVisitFlow(
  form: CreateVisitRequestBody,
  options: { idempotencyKey: string; reportMeta?: RegistrationReportMeta },
): Promise<CreateVisitFlowResult> {
  const registration = await createNewPatientRegistration(
    mapVisitRegistrationToNewPatientIntakeBody(form),
    { idempotencyKey: options.idempotencyKey },
  );

  await createAppointmentStub(form, registration);
  const billing = await executeVisitRegistrationBilling(form, {
    patient_id: registration.patient_id,
    registration_id: registration.registration_id,
    visit_id: registration.visit_id,
    idempotencyKey: options.idempotencyKey,
  });

  const completed = await completeRegistrationIntake(registration.registration_id);
  const patientAddress = formatPatientAddressForReport(
    form.residential_address?.line1?.trim()
      ? form.residential_address
      : form.permanent_address,
  );

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

/** After appointment + billing succeed, mark the registration row completed. */
export async function completeRegistrationIntake(
  registrationId: string,
): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/registrations/${registrationId}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
