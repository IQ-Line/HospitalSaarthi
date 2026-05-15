import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { PageHeader } from '@/components/page-header';
import { useDeactivateUser } from '@/features/user-management/api/mutations';
import {
  roleListOptions,
  userDetailOptions,
  useUserDetailSuspense,
} from '@/features/user-management/api/queries';
import { RoleAssignmentPanel } from '@/features/user-management/components/role-assignment-panel';
import { UserEditForm } from '@/features/user-management/components/user-edit-form';
import { useAuthStore } from '@/stores/auth.store';
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
    if (permissions.hasFeaturePermission(UM, 'roles', 'read')) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user } = useUserDetailSuspense(userId);
  const sessionUserId = useAuthStore((s) => s.userId);
  const { canWriteProfile, canViewRoles, canAssignRole } = usePermissionsStore(
    useShallow((s) => ({
      canWriteProfile: s.hasFeaturePermission(UM, 'users', 'write'),
      canViewRoles: s.hasFeaturePermission(UM, 'roles', 'read'),
      canAssignRole:
        s.hasFeaturePermission(UM, 'roles', 'read') &&
        s.hasFeaturePermission(UM, 'roleAssignments', 'write'),
    })),
  );
  const deactivate = useDeactivateUser(userId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={user.full_name}
        description={`User id ${user.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/user-management" search={{ q: '' }}>
                Back to list
              </Link>
            </Button>
            {canWriteProfile && user.status === 'active' ? (
              <Button
                variant="destructive"
                type="button"
                disabled={deactivate.isPending}
                onClick={() => deactivate.mutate()}
              >
                Deactivate
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status}</Badge>
        {user.email && <span>{user.email}</span>}
        {user.username && (
          <span>
            @{user.username}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm max-w-2xl">
        <div>
          <dt className="text-muted-foreground">Department</dt>
          <dd>{user.department ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Clearance tier</dt>
          <dd>{user.clearance_tier_required ?? 0}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organization id</dt>
          <dd className="font-mono text-xs break-all">{user.org_id ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Auth user id</dt>
          <dd className="font-mono text-xs break-all">{user.auth_user_id ?? '—'}</dd>
        </div>
      </dl>

      {canWriteProfile ? <UserEditForm user={user} /> : null}

      <RoleAssignmentPanel
        userId={user.id}
        sessionUserId={sessionUserId}
        canViewRoles={canViewRoles}
        canAssignRole={canAssignRole}
      />
    </div>
  );
}
