import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
  options?: { enabled?: boolean; limit?: number },
) {
  const limit = options?.limit ?? 50;
  return useQuery({
    queryKey: masterDataKeys.picklistValues(picklistId, limit),
    queryFn: () =>
      apiClient<PicklistValueListResponse>(
        `${BASE}/${picklistId}/values?limit=${limit}&offset=0`,
      ),
    enabled: (options?.enabled ?? true) && !!picklistId,
  });
}

/** Resolves `role-types` picklist id, then loads its values for role-type dropdowns. */
export function useRoleTypePicklistValues(options?: { enabled?: boolean }) {
  const picklistsQuery = usePicklists(options);
  const roleTypesPicklist = picklistsQuery.data?.data.find(
    (p) => p.slug === ROLE_TYPES_SLUG,
  );
  const valuesQuery = usePicklistValues(roleTypesPicklist?.id, {
    enabled: (options?.enabled ?? true) && !!roleTypesPicklist?.id,
  });

  return {
    picklistsQuery,
    valuesQuery,
    roleTypesPicklistId: roleTypesPicklist?.id,
    options: valuesQuery.data?.data ?? [],
    isLoading: picklistsQuery.isLoading || valuesQuery.isLoading,
    error: picklistsQuery.error ?? valuesQuery.error,
  };
}
import { apiClientGlobalCatalogRead } from '@/lib/api-client';

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
