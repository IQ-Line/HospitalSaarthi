import { apiClient } from '@/lib/api-client';
import { executeVisitRegistrationBilling } from '@/features/frontdesk/api/visit-registration-billing';
import {
  mapVisitRegistrationToAppointmentBody,
  mapVisitRegistrationToNewPatientIntakeBody,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import type {
  CreateNewPatientRegistrationResponse,
  CreateVisitRequestBody,
  RegistrationListPageResponse,
} from '@/features/frontdesk/types';

/**
 * Browser → registration-svc directly (default dev: `http://localhost:3006`).
 * Override with `VITE_REGISTRATION_SERVICE_ORIGIN` (no trailing slash), e.g. production URL.
 */
const REGISTRATION_V1_PATH = '/api/registration/v1';

/** Simulated network latency for stub phases (ms). */
const STUB_PHASE_DELAY_MS = 200;

function registrationServiceOrigin(): string {
  const fromEnv = import.meta.env.VITE_REGISTRATION_SERVICE_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://localhost:3006';
  return '';
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
  options: { idempotencyKey: string },
): Promise<CreateNewPatientRegistrationResponse> {
  const registration = await createNewPatientRegistration(
    mapVisitRegistrationToNewPatientIntakeBody(form),
    { idempotencyKey: options.idempotencyKey },
  );

  await createAppointmentStub(form, registration);
  await executeVisitRegistrationBilling(form, {
    patient_id: registration.patient_id,
    registration_id: registration.registration_id,
    visit_id: registration.visit_id,
    idempotencyKey: options.idempotencyKey,
  });

  return completeRegistrationIntake(registration.registration_id);
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
