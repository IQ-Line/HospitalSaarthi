import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table';
import type { Integration } from '../types';
import { IntegrationStatusBadge } from './integration-status-badge';

type IntegrationListTableProps = {
  items: Integration[];
  selectedIntegrationId?: string | null;
  onSelect?: (integrationId: string) => void;
};

export function IntegrationListTable({
  items,
  selectedIntegrationId,
  onSelect,
}: IntegrationListTableProps) {
  const columns: ColumnDef<Integration, unknown>[] = [
    {
      accessorKey: 'display_name',
      header: 'Name',
      cell: ({ row }) => {
        const id = row.original.integration_id;
        const name = row.original.display_name;
        if (onSelect) {
          const selected = selectedIntegrationId === id;
          return (
            <button
              type="button"
              className={`font-medium text-left hover:underline ${selected ? 'text-primary' : ''}`}
              onClick={() => onSelect(id)}
            >
              {name}
            </button>
          );
        }
        return <span className="font-medium">{name}</span>;
      },
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

  return <DataTable columns={columns} data={items} emptyMessage="No integrations yet." />;
}
