import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { useDeactivateUser } from '@/features/user-management/api/mutations';
import {
  capabilityListOptions,
  roleListOptions,
  userDetailOptions,
  useUserDetailSuspense,
} from '@/features/user-management/api/queries';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { UserAccessPanel } from '@/features/user-management/components/user-access-panel';
import { UserManagementSectionCard } from '@/features/user-management/components/user-management-section-card';
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
    if (permissions.hasFeaturePermission(UM, 'capabilities', 'read')) {
      loads.push(context.queryClient.ensureQueryData(capabilityListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user } = useUserDetailSuspense(userId);
  const sessionUserId = useAuthStore((s) => s.userId);
  const { canWriteProfile, canReadRoleTemplates, canReadCapabilities, canManageAccess } = usePermissionsStore(
    useShallow((s) => ({
      canWriteProfile: s.hasFeaturePermission(UM, 'users', 'write'),
      canReadRoleTemplates: s.hasFeaturePermission(UM, 'roles', 'read'),
      canReadCapabilities: s.hasFeaturePermission(UM, 'capabilities', 'read'),
      canManageAccess: s.hasFeaturePermission(UM, 'userAccess', 'write'),
    })),
  );
  const deactivate = useDeactivateUser(userId);

  return (
    <UserManagementPageShell
      section="users"
      breadcrumbLabel={user.full_name}
      title={user.full_name}
      description={`User id ${user.id}`}
      pageContext={
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status}</Badge>
          {user.email ? <span>{user.email}</span> : null}
          {user.username ? <span>@{user.username}</span> : null}
        </div>
      }
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
    >
      <UserManagementSectionCard
        title="Identity and tenancy snapshot"
        description="Quick profile facts for support, access reviews, and tenant-scoped troubleshooting."
        contentClassName="pt-0"
      >
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
            <dd className="break-all font-mono text-xs">{user.org_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auth user id</dt>
            <dd className="break-all font-mono text-xs">{user.auth_user_id ?? '—'}</dd>
          </div>
        </dl>
      </UserManagementSectionCard>

      {canWriteProfile ? <UserEditForm user={user} /> : null}

      <UserAccessPanel
        userId={user.id}
        sessionUserId={sessionUserId}
        canReadRoleTemplates={canReadRoleTemplates}
        canReadCapabilities={canReadCapabilities}
        canManageAccess={canManageAccess}
      />
    </UserManagementPageShell>
  );
}
