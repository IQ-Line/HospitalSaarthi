import type { AbdmGatewayResponseRef } from '../m2/common.js';

export interface HipHiRequestKeyMaterial {
  cryptoAlg?: string;
  curve?: string;
  dhPublicKey?: {
    expiry?: string;
    parameters?: string;
    keyValue?: string;
  };
  nonce?: string;
}

/** §6.3.3 — inbound HI request to HIP (wrapped `hiRequest`). */
export interface HipHealthInformationRequest {
  hiRequest?: {
    consent?: { id: string };
    dateRange?: { from: string; to: string };
    dataPushUrl?: string;
    keyMaterial?: HipHiRequestKeyMaterial;
  };
  transactionId?: string;
  consentId?: string;
  [key: string]: unknown;
}

/** §6.3.4 — HIP ack to HI request. */
export interface HipHealthInformationAckRequest {
  hiRequest: {
    transactionId: string;
    sessionStatus: 'ACKNOWLEDGED' | 'FAILED';
  };
  response: AbdmGatewayResponseRef;
  error?: { code: string; message: string };
}

/** §6.3.5 — HIP push to HIU dataPushUrl. */
export interface HipDataPushEntry {
  content: string;
  media: string;
  checksum: string;
  careContextReference: string;
}

export interface HipDataPushRequest {
  pageNumber: number;
  pageCount: number;
  transactionId: string;
  entries: HipDataPushEntry[];
  keyMaterial: HipHiRequestKeyMaterial;
}

/** §6.3.6 — HIP data-flow notify. */
export interface HipDataFlowNotifyRequest {
  notification: {
    consentId?: string;
    transactionId?: string;
    statusNotification: {
      sessionStatus: 'TRANSFERRED' | 'FAILED';
      hipId?: string;
      statusResponses?: Array<{
        careContextReference: string;
        hiStatus: 'DELIVERED' | 'ERRORED';
        description?: string;
      }>;
    };
  };
  response?: AbdmGatewayResponseRef;
}
