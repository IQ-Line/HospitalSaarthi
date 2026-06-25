import { useQuery } from '@tanstack/react-query';
import { abdmFetch } from '@/features/abha/api/abdm-client';

export type ConsentDisplayStatus = 'REQUESTED' | 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED';

export interface ConsentListDataPushedEntry {
  id: string;
  careContextReference?: string;
  content: string;
  bundleType?: string;
  CompositionInfo?: Array<{ title?: string }>;
  AttachmentRefs?: Array<{
    title?: string;
    refId: string;
    bundleId: string;
    sessionId: string;
    num: number;
    contentType?: string;
  }>;
}

export interface ConsentListDataPushed {
  transactionId?: string;
  entries: ConsentListDataPushedEntry[];
}

export interface ConsentListArtifact {
  consentId: string;
  hipId: string;
  hipName?: string;
  status: string;
  sessionStatus?: string;
  hiTypes: string[];
  careContexts: Array<{ patientReference: string; careContextReference: string }>;
  transferId?: string;
  dataPushed?: ConsentListDataPushed;
  grantedAt?: string;
}

export interface ConsentListSession {
  sessionId: string;
  consentRequestId: string;
  status: ConsentDisplayStatus;
  drName: string;
  identifiers: {
    name: string;
    abha_address: string;
    abha_number?: string;
  };
  fromDate: string;
  toDate: string;
  dataEraseAt: string;
  hiTypes: string[];
  purpose: { code: string; text: string };
  consentArtifacts: ConsentListArtifact[];
  createdAt: string;
  updatedAt: string;
  grantedAt?: string;
  _consentStatusTimestamps?: {
    REQUESTED?: string;
    GRANTED?: string;
  };
}

export interface ConsentListFilters {
  search: string;
  drName: string;
  hiTypes: string;
  consentStatus: string;
  startDate: string;
  endDate: string;
}

export interface ConsentListParams {
  page: number;
  limit: number;
  filters: ConsentListFilters;
}

export interface ConsentListResponse {
  sessions: ConsentListSession[];
  page: number;
  limit: number;
  totalCount: number;
}

export interface M3TransferState {
  transferId: string;
  state: string;
  consentId?: string;
  bundle?: {
    transactionId?: string;
    entries?: Array<{ content: string; careContextReference?: string }>;
  };
  error?: { code: string; message: string };
}

export interface M3ConsentRequestState {
  sessionId: string;
  state: string;
  consentRequestId?: string;
  consentArtefactIds?: string[];
  error?: { code: string; message: string };
}

export type M3PurposeCode =
  | 'CAREMGT'
  | 'BTG'
  | 'PUBHLTH'
  | 'HPAYMT'
  | 'DSRCH'
  | 'PATRQT';

export const M3_HI_TYPES = [
  'Prescription',
  'DiagnosticReport',
  'DischargeSummary',
  'OPConsultation',
  'ImmunizationRecord',
  'HealthDocumentRecord',
  'WellnessRecord',
] as const;

export const M3_PURPOSE_OPTIONS: Array<{ code: M3PurposeCode; label: string }> = [
  { code: 'CAREMGT', label: 'Care Management' },
  { code: 'BTG', label: 'Break the Glass' },
  { code: 'PUBHLTH', label: 'Public Health' },
  { code: 'HPAYMT', label: 'Healthcare Payment' },
  { code: 'DSRCH', label: 'Disease Specific Healthcare Research' },
  { code: 'PATRQT', label: 'Self Requested' },
];

const POLLING_STATES = new Set(['CONSENT_INIT_REQUESTED', 'AWAITING_PATIENT_APPROVAL']);

export function mapM3FsmToDisplayStatus(
  state: string,
  error?: { code?: string },
): ConsentDisplayStatus {
  if (state === 'CONSENT_DENIED') {
    return error?.code === 'REVOKED' ? 'REVOKED' : 'DENIED';
  }
  if (state === 'EXPIRED') return 'EXPIRED';
  if (POLLING_STATES.has(state)) return 'REQUESTED';
  if (
    state === 'CONSENT_GRANTED' ||
    state === 'DATA_REQUESTED' ||
    state === 'AWAITING_PUSH' ||
    state === 'BUNDLES_RECEIVED' ||
    state === 'BUNDLES_DECRYPTED' ||
    state === 'RECORDS_INGESTED' ||
    state === 'ACKNOWLEDGED'
  ) {
    return 'GRANTED';
  }
  return 'REQUESTED';
}

