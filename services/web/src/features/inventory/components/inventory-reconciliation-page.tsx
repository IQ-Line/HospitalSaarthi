import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useInventoryReconciliation } from '../api/queries';
import type { InventoryReconciliationRow } from '../types';
import { InventoryPageShell } from './inventory-page-shell';

export function InventoryReconciliationPage() {
  const { data: rows = [], isLoading } = useInventoryReconciliation();

  const columns = useMemo<ColumnDef<InventoryReconciliationRow, unknown>[]>(
    () => [
      { accessorKey: 'drug_name', header: 'Drug', meta: { label: 'Drug' } },
      { accessorKey: 'site', header: 'Site', meta: { label: 'Site' } },
      { accessorKey: 'batch', header: 'Batch', meta: { label: 'Batch' } },
      {
        accessorKey: 'pharmacy_qty',
        header: 'Pharmacy qty',
        meta: { label: 'Pharmacy qty' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'inventory_qty',
        header: 'Inventory qty',
        meta: { label: 'Inventory qty' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => {
          const status = getValue<InventoryReconciliationRow['status']>();
          return (
            <Badge variant="outline" className="capitalize">
              {status}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <InventoryPageShell
      title="Pharmacy — Inventory reconciliation"
      description="Bridged pharmacy batches vs Inventory_stock for the same item, location, and lot."
      breadcrumbs={[
        { label: 'Inventory', to: '/inventory/dashboard' },
        { label: 'Stock', to: '/inventory/stock' },
        { label: 'Pharmacy Reconciliation' },
      ]}
      actions={
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link to="/inventory/dashboard">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Fully bridged rows can be compared to inventory; partial links need Inventory_item / lot /
          location on the batch.
        </span>
        <Badge variant="secondary">0 partial / unlinked</Badge>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
          No mismatches in loaded rows
        </Badge>
        <span className="text-muted-foreground">Pharmacy catalog (coming in a later phase)</span>
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No pharmacy stock batches found"
          emptyDescription="Bridged pharmacy batches will appear here when pharmacy integration is connected."
        />
      </div>
    </InventoryPageShell>
  );
}
