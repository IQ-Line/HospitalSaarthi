import type { ServicesListParams } from '../types';

export const billingKeys = {
  all: ['billing'] as const,
  servicesRoot: () => [...billingKeys.all, 'services'] as const,
  servicesList: (params: ServicesListParams) =>
    [...billingKeys.servicesRoot(), 'list', params] as const,
};
