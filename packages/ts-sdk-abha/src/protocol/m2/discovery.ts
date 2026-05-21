import type {
  AbdmGatewayErrorBody,
  AbdmGatewayResponseRef,
  AbdmPatientCareContexts,
} from './common.js';

export interface DiscoveryPatientIdentifier {
  type: string;
  value: string;
}

export interface DiscoveryPatientRequest {
  id?: string;
  verifiedIdentifiers?: DiscoveryPatientIdentifier[];
  unverifiedIdentifiers?: DiscoveryPatientIdentifier[];
  name?: string;
  gender?: string;
  yearOfBirth?: number;
}

/** §5.3.2 — inbound discover. */
export interface DiscoveryRequest {
  transactionId: string;
  patient: DiscoveryPatientRequest[];
}

/** §5.3.3 — outbound on-discover. */
export interface OnDiscoverRequest {
  transactionId: string;
  patient?: AbdmPatientCareContexts[];
  error?: AbdmGatewayErrorBody;
  response: AbdmGatewayResponseRef;
}
