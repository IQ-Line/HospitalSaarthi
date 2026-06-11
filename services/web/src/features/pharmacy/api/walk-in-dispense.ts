import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SaveWalkInDispenseInput, WalkInDispenseResponse } from '../types';
import { pharmacyQueryKeys } from './query-keys';

const BASE = '/api/pharmacy/v1/walk-in-dispense-orders';

export async function fetchWalkInDispense(recordId: string): Promise<WalkInDispenseResponse> {
  return apiClient<WalkInDispenseResponse>(`${BASE}/${encodeURIComponent(recordId)}`);
}

export async function createWalkInDispense(
  body: SaveWalkInDispenseInput,
): Promise<WalkInDispenseResponse> {
  return apiClient<WalkInDispenseResponse>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateWalkInDispense(
  recordId: string,
  body: SaveWalkInDispenseInput,
): Promise<WalkInDispenseResponse> {
  return apiClient<WalkInDispenseResponse>(`${BASE}/${encodeURIComponent(recordId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function useWalkInDispense(recordId: string | undefined) {
  return useQuery({
    queryKey: pharmacyQueryKeys.walkInDispense(recordId ?? ''),
    queryFn: () => fetchWalkInDispense(recordId!),
    enabled: Boolean(recordId?.trim()),
  });
}

export function useSaveWalkInDispense(recordId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveWalkInDispenseInput) =>
      recordId ? updateWalkInDispense(recordId, body) : createWalkInDispense(body),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.walkInDispense(data.record_id) }),
        queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.all }),
      ]);
    },
  });
}
