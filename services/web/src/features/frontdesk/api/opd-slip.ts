import { apiClientBlob } from '@/lib/api-client';

const REGISTRATION_V1_PATH = '/api/registration/v1';

function registrationApiBase(): string {
  const fromEnv = import.meta.env.VITE_REGISTRATION_SERVICE_ORIGIN?.trim().replace(/\/$/, '');
  return fromEnv ? `${fromEnv}${REGISTRATION_V1_PATH}` : REGISTRATION_V1_PATH;
}

export function opdSlipPdfUrl(registrationId: string): string {
  return `${registrationApiBase()}/registrations/${registrationId}/documents/opd-slip.pdf`;
}

export function fetchOpdSlipPdf(registrationId: string): Promise<Blob> {
  return apiClientBlob(opdSlipPdfUrl(registrationId));
}
