import { apiClientBlob, apiClientText } from '@/lib/api-client';

const REGISTRATION_V1_PATH = '/api/registration/v1';

function registrationApiBase(): string {
  const fromEnv = import.meta.env.VITE_REGISTRATION_SERVICE_ORIGIN?.trim().replace(/\/$/, '');
  return fromEnv ? `${fromEnv}${REGISTRATION_V1_PATH}` : REGISTRATION_V1_PATH;
}

export interface RegistrationReportQueryContext {
  bill_id?: string;
  department_name?: string;
  doctor_name?: string;
  room_number?: string;
  patient_address?: string;
  payment_method?: string;
  facility_name?: string;
  facility_id?: string;
  facility_address?: string;
  facility_phone?: string;
  facility_email?: string;
}

/** Stable, trimmed context for TanStack Query keys and URL query strings. */
export function serializeRegistrationReportContext(
  context?: RegistrationReportQueryContext,
): Record<string, string> {
  if (!context) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export const registrationReportKeys = {
  all: ['registration-reports'] as const,
  slipPdf: (registrationId: string, context?: RegistrationReportQueryContext) =>
    [
      ...registrationReportKeys.all,
      registrationId,
      'opd-slip-pdf',
      serializeRegistrationReportContext(context),
    ] as const,
  receiptPdf: (
    registrationId: string,
    context: RegistrationReportQueryContext & { bill_id: string },
  ) =>
    [
      ...registrationReportKeys.all,
      registrationId,
      'opd-receipt-pdf',
      serializeRegistrationReportContext(context),
    ] as const,
};

function buildQuery(context?: RegistrationReportQueryContext): string {
  const serialized = serializeRegistrationReportContext(context);
  const sp = new URLSearchParams(serialized);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function opdSlipHtmlUrl(
  registrationId: string,
  context?: RegistrationReportQueryContext,
): string {
  return `${registrationApiBase()}/registrations/${registrationId}/documents/opd-slip.html${buildQuery(context)}`;
}

export function opdReceiptHtmlUrl(
  registrationId: string,
  context?: RegistrationReportQueryContext,
): string {
  return `${registrationApiBase()}/registrations/${registrationId}/documents/opd-receipt.html${buildQuery(context)}`;
}

export function fetchOpdSlipHtml(
  registrationId: string,
  context?: RegistrationReportQueryContext,
): Promise<string> {
  return apiClientText(opdSlipHtmlUrl(registrationId, context));
}

export function fetchOpdReceiptHtml(
  registrationId: string,
  context: RegistrationReportQueryContext & { bill_id: string },
): Promise<string> {
  return apiClientText(opdReceiptHtmlUrl(registrationId, context));
}

export function opdSlipPdfUrl(
  registrationId: string,
  context?: RegistrationReportQueryContext,
): string {
  return `${registrationApiBase()}/registrations/${registrationId}/documents/opd-slip.pdf${buildQuery(context)}`;
}

export function opdReceiptPdfUrl(
  registrationId: string,
  context: RegistrationReportQueryContext & { bill_id: string },
): string {
  return `${registrationApiBase()}/registrations/${registrationId}/documents/opd-receipt.pdf${buildQuery(context)}`;
}

export function fetchOpdSlipPdf(
  registrationId: string,
  context?: RegistrationReportQueryContext,
): Promise<Blob> {
  return apiClientBlob(opdSlipPdfUrl(registrationId, context));
}

export function fetchOpdReceiptPdf(
  registrationId: string,
  context: RegistrationReportQueryContext & { bill_id: string },
): Promise<Blob> {
  return apiClientBlob(opdReceiptPdfUrl(registrationId, context));
}