export function startM3ConsentRequest(body: {
  patientAbhaAddress: string;
  patientId?: string;
  patientName?: string;
  patientAbhaNumber?: string;
  purpose: M3PurposeCode;
  hiTypes: string[];
  dateRange: { from: string; to: string };
  dataEraseAt?: string;
  requesterName?: string;
  hipId?: string;
}): Promise<{ sessionId: string; state: string }> {
  return abdmFetch('/m3/hiu/consent/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchM3ConsentRequest(sessionId: string): Promise<M3ConsentRequestState> {
  return abdmFetch<M3ConsentRequestState>(`/m3/hiu/consent/request/${sessionId}`);
}

export function consentSessionStorageKey(patientId: string): string {
  return `create-rx-abha-consent:${patientId}`;
}

export interface StoredConsentSession {
  sessionId: string;
  form: {
    requesterName: string;
    purpose: M3PurposeCode;
    fromDate: string;
    toDate: string;
    expiryDate: string;
    forAllHips: boolean;
    hipId: string;
  };
}

export function readStoredConsentSession(patientId: string): StoredConsentSession | null {
  try {
    const raw = sessionStorage.getItem(consentSessionStorageKey(patientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsentSession;
    if (!parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredConsentSession(patientId: string, value: StoredConsentSession): void {
  sessionStorage.setItem(consentSessionStorageKey(patientId), JSON.stringify(value));
}

export function clearStoredConsentSession(patientId: string): void {
  sessionStorage.removeItem(consentSessionStorageKey(patientId));
}

const STALE_MS = 30_000;

export const consentListQueryKeys = {
  all: ['abha-consent-list'] as const,
  list: (params: ConsentListParams) => [...consentListQueryKeys.all, 'list', params] as const,
  records: (sessionId: string, consentId?: string) =>
    [...consentListQueryKeys.all, 'records', sessionId, consentId ?? 'all'] as const,
};

function buildSearchParams(params: ConsentListParams): string {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.limit));
  const { filters } = params;
  if (filters.search.trim()) sp.set('name', filters.search.trim());
  if (filters.drName.trim()) sp.set('drName', filters.drName.trim());
  if (filters.startDate) sp.set('from', filters.startDate);
  if (filters.endDate) sp.set('to', filters.endDate);
  if (filters.hiTypes && filters.hiTypes !== 'all') sp.set('hiTypes', filters.hiTypes);
  if (filters.consentStatus && filters.consentStatus !== 'all') {
    sp.set('status', filters.consentStatus);
  }
  return sp.toString();
}

export function fetchConsentList(params: ConsentListParams): Promise<ConsentListResponse> {
  return abdmFetch<ConsentListResponse>(`/m3/hiu/consent/requests?${buildSearchParams(params)}`);
}

export interface ConsentArtefactRecordsResponse {
  sessionId: string;
  artefacts: Array<{
    consentId: string;
    hipId: string;
    hipName?: string;
    dataPushed?: ConsentListDataPushed;
  }>;
}

export function fetchConsentArtefactRecords(
  sessionId: string,
  consentId?: string,
): Promise<ConsentArtefactRecordsResponse> {
  const sp = consentId ? `?consentId=${encodeURIComponent(consentId)}` : '';
  return abdmFetch<ConsentArtefactRecordsResponse>(
    `/m3/hiu/consent/request/${sessionId}/records${sp}`,
  );
}

const ALLOWED_INLINE_ATTACHMENT_TYPES = new Set(['application/pdf']);

function resolveAttachmentBlobType(contentType: string): { mime: string; inline: boolean } {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (ALLOWED_INLINE_ATTACHMENT_TYPES.has(normalized)) {
    return { mime: normalized, inline: true };
  }
  if (normalized.startsWith('image/')) {
    return { mime: normalized, inline: true };
  }
  return { mime: 'application/octet-stream', inline: false };
}

function openAttachmentBlob(blob: Blob, title: string, inline: boolean): void {
  const blobUrl = URL.createObjectURL(blob);
  if (inline) {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = title || 'report';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function startM3DataRequest(consentId: string): Promise<{ transferId: string; state: string }> {
  return abdmFetch('/m3/hiu/data-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentId }),
  });
}

export function fetchM3Transfer(transferId: string): Promise<M3TransferState> {
  return abdmFetch<M3TransferState>(`/m3/hiu/transfers/${transferId}`);
}

export interface M3AttachmentResponse {
  data: {
    attachment: {
      title: string;
      contentType: string;
      content: string;
    };
  };
}

export async function downloadM3Attachment(
  sessionId: string,
  bundleId: string,
  num: number,
): Promise<{ title: string }> {
  const res = await abdmFetch<M3AttachmentResponse>(
    `/m3/hiu/attachment/${sessionId}/${bundleId}/${num}`,
  );
  const { attachment } = res.data;
  const binary = atob(attachment.content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const { mime, inline } = resolveAttachmentBlobType(attachment.contentType || 'application/pdf');
  const blob = new Blob([bytes], { type: mime });
  const title = attachment.title || 'Report';
  openAttachmentBlob(blob, title, inline);
  return { title };
}

export function useConsentListQuery(params: ConsentListParams, debouncedSearch: string, debouncedDrName: string) {
  const queryParams: ConsentListParams = {
    ...params,
    filters: {
      ...params.filters,
      search: debouncedSearch,
      drName: debouncedDrName,
    },
  };

  return useQuery({
    queryKey: consentListQueryKeys.list(queryParams),
    queryFn: () => fetchConsentList(queryParams),
    placeholderData: (prev) => prev,
    staleTime: STALE_MS,
  });
}
