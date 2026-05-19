import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingKeys } from './query-keys';
import {
  createTariffService,
  listTariffServices,
  updateTariffService,
} from './tariff-client';
import type { ServiceCreateInput, ServiceUpdateInput } from '../types';

export function useTariffServices(params: Parameters<typeof listTariffServices>[0]) {
  return useQuery({
    queryKey: billingKeys.servicesList(params),
    queryFn: () => listTariffServices(params),
  });
}

export function useCreateTariffService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceCreateInput) => createTariffService(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}

export function useUpdateTariffService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceUpdateInput }) =>
      updateTariffService(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.servicesRoot() });
    },
  });
}
