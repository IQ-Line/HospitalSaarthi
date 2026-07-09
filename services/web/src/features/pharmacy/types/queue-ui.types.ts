/** UI types for prescription queue — aligned with future pharmacy.v1 OpenAPI. */

export type PharmacyVisitWorkflowStatus =
  | 'registered'
  | 'pre_consulted'
  | 'consulted'
  | 'cancelled'
  | 'no_show';

export type PharmacyQueueDisplayStatus = 'pending' | 'no_queued' | 'partial' | 'dispensed';

export type PharmacyPrescriptionQueueRow = {
  visit_id: string;
  formatted_visit_id: string;
  patient_id: string;
  patient_name: string;
  uhid: string;
  rx_number: string;
  pharmacy_status: PharmacyQueueDisplayStatus;
  visit_status: PharmacyVisitWorkflowStatus;
  visit_date: string;
  visit_time: string;
  doctor_id: string;
  doctor_name: string;
  queued_at: string | null;
  priority: 'routine' | 'stat' | null;
};

export type PharmacyPrescriptionQueueParams = {
  date_from: string;
  date_to: string;
  doctor_id?: string;
  visit_status?: PharmacyVisitWorkflowStatus;
  pharmacy_status?: PharmacyQueueDisplayStatus;
  q?: string;
  page: number;
  page_size: number;
};

export type PharmacyPrescriptionQueueResponse = {
  items: PharmacyPrescriptionQueueRow[];
  total: number;
  page: number;
  page_size: number;
};
