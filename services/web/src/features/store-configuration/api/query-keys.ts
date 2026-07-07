import type { StoreListParams } from '../types';

export const storeConfigurationQueryKeys = {
  all: ['store-configuration'] as const,
  list: (params: StoreListParams) => [...storeConfigurationQueryKeys.all, 'list', params] as const,
};
