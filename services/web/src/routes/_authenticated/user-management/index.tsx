import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { CapabilityGate } from '@/components/capability-gate';
import { DataTable } from '@/components/data-table';
import { useCapability } from '@/hooks/use-capability';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import {
  UM_CAPABILITY_READ,
  UM_ROLE_READ,
  UM_ROLES_ADMIN_ANY,
  UM_USER_CREATE,
  UM_USER_READ,
  UM_USERS_SECTION_ANY,
} from '@/lib/runtime-capability-keys';
import {
  capabilityListOptions,
  roleListOptions,
  userListOptions,
  useUserListSuspense,
} from '@/features/user-management/api/queries';
import { CreateUserForm } from '@/features/user-management/components/create-user-form';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import type { UmUser } from '@/features/user-management/types';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/user-management/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    createUser: search.createUser === true || search.createUser === 'true',
  }),
  beforeLoad: () => {
    const p = usePermissionsStore.getState();
    if (!p.hasAnyCapability(UM_USERS_SECTION_ANY)) {
      if (p.hasAnyCapability(UM_ROLES_ADMIN_ANY)) {
        throw redirect({ to: '/user-management/roles' });
      }
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async ({ context }) => {
    const p = usePermissionsStore.getState();
    const tenantScope = useTenantStore.getState().tenantId;
    const loads: Array<Promise<unknown>> = [];
    if (p.hasCapability(UM_USER_READ)) {
      loads.push(context.queryClient.ensureQueryData(userListOptions(tenantScope)));
    }
    if (p.hasCapability(UM_ROLE_READ)) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions(tenantScope)));
    }
    if (p.hasCapability(UM_CAPABILITY_READ)) {
      loads.push(context.queryClient.ensureQueryData(capabilityListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserManagementIndexPage,
});

function UserManagementIndexPage() {
  const umUserRead = useCapability(UM_USER_READ);
  if (!umUserRead) {
    return <CreateUserOnlyPage />;
  }
  return <UserManagementListPage />;
}

function CreateUserOnlyPage() {
  const [createOpen, setCreateOpen] = useState(true);
  const canSelectTargetTenant = isPlatformSuperAdminFromAccessToken(
    useAuthStore.getState().accessToken,
  );

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="Add a user"
        description="Create a new account for someone in your organization."
        actions={
          <CapabilityGate capability={UM_USER_CREATE}>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add user
            </Button>
          </CapabilityGate>
        }
      >
        <p className="text-sm text-muted-foreground">
          You can add users but not browse the full list.
        </p>
      </UserManagementPageShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <div className="shrink-0 border-b p-4 pb-3">
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Enter their details and choose a role. You can pick which permissions they get.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden p-4">
            <CreateUserForm
              canSelectTargetTenant={canSelectTargetTenant}
              layout="dialog"
              onCancel={() => setCreateOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserManagementListPage() {
  const { q, createUser } = Route.useSearch();
  const navigate = useNavigate();
  const { data: users } = useUserListSuspense();
  const umUserCreate = useCapability(UM_USER_CREATE);
  const umUserRead = useCapability(UM_USER_READ);
  const canSelectTargetTenant = isPlatformSuperAdminFromAccessToken(
    useAuthStore.getState().accessToken,
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(needle) ||
        (u.email?.toLowerCase().includes(needle) ?? false) ||
        (u.username?.toLowerCase().includes(needle) ?? false),
    );
  }, [users, q]);

  const columns: ColumnDef<UmUser, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => (
          <Link
            to="/user-management/$userId"
            params={{ userId: row.original.id }}
            className="font-medium text-primary hover:underline"
          >
            {row.original.full_name}
          </Link>
        ),
      },
      { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue<string | null>() ?? '—' },
      { accessorKey: 'username', header: 'Username', cell: ({ getValue }) => getValue<string | null>() ?? '—' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === 'active' ? 'default' : 'secondary'}>{getValue<string>()}</Badge>
        ),
      },
      { accessorKey: 'department', header: 'Department', cell: ({ getValue }) => getValue<string | null>() ?? '—' },
    ],
    [],
  );

  const setCreateUserOpen = (open: boolean) => {
    void navigate({
      to: '/user-management',
      search: { q, createUser: open },
      replace: true,
    });
  };

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="People"
        description="Find someone, open their profile, or add a new user."
        actions={
          <CapabilityGate capability={UM_USER_CREATE}>
            <Button type="button" onClick={() => setCreateUserOpen(true)}>
              Add user
            </Button>
          </CapabilityGate>
        }
      >
        <div className="space-y-4">
          <div className="flex max-w-md items-center gap-2">
            <Input
              placeholder="Search by name or email..."
              value={q}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                void navigate({
                  to: '/user-management',
                  search: { q: e.target.value, createUser },
                })
              }
            />
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            emptyTitle="No users"
            emptyDescription={
              q.trim() ? 'No one matches your search.' : 'No users to show yet.'
            }
          />
        </div>
      </UserManagementPageShell>

      <CapabilityGate capability={UM_USER_CREATE}>
        <Dialog open={createUser} onOpenChange={setCreateUserOpen}>
          <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
            <div className="shrink-0 border-b p-4 pb-3">
              <DialogHeader>
                <DialogTitle>Add user</DialogTitle>
                <DialogDescription>
                  Enter their details and choose a role. You can pick which permissions they get.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden p-4">
              <CreateUserForm
                canSelectTargetTenant={canSelectTargetTenant}
                layout="dialog"
                navigateToProfileOnSuccess={umUserRead}
                onCancel={() => setCreateUserOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CapabilityGate>
    </>
  );
}
