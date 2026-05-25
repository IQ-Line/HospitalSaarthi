import { useQuery } from '@tanstack/react-query';
import { apiClient, apiClientGlobalCatalogRead } from '@/lib/api-client';
import { masterDataKeys } from './query-keys';
import type { PicklistListResponse, PicklistValueListResponse } from '../types';

const BASE = '/api/v1/master-data/picklists';

const ROLE_TYPES_SLUG = 'role-types';

export function usePicklists(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: masterDataKeys.picklists(),
    queryFn: () => apiClient<PicklistListResponse>(BASE),
    enabled: options?.enabled ?? true,
  });
}

export function usePicklistValues(
  picklistId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: masterDataKeys.picklistValues(picklistId),
    queryFn: () =>
      apiClient<PicklistValueListResponse>(`${BASE}/${picklistId}/values`),
    enabled: (options?.enabled ?? true) && !!picklistId,
  });
}

export function usePicklistValuesBySlug(picklistSlug: string, enabled = true) {
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

/** Loads active values from the platform `role-types` picklist for role editor dropdowns. */
export function useRoleTypePicklistValues(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const valuesQuery = usePicklistValuesBySlug(ROLE_TYPES_SLUG, enabled);

  return {
    options: valuesQuery.data ?? [],
    isLoading: valuesQuery.isLoading,
    error: valuesQuery.error,
  };
}
