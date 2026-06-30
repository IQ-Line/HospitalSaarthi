import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryMastersApiContext } from '@/features/inventory-masters/lib/inventory-catalog-api-context';
import { apiClient } from '@/lib/api-client';
import { inventoryMastersQueryKeys } from './query-keys';

function invalidateInventoryMasters(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: inventoryMastersQueryKeys.all });
}

export function useInventoryMasterPost(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient<{ data: unknown }>(
        basePath,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        inventoryMastersApiContext(),
      ),
    onSuccess: () => invalidateInventoryMasters(qc),
  });
}

export function useInventoryMasterPatch(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiClient<{ data: unknown }>(
        `${basePath}/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
        inventoryMastersApiContext(),
      ),
    onSuccess: () => invalidateInventoryMasters(qc),
  });
}

export function useInventoryMasterDelete(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: unknown }>(
        `${basePath}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
        inventoryMastersApiContext(),
      ),
    onSuccess: () => invalidateInventoryMasters(qc),
  });
}
