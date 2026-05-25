import type { BillsListParams, ServicesListParams } from '../types';

export const billingKeys = {
  all: ['billing'] as const,
  servicesRoot: () => [...billingKeys.all, 'services'] as const,
  servicesList: (params: ServicesListParams) =>
    [...billingKeys.servicesRoot(), 'list', params] as const,
  billsRoot: () => [...billingKeys.all, 'bills'] as const,
  billsList: (params: BillsListParams) => [...billingKeys.billsRoot(), 'list', params] as const,
};
