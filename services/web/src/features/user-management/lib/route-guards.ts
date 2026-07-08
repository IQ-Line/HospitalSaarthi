import { redirect } from '@tanstack/react-router';
import { UM_ROLES_ADMIN_ANY, UM_USERS_SECTION_ANY } from '@/lib/runtime-capability-keys';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * `beforeLoad` guard for the `user-management/roles` route. Requires any
 * roles-admin capability; otherwise redirects to the users section when that is
 * reachable, else to the dashboard. Lives here (not inline in the route) so the
 * route and its unit test exercise the SAME logic instead of a re-implemented copy.
 */
export function guardRolesAdminRoute(): void {
  const p = usePermissionsStore.getState();
  if (!p.hasAnyCapability(UM_ROLES_ADMIN_ANY)) {
    if (p.hasAnyCapability(UM_USERS_SECTION_ANY)) {
      throw redirect({ to: '/user-management', search: { q: '', createUser: false } });
    }
    throw redirect({ to: '/dashboard' });
  }
}
