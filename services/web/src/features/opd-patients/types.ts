export type OpdVisitStatus =
  | 'registered'
  | 'pre-consulted'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type OpdDoctorScope = 'all' | 'myPatients' | 'otherPatients';

export type OpdVisitTypeFilter = '' | 'new' | 'followup' | 'free-followup';

export interface OpdPatientsFilters {
  search: string;
  startDate: string;
  endDate: string;
  gender: string;
  ageGroup: string;
  visitType: OpdVisitTypeFilter;
  status: string;
  doctorId: string;
}

export interface OpdPatientVisitRow {
  id: string;
  visitNumber: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  doctorName: string;
  doctorId: string;
  visitCreatedAt: string;
  status: OpdVisitStatus;
  /** For doctor-scope tab filtering in mock mode. */
  isOwnPatient: boolean;
  actionLabel: 'Edit RX' | 'View RX' | 'Create Rx';
}

/** Read-only patient profile shown in the row-click details dialog (reference Patients modal). */
export interface OpdPatientDetails {
  firstName: string;
  middleName: string;
  lastName: string;
  uhid: string;
  dateOfBirth: string;
  ageDisplay: string;
  gender: string;
  abhaNumber: string;
  abhaAddress: string;
  phoneNumber: string;
  streetAddress: string;
  district: string;
  state: string;
  pinCode: string;
  visitCount: number;
  lastUpdated: string;
}

export interface OpdPatientsStats {
  total: number;
  pending: number;
  cancelled: number;
  reviewed: number;
}

export interface OpdPatientsListParams {
  page: number;
  limit: number;
  filters: OpdPatientsFilters;
  doctorScope: OpdDoctorScope;
}

export interface OpdPatientsListResponse {
  items: OpdPatientVisitRow[];
  total: number;
  stats: OpdPatientsStats;
}
