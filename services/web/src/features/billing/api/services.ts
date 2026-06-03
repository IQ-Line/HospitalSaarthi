import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingKeys } from './query-keys';
import {
  createTariffService,
  listTariffServices,
  updateTariffService,
} from './tariff-client';
import type { ServiceCreateInput, ServiceUpdateInput } from '../types';

export function useTariffServices(
  params: Parameters<typeof listTariffServices>[0],
  options?: { enabled?: boolean; iqTenantId?: string },
) {
  const iqTenantId = options?.iqTenantId;
  return useQuery({
    queryKey: [...billingKeys.servicesList(params), iqTenantId ?? 'session'],
    queryFn: () => listTariffServices(params, iqTenantId),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTariffService(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceCreateInput) =>
      createTariffService(input, iqTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}

export function useUpdateTariffService(iqTenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceUpdateInput }) =>
      updateTariffService(id, input, iqTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}
