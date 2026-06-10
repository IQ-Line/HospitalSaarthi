export type PdfPageFormat = "A4" | "Letter";

export interface PdfRenderOptions {
  landscape?: boolean;
  format?: PdfPageFormat;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

export interface RenderHtmlRequest {
  html: string;
  headerHtml?: string;
  footerHtml?: string;
  options?: PdfRenderOptions;
  /** Propagated as `x-request-id` to pdf-platform. */
  requestId?: string;
}

export interface OpdSlipReportPatient {
  name: string;
  uhid: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  gender?: string;
  salutation?: string;
  abhaNumber?: string;
  abhaAddress?: string;
  address?: string;
}

export interface OpdSlipReportVisit {
  visitNumber?: string;
  createdAt: string;
  visitType?: string;
  status?: string;
  departmentName?: string;
  roomNumber?: string;
  tokenNumber?: number;
  fees?: string;
  visitValidTill?: string;
  consultationType?: string;
  priority?: string;
}

export interface OpdSlipReportDoctor {
  name: string;
  qualification?: string;
  specialization?: string;
  hprId?: string;
  regNumber?: string;
  signature?: string;
}

export interface OpdSlipReportFacility {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  facilityId?: string;
  logoUrl?: string;
  footerText?: string;
}

export interface OpdSlipSmartParchaPage {
  pageNumber: number;
  content: string;
}

/** Body for pdf-platform `POST /v1/pdf/reports/opd-slip`. */
export interface OpdSlipReportRequest {
  patientId: string;
  visitId: string;
  doctorId?: string;
  patient: OpdSlipReportPatient;
  visit: OpdSlipReportVisit;
  doctor: OpdSlipReportDoctor;
  facility: OpdSlipReportFacility;
  smartParchaEnabled?: boolean;
  smartParchaPages?: OpdSlipSmartParchaPage[];
  showDoctorSignature?: boolean;
  options?: PdfRenderOptions;
  /** Propagated as `x-request-id` to pdf-platform. */
  requestId?: string;
}

export interface PdfRendererPort {
  renderHtml(request: RenderHtmlRequest): Promise<Buffer>;
  renderOpdSlipReport(request: OpdSlipReportRequest): Promise<Buffer>;
}

export interface HttpPdfPlatformRendererConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}
