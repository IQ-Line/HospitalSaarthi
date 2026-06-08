export type AdmissionStatus = 'requested' | 'pending_clearance' | 'approved';
export type AdmissionType = 'planned' | 'emergency';

export type AdmissionRow = {
  id: string;
  episodeNumber: string;
  patientName: string;
  uhid: string;
  type: AdmissionType;
  status: AdmissionStatus;
  specialty: string;
  requestedAt: string;
};

export type AdmissionsFilters = {
  search: string;
  status: AdmissionStatus | '';
  type: AdmissionType | '';
};

export type AdmissionsListParams = {
  page: number;
  limit: number;
  filters: AdmissionsFilters;
};

export type AdmissionsListResponse = {
  items: AdmissionRow[];
  total: number;
};

export type BedInfo = { id: string; label: string; class: string };

export type WardBeds = { id: string; name: string; beds: BedInfo[] };

export type AdmissionFormInput = {
  patientId: string;
  patientLabel: string;
  admissionType: string;
  admissionSource: string;
  specialty: string;
  consultant: string;
  dayCare: boolean;
  mlc: boolean;
  provisionalDiagnosis: string;
  expectedLosDays: string;
  wardPreference: string;
  flags: string[];
  bedId: string;
  financialClass: string;
};

/** @deprecated Use AdmissionFormInput */
export type CreateAdmissionInput = AdmissionFormInput;

export type AdmissionDetail = AdmissionRow & AdmissionFormInput;
