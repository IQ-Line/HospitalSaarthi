import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import { DataTable } from '@/components/data-table';
import type { PlatformDirectoryUserRow } from '../api/platform-directory';
import type { UmUser } from '../types';

export type UserListLinkOptions = {
  /** Passed as `?tenant=` on profile links (onboarding / platform directory). */
  tenantScope?: string;
  /** When false, names are plain text and row navigation is disabled. */
  linkToProfile?: boolean;
};

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

export function UserProfileNameLink({
  userId,
  fullName,
  tenantScope,
  linkToProfile = true,
}: {
  userId: string;
  fullName: string;
  tenantScope?: string;
  linkToProfile?: boolean;
}) {
  if (!linkToProfile) {
    return <span className="font-medium">{fullName}</span>;
  }
  return (
    <Link
      to="/user-management/$userId"
      params={{ userId }}
      search={tenantScope ? { tenant: tenantScope } : {}}
      className="font-medium text-primary hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {fullName}
    </Link>
  );
}

export function buildUserListColumns(
  crossTenant: boolean,
  linkOptions: UserListLinkOptions = {},
): ColumnDef<UserListRow, unknown>[] {
  const linkToProfile = linkOptions.linkToProfile ?? true;
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
        const tenantScope =
          linkOptions.tenantScope ??
          (crossTenant && isPlatformDirectoryRow(r) ? r.iq_tenant_id : undefined);
        return (
          <UserProfileNameLink
            userId={r.id}
            fullName={r.full_name}
            tenantScope={tenantScope}
            linkToProfile={linkToProfile}
          />
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
  linkOptions?: UserListLinkOptions;
  onOpenProfile?: (row: UserListRow) => void;
};

export function UserListTable({
  crossTenant,
  data,
  emptyTitle,
  emptyDescription,
  linkOptions,
  onOpenProfile,
}: UserListTableProps) {
  const columns = useMemo(
    () => buildUserListColumns(crossTenant, linkOptions),
    [crossTenant, linkOptions],
  );
  const linkToProfile = linkOptions?.linkToProfile ?? true;

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onRowClick={
        linkToProfile && onOpenProfile
          ? (row) => onOpenProfile(row)
          : undefined
      }
    />
  );
}
