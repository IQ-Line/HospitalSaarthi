import { useQuery } from '@tanstack/react-query';
import { apiClientGlobalCatalogRead } from '@/lib/api-client';
import type { PicklistListResponse, PicklistValueListResponse } from '../types';
import { masterDataKeys } from './query-keys';

const BASE = '/api/v1/master-data/picklists';

export function usePicklistValues(picklistSlug: string, enabled = true) {
  return useQuery({
    queryKey: [...masterDataKeys.picklistsRoot(), picklistSlug] as const,
    enabled: enabled && picklistSlug.length > 0,
    queryFn: async () => {
      const { data: picklists } =
        await apiClientGlobalCatalogRead<PicklistListResponse>(BASE);
      const picklist = picklists.find((p) => p.slug === picklistSlug);
      if (!picklist) return [];
      const { data: values } = await apiClientGlobalCatalogRead<PicklistValueListResponse>(
        `${BASE}/${picklist.id}/values`,
      );
      return values.filter((v) => v.is_active);
    },
  });
}
