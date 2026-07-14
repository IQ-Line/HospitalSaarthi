import {
  DEMO_PATIENT_SEARCH_RESULTS,
  DEMO_PHARMACY_DASHBOARD_STATS,
  DEMO_PRESCRIPTION_CARDS,
  DEMO_PRESCRIPTION_QUEUE_ROWS,
  DEMO_STOCK_ITEMS,
  DEMO_VISIT_OPTIONS,
} from '../data/pharmacy-demo-data';
import type { PharmacyDashboardStats } from '../types/dashboard-ui.types';
import type {
  DispensePatientSearchResult,
  DispensePrescriptionCard,
  DispenseVisitOption,
} from '../types/dispense-ui.types';
import type {
  PharmacyPrescriptionQueueParams,
  PharmacyPrescriptionQueueResponse,
} from '../types/queue-ui.types';

const MOCK_DELAY_MS = 280;

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

/** Swap for GET /pharmacy/v1/dashboard or similar when API is ready. */
export async function fetchPharmacyDashboardMock(): Promise<PharmacyDashboardStats> {
  return delay({ ...DEMO_PHARMACY_DASHBOARD_STATS });
}

/** Swap this module for `fetchPharmacyQueue` when API is ready. */
export async function fetchPrescriptionQueueMock(
  params: PharmacyPrescriptionQueueParams,
): Promise<PharmacyPrescriptionQueueResponse> {
  let items = [...DEMO_PRESCRIPTION_QUEUE_ROWS];

  if (params.doctor_id) {
    items = items.filter((row) => row.doctor_id === params.doctor_id);
  }
  if (params.visit_status) {
    items = items.filter((row) => row.visit_status === params.visit_status);
  }
  if (params.pharmacy_status) {
    items = items.filter((row) => row.pharmacy_status === params.pharmacy_status);
  }
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    items = items.filter(
      (row) =>
        row.patient_name.toLowerCase().includes(q) ||
        row.uhid.toLowerCase().includes(q) ||
        row.formatted_visit_id.toLowerCase().includes(q) ||
        row.rx_number.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (params.page - 1) * params.page_size;
  const pageItems = items.slice(start, start + params.page_size);

  return delay({
    items: pageItems,
    total,
    page: params.page,
    page_size: params.page_size,
  });
}

export async function searchDispensePatientsMock(
  query: string,
): Promise<DispensePatientSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return delay([]);

  const results = DEMO_PATIENT_SEARCH_RESULTS.filter((patient) => {
    const haystack = [
      patient.first_name,
      patient.last_name,
      patient.uhid,
      patient.mrn,
      patient.phone,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return delay(results);
}

export async function fetchPatientPrescriptionsMock(
  patientId: string,
): Promise<DispensePrescriptionCard[]> {
  return delay(DEMO_PRESCRIPTION_CARDS[patientId] ?? []);
}

export async function fetchPatientVisitsMock(
  patientId: string,
): Promise<DispenseVisitOption[]> {
  return delay(DEMO_VISIT_OPTIONS[patientId] ?? []);
}

export type DemoStockItem = (typeof DEMO_STOCK_ITEMS)[number];

export async function searchStockItemsMock(query: string): Promise<DemoStockItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return delay([]);

  const results = DEMO_STOCK_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q),
  );
  return delay(results);
}
