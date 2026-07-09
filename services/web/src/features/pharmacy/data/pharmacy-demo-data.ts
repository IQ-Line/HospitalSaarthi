import type {
  DispensePatientSearchResult,
  DispensePrescriptionCard,
  DispenseVisitOption,
} from '../types/dispense-ui.types';
import type { PharmacyDashboardStats } from '../types/dashboard-ui.types';
import type { PharmacyPrescriptionQueueRow } from '../types/queue-ui.types';

/** Hardcoded dashboard KPIs — replace with pharmacy-svc aggregate API. */
export const DEMO_PHARMACY_DASHBOARD_STATS: PharmacyDashboardStats = {
  open_queue_count: 22,
  low_stock_batches: 2,
  active_store_name: 'Central Medical Store',
};

/** Demo stock items for issued-items search — replace with inventory API. */
export const DEMO_STOCK_ITEMS = [
  {
    id: 'med-001',
    code: 'PAR500',
    name: 'Paracetamol 500mg Tab',
    available: 240,
    batch: 'B2026-01',
    mrp: '2.50',
  },
  {
    id: 'med-002',
    code: 'AMX250',
    name: 'Amoxicillin 250mg Cap',
    available: 86,
    batch: 'B2026-03',
    mrp: '8.00',
  },
  {
    id: 'med-003',
    code: 'CET10',
    name: 'Cetirizine 10mg Tab',
    available: 120,
    batch: 'B2025-11',
    mrp: '3.25',
  },
  {
    id: 'med-004',
    code: 'OME20',
    name: 'Omeprazole 20mg Cap',
    available: 64,
    batch: 'B2026-02',
    mrp: '12.00',
  },
] as const;

export const DEMO_PATIENT_SEARCH_RESULTS: DispensePatientSearchResult[] = [
  {
    id: 'pat-demo-001',
    first_name: 'Rahul',
    last_name: 'Sharma',
    uhid: 'UHID-2026-00421',
    mrn: 'MRN-8821',
    phone: '9876543210',
    gender: 'male',
    date_of_birth: '1990-05-14',
    email: 'rahul.sharma@example.com',
  },
  {
    id: 'pat-demo-002',
    first_name: 'Priya',
    last_name: 'Verma',
    uhid: 'UHID-2026-00318',
    mrn: 'MRN-7712',
    phone: '9123456780',
    gender: 'female',
    date_of_birth: '1985-11-02',
    email: 'priya.verma@example.com',
  },
];

export const DEMO_PRESCRIPTION_CARDS: Record<string, DispensePrescriptionCard[]> = {
  'pat-demo-001': [
    {
      id: 'rx-001',
      label: 'OPD Visit — 07 Jul 2026',
      doctor_name: 'Dr. Anil Kapoor',
      issued: false,
      vitals: 'BP 120/80, Temp 98.4°F',
      complaints: 'Fever, body ache',
      diagnosis: 'Viral fever',
      medicines: [
        { name: 'Paracetamol 500mg', dosage: '1-0-1', duration: '3 days' },
        { name: 'Cetirizine 10mg', dosage: '0-0-1', duration: '5 days' },
      ],
    },
  ],
  'pat-demo-002': [
    {
      id: 'rx-002',
      label: 'OPD Visit — 06 Jul 2026',
      doctor_name: 'Dr. Meera Singh',
      issued: true,
      vitals: 'BP 118/76',
      complaints: 'Sore throat',
      diagnosis: 'Pharyngitis',
      medicines: [
        { name: 'Amoxicillin 250mg', dosage: '1-0-1', duration: '5 days' },
      ],
    },
  ],
};

export const DEMO_VISIT_OPTIONS: Record<string, DispenseVisitOption[]> = {
  'pat-demo-001': [
    { id: 'visit-001', label: 'Load from visit V-2026-0712' },
    { id: 'visit-002', label: 'Load from visit V-2026-0688' },
  ],
};

const today = new Date().toISOString().slice(0, 10);

export const DEMO_PRESCRIPTION_QUEUE_ROWS: PharmacyPrescriptionQueueRow[] = [
  {
    visit_id: 'visit-001',
    formatted_visit_id: 'V-2026-0712',
    patient_id: 'pat-demo-001',
    patient_name: 'Rahul Sharma',
    uhid: 'UHID-2026-00421',
    rx_number: 'RX-2026-1184',
    pharmacy_status: 'pending',
    visit_status: 'consulted',
    visit_date: today,
    visit_time: '10:30',
    doctor_id: 'doc-001',
    doctor_name: 'Dr. Anil Kapoor',
    queued_at: `${today}T10:45:00.000Z`,
    priority: 'routine',
  },
  {
    visit_id: 'visit-002',
    formatted_visit_id: 'V-2026-0688',
    patient_id: 'pat-demo-002',
    patient_name: 'Priya Verma',
    uhid: 'UHID-2026-00318',
    rx_number: 'RX-2026-1172',
    pharmacy_status: 'partial',
    visit_status: 'consulted',
    visit_date: today,
    visit_time: '09:15',
    doctor_id: 'doc-002',
    doctor_name: 'Dr. Meera Singh',
    queued_at: `${today}T09:30:00.000Z`,
    priority: 'stat',
  },
  {
    visit_id: 'visit-003',
    formatted_visit_id: 'V-2026-0701',
    patient_id: 'pat-demo-003',
    patient_name: 'Amit Patel',
    uhid: 'UHID-2026-00290',
    rx_number: '—',
    pharmacy_status: 'no_queued',
    visit_status: 'registered',
    visit_date: today,
    visit_time: '11:00',
    doctor_id: 'doc-001',
    doctor_name: 'Dr. Anil Kapoor',
    queued_at: null,
    priority: null,
  },
  {
    visit_id: 'visit-004',
    formatted_visit_id: 'V-2026-0695',
    patient_id: 'pat-demo-004',
    patient_name: 'Sneha Gupta',
    uhid: 'UHID-2026-00155',
    rx_number: 'RX-2026-1160',
    pharmacy_status: 'dispensed',
    visit_status: 'consulted',
    visit_date: today,
    visit_time: '08:45',
    doctor_id: 'doc-003',
    doctor_name: 'Dr. Rajesh Kumar',
    queued_at: `${today}T08:50:00.000Z`,
    priority: 'routine',
  },
];

export const DEMO_DOCTORS = [
  { id: 'doc-001', name: 'Dr. Anil Kapoor' },
  { id: 'doc-002', name: 'Dr. Meera Singh' },
  { id: 'doc-003', name: 'Dr. Rajesh Kumar' },
] as const;
