import { useState } from 'react';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { requireCapability } from '@/lib/require-capabilities';
import {
  UM_ROLE_ASSIGN,
  UM_ROLE_READ,
  UM_USER_DEACTIVATE,
  UM_USER_READ,
  UM_USER_UPDATE,
} from '@/lib/runtime-capability-keys';
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
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/user-management/$userId')({
  beforeLoad: requireCapability(UM_USER_READ),
  loader: async ({ context, params }) => {
    const p = usePermissionsStore.getState();
    const loads: Array<Promise<unknown>> = [
      context.queryClient.ensureQueryData(userDetailOptions(params.userId)),
    ];
    if (p.hasCapability(UM_ROLE_ASSIGN) || p.hasCapability(UM_ROLE_READ)) {
      loads.push(context.queryClient.ensureQueryData(userCapabilitiesOptions(params.userId)));
    }
    if (p.hasCapability(UM_ROLE_READ)) {
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

  const umUserUpdate = useCapability(UM_USER_UPDATE);
  const umUserDeactivate = useCapability(UM_USER_DEACTIVATE);
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
            <CapabilityGate capability={UM_USER_UPDATE}>
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
            </CapabilityGate>
            {umUserDeactivate && user.status === 'active' ? (
              <CapabilityGate capability={UM_USER_DEACTIVATE}>
                <Button type="button" variant="destructive" onClick={() => setDeactivateOpen(true)}>
                  Deactivate
                </Button>
              </CapabilityGate>
            ) : null}
          </div>
        }
      >
        <UserAccessPanel userId={user.id} />
      </UserManagementPageShell>

      {umUserUpdate ? (
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
