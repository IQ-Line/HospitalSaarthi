import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { useMemo } from 'react';
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
import type { UmUser } from '@/features/user-management/types';
import { usePermissionsStore } from '@/stores/permissions.store';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    createUser: search.createUser === true || search.createUser === 'true',
  }),
  beforeLoad: () => {
    if (!usePermissionsStore.getState().hasFeaturePermission(UM, 'users', 'read')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async ({ context }) => {
    const permissions = usePermissionsStore.getState();
    const loads: Array<Promise<unknown>> = [context.queryClient.ensureQueryData(userListOptions())];
    if (permissions.hasFeaturePermission(UM, 'roles', 'read')) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions()));
    }
    if (permissions.hasFeaturePermission(UM, 'capabilities', 'read')) {
      loads.push(context.queryClient.ensureQueryData(capabilityListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserManagementListPage,
});

function UserManagementListPage() {
  const { q, createUser } = Route.useSearch();
  const navigate = useNavigate();
  const { data: users } = useUserListSuspense();
  const canCreate = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'users', 'write'));
  const canReadRoleTemplates = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'roles', 'read'));
  const canReadCapabilities = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM, 'capabilities', 'read'),
  );
  const canManageAccess = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM, 'userAccess', 'write'),
  );
  /** Anyone who can create users should assign roles on create; `userAccess` write alone is too narrow for UX. */
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
        title="Users"
        description="Search tenant-scoped users, open a profile, and create new users from the main directory."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateUserOpen(true)}>
              Create user
            </Button>
          ) : null
        }
      >
        <UserManagementSectionCard
          title="User directory"
          description="Filter users by name, email, or username, then open the profile that needs attention."
          actions={<Badge variant="secondary">{filtered.length} results</Badge>}
          contentClassName="space-y-4"
        >
          <div className="flex max-w-md gap-2 items-center">
            <Input
              placeholder="Search name, email, username..."
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
              q.trim()
                ? 'No users match your search.'
                : 'No users returned for this tenant, or you lack list visibility under ABAC.'
            }
          />
        </UserManagementSectionCard>
      </UserManagementPageShell>

      {canCreate ? (
        <Dialog open={createUser} onOpenChange={setCreateUserOpen}>
          <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
            <div className="shrink-0 border-b p-4 pb-3">
              <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
                <DialogDescription>
                  Add the user&apos;s details, then assign a required role template and capabilities.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden p-4">
              <CreateUserForm
                canReadRoleTemplates={canReadRoleTemplates}
                canReadCapabilities={canReadCapabilities}
                canManageAccess={canAssignAccessOnCreate}
                layout="dialog"
                onCancel={() => setCreateUserOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
