import type { AbdmGatewayResponseRef, AbdmPatientCareContexts } from './common.js';

/** §5.3.10 — inbound link/confirm. */
export interface LinkConfirmRequest {
  confirmation: {
    token: string;
    linkRefNumber: string;
  };
}

/** §5.3.11 — outbound on-confirm (separate POST). */
export interface OnLinkConfirmRequest {
  patient: AbdmPatientCareContexts[];
  response: AbdmGatewayResponseRef;
}
