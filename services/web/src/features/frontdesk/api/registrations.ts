import { apiClient } from '@/lib/api-client';
import { mapVisitRegistrationToNewPatientIntakeBody } from '@/features/frontdesk/utils/visit-registration-helpers';
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

/**
 * Desk **Create Visit** orchestration (sequential, one service at a time).
 *
 * **Now (phase 1):** registration-svc only — `POST .../workflows/new-patient/registrations`.
 * Patient demographics + visit context fields that registration accepts today
 * (`visit_type`, `department_id`, `provider_id`). Attendant, vitals, lab, RIS, and billing
 * remain on the form payload but are **not** sent to registration.
 *
 * **Later:**
 * 2. appointment-svc — after registration returns `registration_id`
 * 3. billing-svc — after appointment succeeds
 *
 * Wire phases 2–3 here when those APIs exist; keep the same idempotency key across retries
 * for phase 1 only (appointment/billing will use their own keys).
 */
export async function executeCreateVisitFlow(
  form: CreateVisitRequestBody,
  options: { idempotencyKey: string },
): Promise<CreateNewPatientRegistrationResponse> {
  const registration = await createNewPatientRegistration(
    mapVisitRegistrationToNewPatientIntakeBody(form),
    { idempotencyKey: options.idempotencyKey },
  );

  // Phase 2 — appointment-svc (mapVisitRegistrationToAppointmentBody)
  // const appointment = await createAppointment({
  //   registration_id: registration.registration_id,
  //   patient_id: registration.patient_id,
  //   ...form.appointment,
  //   ...form.vitals,
  // });

  // Phase 3 — billing-svc (mapVisitRegistrationToBillingBody)
  // if (!appointment) throw new Error('appointment required before billing');
  // await createBilling({
  //   registration_id: registration.registration_id,
  //   appointment_id: appointment.appointment_id,
  //   ...form.billing,
  // });

  return registration;
}

/** After appointment + billing succeed, mark the registration row completed. */
export async function completeRegistrationIntake(registrationId: string): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/registrations/${registrationId}/complete`,
    { method: "POST" },
  );
}
