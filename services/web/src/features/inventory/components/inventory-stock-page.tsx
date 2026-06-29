import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Download, LayoutGrid, List, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { useInventoryStock, useInventoryStores } from '../api/queries';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryStockStatusLabel } from './inventory-stock-status';
import type { InventoryStockRow } from '../types';

export function InventoryStockPage() {
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string>('store-1');
  const { data: stores } = useInventoryStores();
  const { data, isLoading } = useInventoryStock({
    search: search || undefined,
    store_id: storeId,
  });
  const rows = data?.data ?? [];
  const summary = data?.summary ?? { critical: 0, low: 0, normal: 0 };

  const placeholder = (label: string) => {
    toast.info(`${label} will be available when APIs are connected.`);
  };

  const columns = useMemo<ColumnDef<InventoryStockRow, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
      },
      { accessorKey: 'item_name', header: 'Item', meta: { label: 'Item' } },
      {
        accessorKey: 'item_code',
        header: 'Code',
        meta: { label: 'Code' },
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        meta: { label: 'Qty' },
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            {row.original.status !== 'normal' ? (
              <AlertTriangle
                className={
                  row.original.status === 'critical'
                    ? 'size-4 text-destructive'
                    : 'size-4 text-amber-600'
                }
                aria-hidden
              />
            ) : null}
            {row.original.quantity}
          </span>
        ),
      },
      { accessorKey: 'uom', header: 'UoM', meta: { label: 'UoM' } },
      {
        accessorKey: 'reorder_at',
        header: 'Reorder',
        meta: { label: 'Reorder' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryStockStatusLabel status={getValue()} />,
      },
    ],
    [],
  );

  return (
    <InventoryPageShell
      title="Stock"
      breadcrumbLabel="Stock"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => placeholder('Adjust stock')}>
            Adjust stock
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => placeholder('Indent')}>
            Indent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => placeholder('Export')}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="More actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => placeholder('Import')}>Import</DropdownMenuItem>
              <DropdownMenuItem onClick={() => placeholder('Print')}>Print</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="h-9 w-[240px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {(stores ?? []).map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button type="button" variant="secondary" size="icon-sm" aria-label="List view">
              <List className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Grid view">
              <LayoutGrid className="size-4" />
            </Button>
          </div>
          <EntityTableToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search or scan item…"
            debounceMs={0}
          />
        </div>
        <div className="p-3 pt-0">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            showColumnMenu
            emptyTitle="No stock rows"
            emptyDescription="Adjust filters or select another store."
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">{rows.length} items</p>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span>
              Critical <strong className="text-destructive">{summary.critical}</strong>
            </span>
            <span>
              Low <strong className="text-amber-600">{summary.low}</strong>
            </span>
            <span>
              Normal <strong className="text-emerald-600">{summary.normal}</strong>
            </span>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  );
}
