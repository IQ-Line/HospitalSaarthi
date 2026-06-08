import { Link } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import type { Integration } from '../types';
import { IntegrationStatusBadge } from './integration-status-badge';

const columns: ColumnDef<Integration, unknown>[] = [
  {
    accessorKey: 'display_name',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        to="/integration-hub/$integrationId"
        params={{ integrationId: row.original.integration_id }}
        className="font-medium text-primary hover:underline"
      >
        {row.original.display_name}
      </Link>
    ),
  },
  {
    accessorKey: 'integration_type',
    header: 'Type',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <IntegrationStatusBadge status={row.original.status} />,
  },
  {
    id: 'operations',
    header: 'Allowed operations',
    cell: ({ row }) => row.original.config.allowedOperations.join(', ') || '—',
  },
];

export function IntegrationListTable({ items }: { items: Integration[] }) {
  return <DataTable columns={columns} data={items} emptyMessage="No integrations yet." />;
}
