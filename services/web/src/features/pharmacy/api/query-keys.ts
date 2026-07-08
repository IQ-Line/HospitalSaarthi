import type { PharmacyQueueListParams } from '../types';
import type { PharmacyPrescriptionQueueParams } from '../types/queue-ui.types';
import type {
  IndentRequestListParams,
  PharmacyLowStockListParams,
} from '../types/replenishment-ui.types';

export const pharmacyQueryKeys = {
  all: ['pharmacy'] as const,
  dashboard: () => [...pharmacyQueryKeys.all, 'dashboard'] as const,
  queue: (params: PharmacyQueueListParams) =>
    [...pharmacyQueryKeys.all, 'queue', params] as const,
  prescriptionQueue: (params: PharmacyPrescriptionQueueParams) =>
    [...pharmacyQueryKeys.all, 'prescription-queue', params] as const,
  lowStock: (params: PharmacyLowStockListParams) =>
    [...pharmacyQueryKeys.all, 'replenishment', 'low-stock', params] as const,
  indentRequests: (params: IndentRequestListParams) =>
    [...pharmacyQueryKeys.all, 'replenishment', 'indents', params] as const,
  replenishmentStores: () => [...pharmacyQueryKeys.all, 'replenishment', 'stores'] as const,
  indentItemSearch: (query: string) =>
    [...pharmacyQueryKeys.all, 'replenishment', 'item-search', query] as const,
  dispense: (visitId: string) => [...pharmacyQueryKeys.all, 'dispense', visitId] as const,
  walkInDispense: (recordId: string) =>
    [...pharmacyQueryKeys.all, 'walk-in-dispense', recordId] as const,
  patientPrescriptions: (patientId: string) =>
    [...pharmacyQueryKeys.all, 'patient-prescriptions', patientId] as const,
  patientVisits: (patientId: string) =>
    [...pharmacyQueryKeys.all, 'patient-visits', patientId] as const,
};
