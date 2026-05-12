import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadKeys } from './query-keys';

/** Generic PATCH for Visitpad catalog rows (`{ is_active }`, etc.). */
export function useVisitpadPatch(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiClient<{ data: unknown }>(`${basePath}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: visitpadKeys.all });
    },
  });
}
