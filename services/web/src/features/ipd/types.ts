/** LLD episode lifecycle — matches backend `ipd.episodes.status`. */
export type EpisodeStatus =
  | 'scheduled'
  | 'admitted'
  | 'discharge_planning'
  | 'pending_clearance'
  | 'discharged'
  | 'cancelled';

export type AdmissionType = 'planned' | 'emergency' | 'direct' | 'daycare' | 'transfer_in';

export type AdmissionRow = {
  id: string;
  episodeNumber: string;
  patientName: string;
  uhid: string;
  type: AdmissionType;
  status: EpisodeStatus;
  specialty: string;
  requestedAt: string;
  admittedAt: string | null;
};

export type AdmissionsFilters = {
  search: string;
  status: EpisodeStatus | '';
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
  expectedLosDays: number | null;
  wardPreference: string;
  flags: string[];
  bedId: string;
  financialClass: string;
};

/** @deprecated Use AdmissionFormInput */
export type CreateAdmissionInput = AdmissionFormInput;

export type AdmissionDetail = AdmissionRow & AdmissionFormInput;

/** @deprecated Use EpisodeStatus */
export type AdmissionStatus = EpisodeStatus;
