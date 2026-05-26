/** Canonical Smart Parcha API types (aligned with @hims/smart-parcha service). */

export type PatientSummary = {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  uhid: string;
  abhaAddress?: string;
};

export type VisitSummary = {
  _id: string;
  visitNumber?: string;
  patient: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
  department?: { _id: string; name: string };
  doctor?: Record<string, unknown> | string;
  vitals?: Record<string, unknown>;
  vitalsV2?: unknown;
  chiefComplaints?: unknown[];
};

export type ParchaPage = {
  pageNumber: number;
  content: string;
};

export type FullContextResponse = {
  patient: PatientSummary;
  visit: VisitSummary;
  visits: VisitSummary[];
  prescription: Record<string, unknown> | null;
  immunizations: unknown[];
  aiPrescription: { mappedFields: Record<string, string> } | null;
  smartParcha: { parchaContent: ParchaPage[] } | null;
  resumedSameDay: boolean;
  isAddendum: boolean;
};

export type ConsultationAccess = {
  editable: boolean;
  addendum: boolean;
  isReadOnly: boolean;
};
