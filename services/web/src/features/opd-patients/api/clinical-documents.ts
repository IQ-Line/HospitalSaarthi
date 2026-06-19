import { apiClientBlob, apiClientText } from '@/lib/api-client';

const OPD_PREFIX = '/api/v1/opd';

export type ClinicalReportType = 'op-consultation' | 'prescription' | 'immunization';

export interface ClinicalReportQueryContext {
  facility_name?: string;
  facility_id?: string;
  facility_address?: string;
  facility_phone?: string;
  facility_email?: string;
  department_name?: string;
  doctor_name?: string;
  patient_address?: string;
}

export function serializeClinicalReportContext(
  context?: ClinicalReportQueryContext,
): Record<string, string> {
  if (!context) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export const clinicalReportKeys = {
  all: ['clinical-reports'] as const,
  html: (visitId: string, reportType: ClinicalReportType, context?: ClinicalReportQueryContext) =>
    [
      ...clinicalReportKeys.all,
      'html',
      visitId,
      reportType,
      serializeClinicalReportContext(context),
    ] as const,
  pdf: (visitId: string, reportType: ClinicalReportType, context?: ClinicalReportQueryContext) =>
    [
      ...clinicalReportKeys.all,
      'pdf',
      visitId,
      reportType,
      serializeClinicalReportContext(context),
    ] as const,
};

function opdApiBase(): string {
  const fromEnv = import.meta.env.VITE_OPD_SERVICE_ORIGIN?.trim().replace(/\/$/, '');
  return fromEnv ? `${fromEnv}${OPD_PREFIX}` : OPD_PREFIX;
}

function buildQuery(context?: ClinicalReportQueryContext): string {
  const params = new URLSearchParams(serializeClinicalReportContext(context));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const REPORT_HTML_PATH_BY_TYPE: Record<ClinicalReportType, string> = {
  'op-consultation': 'op-consultation.html',
  prescription: 'prescription.html',
  immunization: 'immunization.html',
};

const REPORT_PDF_PATH_BY_TYPE: Record<ClinicalReportType, string> = {
  'op-consultation': 'op-consultation.pdf',
  prescription: 'prescription.pdf',
  immunization: 'immunization.pdf',
};

export function clinicalReportHtmlUrl(
  visitId: string,
  reportType: ClinicalReportType,
  context?: ClinicalReportQueryContext,
): string {
  const slug = REPORT_HTML_PATH_BY_TYPE[reportType];
  return `${opdApiBase()}/visits/${encodeURIComponent(visitId)}/documents/${slug}${buildQuery(context)}`;
}

export function clinicalReportPdfUrl(
  visitId: string,
  reportType: ClinicalReportType,
  context?: ClinicalReportQueryContext,
): string {
  const slug = REPORT_PDF_PATH_BY_TYPE[reportType];
  return `${opdApiBase()}/visits/${encodeURIComponent(visitId)}/documents/${slug}${buildQuery(context)}`;
}

export function fetchClinicalReportHtml(
  visitId: string,
  reportType: ClinicalReportType,
  context?: ClinicalReportQueryContext,
): Promise<string> {
  return apiClientText(clinicalReportHtmlUrl(visitId, reportType, context));
}

export function fetchClinicalReportPdf(
  visitId: string,
  reportType: ClinicalReportType,
  context?: ClinicalReportQueryContext,
): Promise<Blob> {
  return apiClientBlob(clinicalReportPdfUrl(visitId, reportType, context));
}

export const CLINICAL_REPORT_LABELS: Record<ClinicalReportType, string> = {
  'op-consultation': 'OP Consultation Record',
  prescription: 'Prescription Record',
  immunization: 'Immunization Record',
};
