import type { AbdmGatewayErrorBody, AbdmGatewayResponseRef, ContextNotifyHiType } from './common.js';

/** §4.3.6 — outbound context notify. */
export interface AddContextsRequest {
  notification: {
    patient: { id: string };
    careContext: {
      patientReference: string;
      careContextReference: string;
    };
    hiTypes: ContextNotifyHiType[];
    date: string;
    hip: { id: string };
  };
}

/** §4.3.7 — inbound on-notify ack. */
export interface OnAddContextsCallback {
  requestId?: string;
  timestamp?: string;
  status?: string;
  error?: AbdmGatewayErrorBody;
  response: AbdmGatewayResponseRef;
}
