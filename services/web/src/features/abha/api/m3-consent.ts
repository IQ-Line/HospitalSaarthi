import { abdmFetch } from '@/features/abha/api/abdm-client';
import type { M3HiType, M3PurposeCode } from '@/features/abha/lib/m3-consent';

export interface M3ConsentRequestInput {
  patientAbhaAddress: string;
  purpose: M3PurposeCode;
  hiTypes: M3HiType[];
  dateRange: { from: string; to: string };
  dataEraseAt?: string;
  hipId?: string;
  requesterName?: string;
  requesterRegNo?: string;
}

export interface M3ConsentRequestStartResponse {
  sessionId: string;
  state: string;
}

export interface M3ConsentRequestStatus {
  sessionId: string;
  state: string;
  consentRequestId?: string;
  consentArtefactIds?: string[];
  error?: { code?: string; message?: string };
}

export interface M3DataRequestStartResponse {
  transferId: string;
  state: string;
}

export interface M3TransferStatus {
  transferId: string;
  state: string;
  consentId?: string;
  bundle?: unknown;
  error?: { code?: string; message?: string };
}

export function startM3ConsentRequest(
  body: M3ConsentRequestInput,
): Promise<M3ConsentRequestStartResponse> {
  return abdmFetch<M3ConsentRequestStartResponse>('/m3/hiu/consent/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getM3ConsentRequest(sessionId: string): Promise<M3ConsentRequestStatus> {
  return abdmFetch<M3ConsentRequestStatus>(
    `/m3/hiu/consent/request/${encodeURIComponent(sessionId)}`,
  );
}

export function startM3DataRequest(consentId: string): Promise<M3DataRequestStartResponse> {
  return abdmFetch<M3DataRequestStartResponse>('/m3/hiu/data-request', {
    method: 'POST',
    body: JSON.stringify({ consentId }),
  });
}

export function getM3Transfer(transferId: string): Promise<M3TransferStatus> {
  return abdmFetch<M3TransferStatus>(
    `/m3/hiu/transfers/${encodeURIComponent(transferId)}`,
  );
}
