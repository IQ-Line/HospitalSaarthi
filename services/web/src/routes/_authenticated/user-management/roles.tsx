import { createFileRoute, redirect } from '@tanstack/react-router';
import { roleListOptions } from '@/features/user-management/api/queries';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { RoleManagementPanel } from '@/features/user-management/components/role-management-panel';
import { requireAnyCapability } from '@/lib/require-capabilities';
import {
  UM_ROLES_ADMIN_ANY,
  UM_USERS_SECTION_ANY,
} from '@/lib/runtime-capability-keys';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/user-management/roles')({
  beforeLoad: () => {
    const p = usePermissionsStore.getState();
    if (!p.hasAnyCapability(UM_ROLES_ADMIN_ANY)) {
      if (p.hasAnyCapability(UM_USERS_SECTION_ANY)) {
        throw redirect({ to: '/user-management', search: { q: '' } });
      }
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(roleListOptions()),
  component: UserManagementRolesPage,
});

function UserManagementRolesPage() {
  return (
    <UserManagementPageShell
      section="roles"
      title="Roles"
      description="Set up roles and choose what each role allows people to do."
    >
      <RoleManagementPanel />
    </UserManagementPageShell>
  );
}
