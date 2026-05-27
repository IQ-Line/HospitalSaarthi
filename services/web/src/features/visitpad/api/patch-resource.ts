import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadInvalidationKeysForCatalogBasePath } from './query-keys';

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
      for (const queryKey of visitpadInvalidationKeysForCatalogBasePath(basePath)) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });
}
