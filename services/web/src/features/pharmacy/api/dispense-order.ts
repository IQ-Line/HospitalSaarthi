import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DispenseForVisitResponse, SaveDispenseForVisitInput } from '../types';
import { pharmacyQueryKeys } from './query-keys';

function dispenseOrderPath(visitId: string): string {
  return `/api/pharmacy/v1/visits/${encodeURIComponent(visitId)}/dispense-order`;
}

export async function fetchDispenseForVisit(visitId: string): Promise<DispenseForVisitResponse> {
  return apiClient<DispenseForVisitResponse>(dispenseOrderPath(visitId));
}

export async function saveDispenseForVisit(
  visitId: string,
  body: SaveDispenseForVisitInput,
): Promise<DispenseForVisitResponse> {
  return apiClient<DispenseForVisitResponse>(dispenseOrderPath(visitId), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function useDispenseForVisit(visitId: string) {
  return useQuery({
    queryKey: pharmacyQueryKeys.dispense(visitId),
    queryFn: () => fetchDispenseForVisit(visitId),
    enabled: visitId.trim().length > 0,
  });
}

export function useSaveDispenseForVisit(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveDispenseForVisitInput) => saveDispenseForVisit(visitId, body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(pharmacyQueryKeys.dispense(visitId), saved);
      await queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.all });
    },
  });
}
