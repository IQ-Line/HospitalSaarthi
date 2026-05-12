import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadKeys } from './query-keys';

/** Generic POST for Visitpad catalog create bodies. */
export function useVisitpadPost(basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient<{ data: unknown }>(basePath, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: visitpadKeys.all });
    },
  });
}
