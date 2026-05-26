import type { AbdmGatewayResponseRef } from '../m2/common.js';

export type HiTypePascal =
  | 'OPConsultation'
  | 'Prescription'
  | 'DiagnosticReport'
  | 'DischargeSummary'
  | 'ImmunizationRecord'
  | 'HealthDocumentRecord'
  | 'WellnessRecord';

export type PurposeCode =
  | 'CAREMGT'
  | 'BTG'
  | 'PUBHLTH'
  | 'HPAYMT'
  | 'DSRCH'
  | 'PATRQT';

export interface KeyMaterialDhPublicKey {
  expiry?: string;
  parameters?: string;
  keyValue?: string;
}

export interface KeyMaterial {
  cryptoAlg?: string;
  curve?: string;
  dhPublicKey?: KeyMaterialDhPublicKey;
  nonce?: string;
}

export interface ConsentArtefactRef {
  id: string;
}

export interface HiRequestDateRange {
  from: string;
  to: string;
}

export interface HiRequestBody {
  consent: { id: string };
  dateRange?: HiRequestDateRange;
  dataPushUrl?: string;
  keyMaterial?: KeyMaterial;
}

export type { AbdmGatewayResponseRef };
