export type RegistrationSourceFilter = 'all' | 'abha' | 'manual';

export type OpdRegistrationBillingReportRow = {
  patient_full_name: string;
  uhid: string;
  visit_id: string;
  abha_number: string;
  abha_address: string;
  bill_number: string;
  mobile_number: string;
  visit_date_time: string;
  gender: string;
  dob_age: string;
  registered_doctor: string;
  consulted_doctor: string;
  department: string;
  registration_fee: string;
  op_consultation_fee: string;
  total_fees_collected: string;
  visit_type: string;
};

export type OpdRegistrationBillingReportSummary = {
  total_patients_registered: number;
  total_manual_registrations: number;
  total_abha_registrations: number;
  total_fees_collected: string;
  registration_fees_collected: string;
  consultation_fees_collected: string;
};

export type OpdRegistrationBillingReportPage = {
  summary: OpdRegistrationBillingReportSummary;
  data: OpdRegistrationBillingReportRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type OpdRegistrationBillingReportFilters = {
  fromDate: string;
  toDate: string;
  registrationSource: RegistrationSourceFilter;
};

export const REGISTRATION_SOURCE_OPTIONS = [
  { value: 'all' as const, label: 'All (ABHA + Manual)' },
  { value: 'abha' as const, label: 'ABHA registrations only' },
  { value: 'manual' as const, label: 'Manual registrations only' },
];

export const OPD_REGISTRATION_BILLING_PAGE_SIZE = 10;
