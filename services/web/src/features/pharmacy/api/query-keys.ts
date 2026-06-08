import type { PharmacyQueueListParams } from '../types';

export const pharmacyQueryKeys = {
  all: ['pharmacy'] as const,
  queue: (params: PharmacyQueueListParams) =>
    [...pharmacyQueryKeys.all, 'queue', params] as const,
  dispense: (visitId: string) => [...pharmacyQueryKeys.all, 'dispense', visitId] as const,
  walkInDispense: (recordId: string) =>
    [...pharmacyQueryKeys.all, 'walk-in-dispense', recordId] as const,
};
