import { apiClient } from '@/lib/api-client';
import type {
  CreateNewPatientRegistrationResponse,
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
  uhid?: string;
  mobile?: string;
  name?: string;
}

export async function listRegistrations(
  params: ListRegistrationsParams,
): Promise<RegistrationListPageResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.uhid?.trim()) sp.set('uhid', params.uhid.trim());
  if (params.mobile?.trim()) sp.set('mobile', params.mobile.trim());
  if (params.name?.trim()) sp.set('name', params.name.trim());
  const qs = sp.toString();
  return apiClient<RegistrationListPageResponse>(
    `${registrationApiBase()}/registrations${qs ? `?${qs}` : ''}`,
  );
}

export async function createNewPatientRegistration(
  body: Record<string, unknown>,
): Promise<CreateNewPatientRegistrationResponse> {
  return apiClient<CreateNewPatientRegistrationResponse>(
    `${registrationApiBase()}/workflows/new-patient/registrations`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
