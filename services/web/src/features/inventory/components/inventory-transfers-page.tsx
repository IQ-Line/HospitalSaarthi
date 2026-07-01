import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { useInventoryTransfers } from '../api/queries';
import type { InventoryTransferRow, InventoryTransferStatus } from '../types';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryTransferDialog } from './inventory-transfer-dialog';

function formatTransferDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTransferType(type: InventoryTransferRow['transfer_type']): string {
  return type === 'emergency' ? 'Emergency' : 'Normal';
}

function transferStatusBadgeClass(status: InventoryTransferStatus): string {
  switch (status) {
    case 'Completed':
      return 'border-emerald-600/80 text-emerald-800 dark:border-emerald-500/60 dark:text-emerald-400';
    case 'In transit':
      return 'border-amber-500/80 text-amber-800 dark:border-amber-500/60 dark:text-amber-400';
    case 'Cancelled':
      return 'border-destructive text-destructive';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}

export function InventoryTransfersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InventoryTransferRow | null>(null);

  const { data, isLoading } = useInventoryTransfers({
    search: search || undefined,
    page,
    limit: pageSize,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const openNew = () => {
    setSelectedTransfer(null);
    setDialogOpen(true);
  };

  const openTransfer = (row: InventoryTransferRow) => {
    setSelectedTransfer(row);
    setDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<InventoryTransferRow, unknown>[]>(
    () => [
      {
        accessorKey: 'transfer_number',
        header: 'Transfer #',
        meta: { label: 'Transfer #' },
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'transfer_date',
        header: 'Date',
        meta: { label: 'Date' },
        cell: ({ getValue }) => formatTransferDate(getValue<string>()),
      },
      { accessorKey: 'from_store', header: 'From', meta: { label: 'From' } },
      { accessorKey: 'to_store', header: 'To', meta: { label: 'To' } },
      {
        accessorKey: 'transfer_type',
        header: 'Type',
        meta: { label: 'Type' },
        cell: ({ getValue }) => formatTransferType(getValue<InventoryTransferRow['transfer_type']>()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => (
          <Badge variant="outline" className={`text-xs ${transferStatusBadgeClass(getValue<InventoryTransferStatus>())}`}>
            {getValue<string>()}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { headerClassName: 'w-24' },
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openTransfer(row.original)}>
            Open
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <InventoryPageShell
      title="Stock Transfers"
      breadcrumbLabel="Transfers"
      actions={
        <Button type="button" size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          New Transfer
        </Button>
      }
    >
      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <EntityTableToolbar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search"
            debounceMs={0}
          />
        </div>
        <div className="p-3 pt-0">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            showColumnMenu
            getRowId={(row) => row.id}
            emptyTitle="No transfer documents yet"
            emptyDescription="Create a new transfer to move stock between stores."
            manualPagination={{
              pageIndex: page - 1,
              pageSize,
              total,
              pageSizeOptions: [10, 20, 50],
              onPageChange: (pageIndex) => setPage(pageIndex + 1),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
          />
        </div>
      </div>

      <InventoryTransferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transfer={selectedTransfer}
      />
    </InventoryPageShell>
  );
}
