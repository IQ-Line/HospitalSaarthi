import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { visitpadInvalidationKeysAfterPlatformImport } from './query-keys';

export type VisitpadPlatformImportResult = {
  created: string[];
  skipped: string[];
  errors: { platform_row_id: string; message: string }[];
};

/** POST …/visitpad{importPath} with body `{ platform_row_ids }` (max 200). Example: `/units/import-from-platform`. */
export function useVisitpadPlatformImport(importPath: string) {
  const qc = useQueryClient();
  const url = `/api/v1/master-data/visitpad${importPath}`;
  return useMutation({
    mutationFn: (platform_row_ids: string[]) =>
      apiClient<{ data: VisitpadPlatformImportResult }>(url, {
        method: 'POST',
        body: JSON.stringify({ platform_row_ids }),
      }),
    onSuccess: () => {
      for (const queryKey of visitpadInvalidationKeysAfterPlatformImport(importPath)) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });
}

export function useVisitpadRxColumnsPlatformImport(section: string) {
  const q = new URLSearchParams({ section });
  return useVisitpadPlatformImport(`/rx-columns/import-from-platform?${q.toString()}`);
}
