import { useState } from 'react';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useDeactivateUser } from '@/features/user-management/api/mutations';
import {
  roleListOptions,
  userCapabilitiesOptions,
  userDetailOptions,
  useUserDetailSuspense,
} from '@/features/user-management/api/queries';
import { EditUserDialog } from '@/features/user-management/components/edit-user-dialog';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { UserAccessPanel } from '@/features/user-management/components/user-access-panel';
import {
  canManageUserAccess,
  canReadRoleCapabilities,
  canReadRoles,
  canViewUserRoleAccess,
  canWriteUsers,
} from '@/features/user-management/lib/um-permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/$userId')({
  beforeLoad: () => {
    if (!usePermissionsStore.getState().hasFeaturePermission(UM, 'users', 'read')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async ({ context, params }) => {
    const permissions = usePermissionsStore.getState();
    const loads: Array<Promise<unknown>> = [
      context.queryClient.ensureQueryData(userDetailOptions(params.userId)),
    ];
    if (
      permissions.hasFeaturePermission(UM, 'userAccess', 'read') ||
      permissions.hasFeaturePermission(UM, 'userAccess', 'write')
    ) {
      loads.push(context.queryClient.ensureQueryData(userCapabilitiesOptions(params.userId)));
    }
    if (permissions.hasFeaturePermission(UM, 'roles', 'read') === true) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user } = useUserDetailSuspense(userId);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const {
    canWriteProfile,
    showUserRoleAccess,
    canReadRolesList,
    canReadRoleCaps,
    canManageAccess,
  } = usePermissionsStore(
    useShallow((s) => ({
      canWriteProfile: canWriteUsers(s),
      showUserRoleAccess: canViewUserRoleAccess(s),
      canReadRolesList: canReadRoles(s),
      canReadRoleCaps: canReadRoleCapabilities(s),
      canManageAccess: canManageUserAccess(s),
    })),
  );
  const deactivate = useDeactivateUser(userId);

  return (
    <>
      <UserManagementPageShell
        section="users"
        breadcrumbLabel={user.full_name}
        title={user.full_name}
        description={[user.email, user.username ? `@${user.username}` : null]
          .filter(Boolean)
          .join(' · ')}
        pageContext={
          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
            {user.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/user-management" search={{ q: '', createUser: false }}>
                Back
              </Link>
            </Button>
            {canWriteProfile ? (
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
            ) : null}
            {canWriteProfile && user.status === 'active' ? (
              <Button type="button" variant="destructive" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            ) : null}
          </div>
        }
      >
        <UserAccessPanel
          userId={user.id}
          canViewUserAccess={showUserRoleAccess}
          canReadRoles={canReadRolesList}
          canReadRoleCapabilities={canReadRoleCaps}
          canManageAccess={canManageAccess}
        />
      </UserManagementPageShell>

      {canWriteProfile ? (
        <EditUserDialog open={editOpen} onOpenChange={setEditOpen} user={user} />
      ) : null}

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate this user?"
        description={`${user.full_name} will no longer be able to sign in.`}
        confirmLabel={deactivate.isPending ? 'Deactivating...' : 'Deactivate'}
        destructive
        onConfirm={() => {
          deactivate.mutate(undefined, {
            onSuccess: () => setDeactivateOpen(false),
          });
        }}
      />
    </>
  );
}
