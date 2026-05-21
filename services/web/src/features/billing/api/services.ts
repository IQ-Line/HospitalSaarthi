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
  options?: { enabled?: boolean; iqTenantId?: string; forceLive?: boolean },
) {
  const iqTenantId = options?.iqTenantId;
  const forceLive = options?.forceLive;
  return useQuery({
    queryKey: [...billingKeys.servicesList(params), iqTenantId ?? 'session', forceLive ?? false],
    queryFn: () => listTariffServices(params, iqTenantId, { forceLive }),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTariffService(
  iqTenantId?: string,
  options?: { forceLive?: boolean },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceCreateInput) =>
      createTariffService(input, iqTenantId, { forceLive: options?.forceLive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}

export function useUpdateTariffService(
  iqTenantId?: string,
  options?: { forceLive?: boolean },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceUpdateInput }) =>
      updateTariffService(id, input, iqTenantId, { forceLive: options?.forceLive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}
