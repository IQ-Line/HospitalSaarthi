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

/** §5.3.6 — inbound link/init. */
export interface LinkInitRequest {
  transactionId: string;
  link: LinkInitLinkBody;
}

/** §5.3.7 — outbound on-init. */
export interface OnLinkInitRequest {
  transactionId: string;
  link: LinkInitLinkBody;
  response: AbdmGatewayResponseRef;
}
