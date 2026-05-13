import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadKeys } from './query-keys';

/** Soft-delete (or catalog delete) for Visitpad `DELETE /{id}` endpoints. */
export function useVisitpadDelete(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: unknown }>(`${basePath}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: visitpadKeys.all });
    },
  });
}
