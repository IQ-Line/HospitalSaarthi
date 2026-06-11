export type HistoricalSearchField =
  | 'patient_name'
  | 'mobile_number'
  | 'abha_number'
  | 'abha_address'
  | 'uhid';

export interface HistoricalRecordsFilters {
  search: string;
  searchField: HistoricalSearchField;
  startDate: string;
  endDate: string;
}

export interface HistoricalRecordRow {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  abhaNumber: string;
  uhid: string;
  mobileNumber: string;
  doctorName: string;
  lastVisitAt: string;
  visitNumber: string;
  lastUpdatedAt: string;
}

export interface HistoricalRecordsListResponse {
  items: HistoricalRecordRow[];
  total: number;
}

export type HistoricalDetailTab = 'profile' | 'documents' | 'reports';

export interface HistoricalPatientProfile {
  firstName: string;
  middleName: string;
  lastName: string;
  uhid: string;
  abhaNumber: string;
  abhaAddress: string;
  phoneNumber: string;
  dateOfBirth: string;
  ageDisplay: string;
  gender: string;
  streetAddress: string;
  district: string;
  state: string;
  pinCode: string;
  visitCount: number;
  lastUpdated: string;
}

export type HistoricalReportHiType =
  | 'OP Consultation Record'
  | 'Prescription Record'
  | 'Diagnostic Report Record'
  | 'Immunization Record';

export interface HistoricalReportItem {
  id: string;
  title: string;
  hiType: HistoricalReportHiType;
  visitNumber: string;
  doctorName: string;
  reportTime: string;
  source: 'prescription' | 'health_document';
  prescriptionId?: string;
  visitId?: string;
  documentId?: string;
}

export interface HistoricalDocumentItem {
  id: string;
  doctorName: string;
  hiType: string;
  visitNumber: string;
  reportTime: string;
  documentTitle: string;
  downloadUrl: string;
  fileName: string;
  fileType: string;
}
