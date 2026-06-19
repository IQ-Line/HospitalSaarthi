export type RegistrationSourceFilter = "all" | "abha" | "manual";

export type OpdRegistrationBillingReportRow = {
  patient_full_name: string;
  uhid: string;
  visit_id: string;
  abha_number: string | null;
  abha_address: string | null;
  bill_number: string | null;
  mobile_number: string;
  visit_date_time: string;
  gender: string | null;
  dob_age: string;
  registered_doctor: string | null;
  consulted_doctor: string | null;
  department: string | null;
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

export type OpdRegistrationBillingReportQuery = {
  from_date: string;
  to_date: string;
  registration_source: RegistrationSourceFilter;
  page: number;
  limit: number;
};

export type OpdRegistrationBillingReportPage = {
  summary: OpdRegistrationBillingReportSummary;
  data: OpdRegistrationBillingReportRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};
