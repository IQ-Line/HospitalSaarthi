import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { DataTable } from '@/components/data-table';
import type { PlatformDirectoryUserRow } from '../api/platform-directory';
import type { UmUser } from '../types';

type UserListRow = UmUser | PlatformDirectoryUserRow;

function isPlatformDirectoryRow(row: UserListRow): row is PlatformDirectoryUserRow {
  return 'tenant_name' in row && typeof row.tenant_name === 'string';
}

function TenantCell({ name, slug }: { name: string; slug: string }) {
  return (
    <div>
      <div className="font-medium">{name}</div>
      <div className="text-xs text-muted-foreground">{slug}</div>
    </div>
  );
}

export function buildUserListColumns(crossTenant: boolean): ColumnDef<UserListRow, unknown>[] {
  const cols: ColumnDef<UserListRow, unknown>[] = [];

  if (crossTenant) {
    cols.push(
      {
        accessorKey: 'tenant_name',
        header: 'Hospital',
        cell: ({ row }) => {
          const r = row.original;
          if (!isPlatformDirectoryRow(r)) return '—';
          return <TenantCell name={r.tenant_name} slug={r.tenant_slug} />;
        },
      },
      {
        accessorKey: 'organization_name',
        header: 'Organization',
        cell: ({ row }) =>
          isPlatformDirectoryRow(row.original) ? row.original.organization_name : '—',
      },
      {
        id: 'tenant_status',
        header: 'Tenant status',
        cell: ({ row }) => {
          if (!isPlatformDirectoryRow(row.original)) return '—';
          const status = row.original.tenant_provisioning_status;
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>{status}</Badge>
          );
        },
      },
    );
  }

  cols.push(
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => {
        const r = row.original;
        const tenant =
          crossTenant && isPlatformDirectoryRow(r) ? r.iq_tenant_id : undefined;
        return (
          <Link
            to="/user-management/$userId"
            params={{ userId: r.id }}
            search={tenant ? { tenant } : {}}
            className="font-medium text-primary hover:underline"
          >
            {r.full_name}
          </Link>
        );
      },
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
  );

  if (!crossTenant) {
    cols.push({
      accessorKey: 'department',
      header: 'Department',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    });
  }

  return cols;
}

type UserListTableProps = {
  crossTenant: boolean;
  data: UserListRow[];
  emptyTitle: string;
  emptyDescription: string;
};

export function UserListTable({
  crossTenant,
  data,
  emptyTitle,
  emptyDescription,
}: UserListTableProps) {
  const columns = useMemo(() => buildUserListColumns(crossTenant), [crossTenant]);

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}
