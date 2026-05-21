import type { AbdmGatewayResponseRef } from './common.js';

export interface ConsentArtefactPermission {
  accessMode: string;
  dateRange: { from: string; to: string };
  dataEraseAt: string;
  frequency?: { unit: string; value: number; repeats: number };
}

export interface ConsentArtefact {
  schemaVersion: string;
  consentId: string;
  createdAt: string;
  patient: { id: string };
  hip: { id: string };
  hiu: { id: string };
  purpose: { text: string; code: string; refUri?: string };
  hiTypes: string[];
  permission: ConsentArtefactPermission;
  consentManager?: { id: string };
  requester?: Record<string, unknown>;
}

/** §6.3.1 — wrapped notification body. */
export interface ConsentNotifyRequest {
  notification: {
    status: 'GRANTED' | 'REVOKED';
    consentId: string;
    consentDetail: ConsentArtefact;
    signature: string;
    grantAcknowledgement: boolean;
  };
}

/** §6.3.2 — HIP ack. */
export interface OnConsentNotifyRequest {
  acknowledgement: { status: 'OK'; consentId: string };
  response: AbdmGatewayResponseRef;
}
