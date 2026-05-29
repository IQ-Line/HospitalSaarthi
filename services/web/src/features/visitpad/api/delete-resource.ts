import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadInvalidationKeysForCatalogBasePath } from './query-keys';

/** Soft-delete (or catalog delete) for Visitpad `DELETE /{id}` endpoints. */
export function useVisitpadDelete(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: unknown }>(`${basePath}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      for (const queryKey of visitpadInvalidationKeysForCatalogBasePath(basePath)) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });
}
