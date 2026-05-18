import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import {
  capabilityListOptions,
  roleListOptions,
  userListOptions,
  useUserListSuspense,
} from '@/features/user-management/api/queries';
import { RoleManagementPanel } from '@/features/user-management/components/role-management-panel';
import type { UmUser } from '@/features/user-management/types';
import { usePermissionsStore } from '@/stores/permissions.store';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
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
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { data: users } = useUserListSuspense();
  const canCreate = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'users', 'write'));
  const canReadRoles = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'roles', 'read'));
  const canReadCapabilities = usePermissionsStore((s) =>
    s.hasFeaturePermission(UM, 'capabilities', 'read'),
  );
  const canWriteRoles = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'roles', 'write'));

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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Users"
        description="Tenant-scoped platform users (Cerbos-filtered list)."
        actions={
          canCreate ? (
            <Button asChild>
              <Link to="/user-management/create">Create user</Link>
            </Button>
          ) : null
        }
      />

      <div className="flex max-w-md gap-2 items-center">
        <Input
          placeholder="Search name, email, username…"
          value={q}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            void navigate({
              to: '/user-management',
              search: { q: e.target.value },
            })
          }
        />
      </div>

      <div className="rounded-lg border">
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
      </div>

      {canReadRoles ? (
        <RoleManagementPanel
          canWriteRoles={canWriteRoles}
          canReadCapabilities={canReadCapabilities}
        />
      ) : null}
    </div>
  );
}
