import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClientGlobalCatalogRead } from '@/lib/api-client';
import { filterRoleTypePicklistForPrincipal } from '@/lib/role-type-picklist';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import type { PicklistListResponse, PicklistValueListResponse } from '../types';
import { masterDataKeys } from './query-keys';

const BASE = '/api/v1/master-data/picklists';

export const ROLE_TYPES_PICKLIST_SLUG = 'role-types';
export const VISIT_TYPES_PICKLIST_SLUG = 'visit-types';

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

/** Role types for User Management — filtered by login role (global vs tenant staff). */
export function useRoleTypePicklistValues(enabled = true) {
  const principalRoles = usePermissionsStore((s) => s.roles);
  const authRoles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isPlatformSuperAdmin = resolvePlatformSuperAdmin({
    principalRoles,
    authRoles,
    accessToken,
  });

  const query = usePicklistValues(ROLE_TYPES_PICKLIST_SLUG, enabled);

  const data = useMemo(
    () =>
      query.data
        ? filterRoleTypePicklistForPrincipal(query.data, { isPlatformSuperAdmin })
        : undefined,
    [query.data, isPlatformSuperAdmin],
  );

  return { ...query, data };
}

/** Visit types for frontdesk registration intake. */
export function useVisitTypePicklistValues(enabled = true) {
  return usePicklistValues(VISIT_TYPES_PICKLIST_SLUG, enabled);
}
