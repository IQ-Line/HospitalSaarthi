import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { requireCapability } from '@/lib/require-capabilities';
import {
  UM_ROLE_ASSIGN,
  UM_ROLE_READ,
  UM_USER_DELETE,
  UM_USER_READ,
  UM_USER_UPDATE,
} from '@/lib/runtime-capability-keys';
import { useActivateUser, useDeactivateUser } from '@/features/user-management/api/mutations';
import {
  userCapabilitiesOptions,
  userDetailOptions,
  useUserDetailSuspense,
} from '@/features/user-management/api/queries';
import { EditUserDialog } from '@/features/user-management/components/edit-user-dialog';
import { ResetUserPasswordDialog } from '@/features/user-management/components/reset-user-password-dialog';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { UserAccessPanel } from '@/features/user-management/components/user-access-panel';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/user-management/$userId')({
  validateSearch: (search: Record<string, unknown>) => ({
    tenant:
      typeof search.tenant === 'string' && search.tenant.trim().length > 0
        ? search.tenant.trim()
        : undefined,
  }),
  beforeLoad: requireCapability(UM_USER_READ),
  loaderDeps: ({ search }) => ({ tenant: search.tenant }),
  loader: async ({ context, params, deps }) => {
    const p = usePermissionsStore.getState();
    const tenantScope = deps.tenant;
    const loads: Array<Promise<unknown>> = [
      context.queryClient.ensureQueryData(userDetailOptions(params.userId, tenantScope)),
    ];
    if (p.hasCapability(UM_ROLE_ASSIGN) || p.hasCapability(UM_ROLE_READ)) {
      loads.push(
        context.queryClient.ensureQueryData(userCapabilitiesOptions(params.userId, tenantScope)),
      );
    }
    await Promise.all(loads);
  },
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { tenant: tenantScope } = Route.useSearch();
  const { data: user } = useUserDetailSuspense(userId, tenantScope);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const umUserUpdate = useCapability(UM_USER_UPDATE);
  const umUserDelete = useCapability(UM_USER_DELETE);
  const deactivate = useDeactivateUser(userId, tenantScope);
  const activate = useActivateUser(userId, tenantScope);
  const isActive = user.status === 'active';

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
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
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
            <CapabilityGate capability={UM_USER_UPDATE}>
              <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
                Reset password
              </Button>
            </CapabilityGate>
            {umUserDelete && isActive ? (
              <CapabilityGate capability={UM_USER_DELETE}>
                <Button type="button" variant="destructive" onClick={() => setDeactivateOpen(true)}>
                  Deactivate
                </Button>
              </CapabilityGate>
            ) : null}
            {umUserDelete && !isActive ? (
              <CapabilityGate capability={UM_USER_DELETE}>
                <Button type="button" onClick={() => setActivateOpen(true)}>
                  Activate
                </Button>
              </CapabilityGate>
            ) : null}
          </div>
        }
      >
        <UserAccessPanel userId={user.id} tenantScope={tenantScope} />
      </UserManagementPageShell>

      {umUserUpdate ? (
        <EditUserDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          tenantScope={tenantScope}
        />
      ) : null}

      {umUserUpdate ? (
        <ResetUserPasswordDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          userId={user.id}
          userName={user.full_name}
          tenantScope={tenantScope}
        />
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

      <ConfirmDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Activate this user?"
        description={`${user.full_name} will be able to sign in again.`}
        confirmLabel={activate.isPending ? 'Activating...' : 'Activate'}
        onConfirm={() => {
          activate.mutate(undefined, {
            onSuccess: () => setActivateOpen(false),
          });
        }}
      />
    </>
  );
}
