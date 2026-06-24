import type { AbdmGatewayResponseRef } from './common.js';

export interface LinkInitLinkMeta {
  communicationMedium: string;
  communicationHint?: string;
  communicationExpiry?: string;
}

export interface LinkInitLinkBody {
  referenceNumber: string;
  authenticationType: string;
  meta: LinkInitLinkMeta;
}

/** §5.3.6 — inbound link/init (CM may send `link` or PHR `patient` selection). */
export interface LinkInitPatientSelection {
  referenceNumber?: string;
  careContexts?: Array<{ referenceNumber: string; display?: string }>;
  hiType?: string;
  count?: number;
}

export interface LinkInitRequest {
  transactionId: string;
  abhaAddress?: string;
  patient?: LinkInitPatientSelection[];
  link?: LinkInitLinkBody;
}

/** §5.3.7 — outbound on-init. */
export interface OnLinkInitRequest {
  transactionId: string;
  link: LinkInitLinkBody;
  response: AbdmGatewayResponseRef;
}
