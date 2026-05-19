import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Alert, AlertDescription, AlertTitle } from '@pulse/ui/alert';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { DataTable } from '@/components/data-table';
import { useCapability } from '@/hooks/use-capability';
import { UM_ROLE_READ, UM_USER_READ } from '@/lib/runtime-capability-keys';
import {
  flattenPlatformDirectoryRoles,
  flattenPlatformDirectoryUsers,
  platformDirectoryQueryOptions,
  platformDirectoryTenantErrors,
  type PlatformDirectoryRoleRow,
  type PlatformDirectoryUserRow,
} from '../api/platform-directory';

function rowMatchesSearch(needle: string, ...values: (string | null | undefined)[]): boolean {
  if (!needle) return true;
  return values.some((v) => (v ?? '').toLowerCase().includes(needle));
}

function TenantCell({ name, slug }: { name: string; slug: string }) {
  return (
    <motionlessFragment>
      <motionlessDiv className="font-medium">{name}</motionlessDiv>
      <motionlessDiv className="text-xs text-muted-foreground">{slug}</motionlessDiv>
    </motionlessFragment>
  );
}

export function PlatformDirectoryPanel() {
  const umUserRead = useCapability(UM_USER_READ);
  const umRoleRead = useCapability(UM_ROLE_READ);
  const { data: snapshot } = useSuspenseQuery(platformDirectoryQueryOptions());
  const [search, setSearch] = useState('');

  const tenantErrors = platformDirectoryTenantErrors(snapshot);
  const needle = search.trim().toLowerCase();

  const allUsers = useMemo(
    () => (umUserRead ? flattenPlatformDirectoryUsers(snapshot) : []),
    [snapshot, umUserRead],
  );
  const allRoles = useMemo(
    () => (umRoleRead ? flattenPlatformDirectoryRoles(snapshot) : []),
    [snapshot, umRoleRead],
  );

  const filteredUsers = useMemo(
    () =>
      allUsers.filter((u) =>
        rowMatchesSearch(
          needle,
          u.full_name,
          u.email,
          u.username,
          u.tenant_name,
          u.tenant_slug,
          u.organization_name,
        ),
      ),
    [allUsers, needle],
  );

  const filteredRoles = useMemo(
    () =>
      allRoles.filter((r) =>
        rowMatchesSearch(
          needle,
          r.code,
          r.display_name,
          r.description,
          r.tenant_name,
          r.tenant_slug,
          r.organization_name,
        ),
      ),
    [allRoles, needle],
  );

  const userColumns = useMemo<ColumnDef<PlatformDirectoryUserRow, unknown>[]>(
    () => [
      {
        accessorKey: 'tenant_name',
        header: 'Hospital',
        cell: ({ row }) => (
          <TenantCell name={row.original.tenant_name} slug={row.original.tenant_slug} />
        ),
      },
      {
        accessorKey: 'organization_name',
        header: 'Organization',
      },
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
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === 'active' ? 'default' : 'secondary'}>
            {getValue<string>()}
          </Badge>
        ),
      },
    ],
    [],
  );

  const roleColumns = useMemo<ColumnDef<PlatformDirectoryRoleRow, unknown>[]>(
    () => [
      {
        accessorKey: 'tenant_name',
        header: 'Hospital',
        cell: ({ row }) => (
          <TenantCell name={row.original.tenant_name} slug={row.original.tenant_slug} />
        ),
      },
      {
        accessorKey: 'organization_name',
        header: 'Organization',
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'display_name',
        header: 'Display name',
      },
      {
        accessorKey: 'is_system',
        header: 'System',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === 'active' ? 'default' : 'secondary'}>
            {getValue<string>()}
          </Badge>
        ),
      },
    ],
    [],
  );

  const defaultTab = umUserRead ? 'users' : umRoleRead ? 'roles' : 'users';

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Input
          placeholder="Search tenant, org, name, email, role code..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {snapshot.tenants.length} active hospital tenant
        {snapshot.tenants.length === 1 ? '' : 's'} in Configurator
        {umUserRead ? ` · ${allUsers.length} users` : ''}
        {umRoleRead ? ` · ${allRoles.length} roles` : ''}
      </p>

      {tenantErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Some tenants could not be loaded</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {tenantErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {umUserRead ? <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger> : null}
          {umRoleRead ? <TabsTrigger value="roles">Roles ({filteredRoles.length})</TabsTrigger> : null}
        </TabsList>

        {umUserRead ? (
          <TabsContent value="users" className="mt-4">
            <DataTable
              columns={userColumns}
              data={filteredUsers}
              emptyTitle="No users"
              emptyDescription={
                needle ? 'No users match your search.' : 'No users across active tenants.'
              }
            />
          </TabsContent>
        ) : null}

        {umRoleRead ? (
          <TabsContent value="roles" className="mt-4">
            <DataTable
              columns={roleColumns}
              data={filteredRoles}
              emptyTitle="No roles"
              emptyDescription={
                needle ? 'No roles match your search.' : 'No roles across active tenants.'
              }
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </motionlessDiv>
  );
}
