import { createFileRoute, redirect } from '@tanstack/react-router';
import { usePermissionsStore } from '@/stores/permissions.store';
import { roleListOptions } from '@/features/user-management/api/queries';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { RoleManagementPanel } from '@/features/user-management/components/role-management-panel';
import {
  canAccessRolesAdmin,
  canAccessUsersSection,
  canCreateRoles,
  canDeleteRoles,
  canReadCapabilities,
  canReadRoles,
  canUpdateRoles,
} from '@/features/user-management/lib/um-permissions';

export const Route = createFileRoute('/_authenticated/user-management/roles')({
  beforeLoad: () => {
    const permissions = usePermissionsStore.getState();
    if (!canAccessRolesAdmin(permissions)) {
      if (canAccessUsersSection(permissions)) {
        throw redirect({ to: '/user-management', search: { q: '' } });
      }
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(roleListOptions()),
  component: UserManagementRolesPage,
});

function UserManagementRolesPage() {
  const canAccessAdmin = usePermissionsStore(canAccessRolesAdmin);
  const canRead = usePermissionsStore(canReadRoles);
  const canReadCapabilityCatalog = usePermissionsStore(canReadCapabilities);
  const canCreate = usePermissionsStore(canCreateRoles);
  const canUpdate = usePermissionsStore(canUpdateRoles);
  const canDelete = usePermissionsStore(canDeleteRoles);

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <UserManagementPageShell
      section="roles"
      title="Roles"
      description="Set up roles and choose what each role allows people to do."
    >
      <RoleManagementPanel
        canReadRoles={canRead}
        canCreateRoles={canCreate}
        canUpdateRoles={canUpdate}
        canDeleteRoles={canDelete}
        canReadCapabilities={canReadCapabilityCatalog}
      />
    </UserManagementPageShell>
  );
}
