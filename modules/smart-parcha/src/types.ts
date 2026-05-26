export type RequestContext = {
  headers: Record<string, string>;
  query: Record<string, string>;
};

export type PatientDto = {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  uhid: string;
  abhaNumber?: string;
  abhaAddress?: string;
};

export type VisitDto = Record<string, unknown> & {
  _id: string;
  visitNumber?: string;
  patient: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
};

export type FullContextDto = {
  patient: PatientDto;
  visit: VisitDto;
  visits: VisitDto[];
  prescription: Record<string, unknown> | null;
  immunizations: unknown[];
  aiPrescription: { mappedFields: Record<string, string> } | null;
  smartParcha: { parchaContent: ParchaPageDto[] } | null;
  resumedSameDay: boolean;
  isAddendum: boolean;
};

export type ParchaPageDto = {
  pageNumber: number;
  content: string;
  lines?: unknown[];
  texts?: unknown[];
};

export type SaveAndIngestPayload = {
  parchaContent: ParchaPageDto[];
  frame?: string;
  doctorId: string;
  patientId: string;
};

export type SaveAndIngestResult = {
  saved: boolean;
  aiResult?: {
    mappedFields?: Record<string, string>;
    visitPadPrescription?: Record<string, unknown>;
    skipped?: boolean;
  };
};
