import { apiClient, apiClientBlob, apiClientFormData } from '@/lib/api-client';

const OPD_PREFIX = '/api/v1/opd';

export const HEALTH_DOCUMENT_HI_TYPES = [
  'Diagnostic Report Record',
  'Discharge Summary Record',
  'OP Consultation Record',
  'Prescription Record',
  'Immunization Record',
  'Invoice Record',
  'Wellness Record',
] as const;

export interface HealthDocumentSummary {
  id: string;
  patient_id: string;
  visit_id?: string | null;
  file_name: string;
  file_type: string;
  document_title: string;
  hi_type: string;
  uploaded_at: string;
  download_url: string;
}

export interface HealthDocumentListResponse {
  success: boolean;
  count: number;
  total: number;
  total_pages: number;
  current_page: number;
  limit: number;
  data: HealthDocumentSummary[];
}

export async function uploadHealthDocument(
  patientId: string,
  file: File,
  hiType: string,
  documentTitle: string,
  visitId?: string,
): Promise<HealthDocumentSummary> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('hi_type', hiType);
  formData.append('document_title', documentTitle);
  if (visitId?.trim()) {
    formData.append('visit_id', visitId.trim());
  }

  const uploaded = await apiClientFormData<HealthDocumentUploadResponse>(
    `${OPD_PREFIX}/patients/${patientId}/health-documents`,
    formData,
  );

  return {
    id: uploaded.id,
    patient_id: uploaded.patient_id,
    visit_id: uploaded.visit_id,
    file_name: uploaded.file_name,
    file_type: uploaded.file_type,
    document_title: uploaded.document_title,
    hi_type: uploaded.hi_type,
    uploaded_at: uploaded.uploaded_at,
    download_url: `${OPD_PREFIX}/health-documents/${uploaded.id}/download`,
  };
}

interface HealthDocumentUploadResponse {
  id: string;
  patient_id: string;
  visit_id?: string | null;
  file_name: string;
  file_type: string;
  document_title: string;
  hi_type: string;
  uploaded_at: string;
}

export async function fetchPatientHealthDocuments(
  patientId: string,
  visitId?: string,
  page = 1,
  limit = 50,
): Promise<HealthDocumentListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (visitId?.trim()) {
    params.set('visit_id', visitId.trim());
  }

  return apiClient<HealthDocumentListResponse>(
    `${OPD_PREFIX}/patients/${patientId}/health-documents?${params.toString()}`,
  );
}

function resolveDownloadApiPath(downloadPath: string): string {
  if (downloadPath.startsWith('http')) {
    try {
      return new URL(downloadPath).pathname;
    } catch {
      return downloadPath;
    }
  }
  if (downloadPath.startsWith('/')) {
    return downloadPath;
  }
  return `${OPD_PREFIX}/health-documents/${downloadPath}/download`;
}

function downloadAcceptHeader(fileName: string, mimeType?: string): string {
  const fromMime = mimeType?.trim();
  if (fromMime) return fromMime;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/** Stream file via OPD (same-origin; Azure blobs are not CORS-enabled for localhost). */
export async function downloadHealthDocument(
  downloadPath: string,
  fileName: string,
  mimeType?: string,
): Promise<void> {
  const apiPath = resolveDownloadApiPath(downloadPath);
  const accept = downloadAcceptHeader(fileName, mimeType);

  const blob = await apiClientBlob(apiPath, {
    headers: { Accept: accept },
  });

  if (blob.size < 100) {
    throw new Error('Downloaded file is empty or invalid. Try uploading again.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const safeName = fileName.trim() || 'document';
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (accept === 'application/pdf' || safeName.toLowerCase().endsWith('.pdf')) {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  }

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
