import type { AbdmGatewayResponseRef, HiRequestBody, KeyMaterial } from './common.js';

/** §5.3.1 — HIU → CM data request. */
export interface HiuDataRequestInitBody {
  hiRequest: HiRequestBody;
}

/** §5.3.2 — CM → HIU on-request callback. */
export interface OnHiuDataRequestCallback {
  hiRequest: {
    transactionId: string;
    sessionStatus: string;
  };
  error?: { code: string; message: string } | null;
  response: AbdmGatewayResponseRef;
}

/** HIP → HIU encrypted bundle push (§5 push body). */
export interface EncryptedBundlePushBody {
  pageNumber: number;
  pageCount: number;
  transactionId: string;
  entries: Array<{
    content: string;
    media: string;
    checksum: string;
    careContextReference: string;
  }>;
  keyMaterial: KeyMaterial;
}

/** §5.3.3 — HIU or HIP → CM data-flow notify. */
export interface DataFlowNotifyBody {
  notification: {
    consentId: string;
    transactionId: string;
    doneAt?: string;
    notifier: { type: 'HIU' | 'HIP'; id: string };
    statusNotification: {
      sessionStatus: 'TRANSFERRED' | 'FAILED' | 'RECEIVED';
      hipId?: string;
      statusResponses?: Array<{
        careContextReference: string;
        hiStatus: 'DELIVERED' | 'ERRORED';
        description?: string;
      }>;
    };
  };
  error?: { code: string; message: string };
  response?: AbdmGatewayResponseRef;
}
