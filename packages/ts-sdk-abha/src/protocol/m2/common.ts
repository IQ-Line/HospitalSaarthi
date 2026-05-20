export interface AbdmGatewayErrorBody {
  code: string;
  message: string;
}

export interface AbdmGatewayResponseRef {
  requestId: string;
}

export interface AbdmCareContextRef {
  referenceNumber: string;
  display: string;
}

export interface AbdmPatientCareContexts {
  referenceNumber: string;
  display: string;
  careContexts: AbdmCareContextRef[];
  hiType: string;
  count: number;
}

/** ALL CAPS — HIP-initiated link/carecontext. */
export type LinkCareContextHiType =
  | 'PRESCRIPTION'
  | 'OPCONSULTATION'
  | 'DIAGNOSTICREPORT'
  | 'DISCHARGESUMMARY'
  | 'IMMUNIZATIONRECORD'
  | 'HEALTHDOCUMENTRECORD'
  | 'WELLNESSRECORD';

/** PascalCase — link/context/notify. */
export type ContextNotifyHiType =
  | 'Prescription'
  | 'OPConsultation'
  | 'DiagnosticReport'
  | 'DischargeSummary'
  | 'ImmunizationRecord'
  | 'HealthDocumentRecord'
  | 'WellnessRecord';
