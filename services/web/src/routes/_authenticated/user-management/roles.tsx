import { createFileRoute, redirect } from '@tanstack/react-router';
import { usePermissionsStore } from '@/stores/permissions.store';
import { roleListOptions } from '@/features/user-management/api/queries';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { RoleManagementPanel } from '@/features/user-management/components/role-management-panel';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/roles')({
  beforeLoad: () => {
    if (!usePermissionsStore.getState().hasFeaturePermission(UM, 'roles', 'read')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(roleListOptions()),
  component: UserManagementRolesPage,
});

function UserManagementRolesPage() {
  const canReadCapabilities = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM, 'capabilities', 'read'),
  );
  const canWriteRoles = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'roles', 'write'));

  return (
    <UserManagementPageShell
      section="roles"
      title="Role templates"
      description="Create, review, and update role templates that copy capabilities onto users when applied."
    >
      <RoleManagementPanel
        canWriteRoles={canWriteRoles}
        canReadCapabilities={canReadCapabilities}
      />
    </UserManagementPageShell>
  );
}
