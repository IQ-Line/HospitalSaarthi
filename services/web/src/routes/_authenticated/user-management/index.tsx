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
import { DataTable } from '@/components/data-table';
import {
  capabilityListOptions,
  roleListOptions,
  userListOptions,
  useUserListSuspense,
} from '@/features/user-management/api/queries';
import { CreateUserForm } from '@/features/user-management/components/create-user-form';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { UserManagementSectionCard } from '@/features/user-management/components/user-management-section-card';
import {
  canAccessRolesAdmin,
  canAccessUsersSection,
  canReadUsers,
  canSelectTenantOnUserCreate,
  UM_MODULE,
} from '@/features/user-management/lib/um-permissions';
import type { UmUser } from '@/features/user-management/types';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/user-management/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    createUser: search.createUser === true || search.createUser === 'true',
  }),
  beforeLoad: () => {
    const permissions = usePermissionsStore.getState();
    if (!canAccessUsersSection(permissions)) {
      if (canAccessRolesAdmin(permissions)) {
        throw redirect({ to: '/user-management/roles' });
      }
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async ({ context }) => {
    const permissions = usePermissionsStore.getState();
    const loads: Array<Promise<unknown>> = [];
    if (canReadUsers(permissions)) {
      loads.push(context.queryClient.ensureQueryData(userListOptions()));
    }
    if (permissions.hasFeaturePermission(UM_MODULE, 'roles', 'read')) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions()));
    }
    if (permissions.hasFeaturePermission(UM_MODULE, 'capabilities', 'read')) {
      loads.push(context.queryClient.ensureQueryData(capabilityListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserManagementIndexPage,
});

function UserManagementIndexPage() {
  const canRead = usePermissionsStore(canReadUsers);
  if (!canRead) {
    return <CreateUserOnlyPage />;
  }
  return <UserManagementListPage />;
}

function CreateUserOnlyPage() {
  const canReadRoles = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM_MODULE, 'roles', 'read'),
  );
  const canManageAccess = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM_MODULE, 'userAccess', 'write'),
  );
  const canWrite = usePermissionsStore((s) => s.hasFeaturePermission(UM_MODULE, 'users', 'write'));
  const canAssignAccessOnCreate = canManageAccess || canWrite;

  const [createOpen, setCreateOpen] = useState(true);

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="Add a user"
        description="Create a new account for someone in your organization."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add user
          </Button>
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
              canReadRoles={canReadRoles}
              canManageAccess={canAssignAccessOnCreate}
              canSelectTargetTenant={canSelectTenantOnUserCreate()}
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
  const canCreate = usePermissionsStore((s) => s.hasFeaturePermission(UM_MODULE, 'users', 'write'));
  const canReadUsersAfterCreate = usePermissionsStore(canReadUsers);
  const canReadRoles = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM_MODULE, 'roles', 'read'),
  );
  const canManageAccess = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM_MODULE, 'userAccess', 'write'),
  );
  const canAssignAccessOnCreate = canManageAccess || canCreate;

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
          canCreate ? (
            <Button type="button" onClick={() => setCreateUserOpen(true)}>
              Add user
            </Button>
          ) : null
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

      {canCreate ? (
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
                canReadRoles={canReadRoles}
                canManageAccess={canAssignAccessOnCreate}
                canSelectTargetTenant={canSelectTenantOnUserCreate()}
                layout="dialog"
                navigateToProfileOnSuccess={canReadUsersAfterCreate}
                onCancel={() => setCreateUserOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
