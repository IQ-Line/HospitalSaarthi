import type { AbdmGatewayResponseRef } from './common.js';
import type { ConsentArtefactRef, HiTypePascal, PurposeCode } from './common.js';

/** §4.3.1 — HIU → CM consent request init. */
export interface ConsentRequestInitBody {
  consent: {
    purpose: { text: string; code: PurposeCode; refUri: string };
    patient: { id: string };
    hip?: { id: string };
    careContexts?: Array<{
      patientReference: string;
      careContextReference: string;
    }>;
    hiu: { id: string };
    requester: {
      name: string;
      identifier: { type: string; value: string; system: string };
    };
    hiTypes: HiTypePascal[];
    permission: {
      accessMode: 'VIEW' | 'STORE' | 'QUERY' | 'STREAM';
      dateRange: { from: string; to: string };
      dataEraseAt: string;
      frequency: { unit: string; value: number; repeats: number };
    };
  };
}

/** §4.3.2 — CM → HIU on-init callback. */
export interface OnConsentInitCallback {
  consentRequest: { id: string };
  error?: { code: string; message: string } | null;
  response: AbdmGatewayResponseRef;
}

/** §4.3.3 — CM → HIU notify (patient decision). */
export interface ConsentNotifyCallback {
  notification: {
    consentRequestId: string;
    status: 'GRANTED' | 'DENIED' | 'REVOKED';
    reason?: string | null;
    consentArtefacts?: ConsentArtefactRef[];
  };
}

/** §4.3.4 — HIU → CM notify acknowledgement. */
export interface OnConsentNotifyAckBody {
  acknowledgement: Array<{ status: 'OK'; consentId: string }>;
  error?: { code: string; message: string };
  response: AbdmGatewayResponseRef;
}

/** §4.3.7 — HIU → CM fetch artefact. */
export interface ConsentFetchRequestBody {
  consentId: string;
}

/** §4.3.8 — CM → HIU on-fetch (signed artefact). */
export interface OnConsentFetchCallback {
  consent: {
    status: string;
    consentDetail: {
      consentId: string;
      createdAt: string;
      lastUpdated: string;
      patient: { id: string };
      hip: { id: string };
      hiu: { id: string };
      purpose: { text: string; code: string; refUri?: string };
      hiTypes: HiTypePascal[];
      careContexts: Array<{
        patientReference: string;
        careContextReference: string;
      }>;
      permission: {
        accessMode: string;
        dateRange: { from: string; to: string };
        dataEraseAt: string;
        frequency?: { unit: string; value: number; repeats: number };
      };
      [key: string]: unknown;
    };
    signature: string;
  };
  error?: { code: string; message: string } | null;
  response: AbdmGatewayResponseRef;
}
