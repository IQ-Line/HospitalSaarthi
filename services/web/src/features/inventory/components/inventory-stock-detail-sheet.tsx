import { Link } from '@tanstack/react-router';
import { Eye, ScrollText } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@pulse/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { useInventoryStockLots } from '../api/queries';
import type { InventoryStockRow } from '../types';
import { InventoryStockStatusBadge } from './inventory-stock-status';

interface InventoryStockDetailSheetProps {
  row: InventoryStockRow | null;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryStockDetailSheet({
  row,
  storeName,
  open,
  onOpenChange,
}: InventoryStockDetailSheetProps) {
  const stockId = open && row ? row.id : null;
  const { data: lots = [], isLoading } = useInventoryStockLots(stockId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        {row ? (
          <>
            <SheetHeader className="space-y-0 border-b px-6 py-5 pr-14">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <SheetTitle className="text-left text-lg font-semibold leading-snug">
                    {row.item_name}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">{row.item_code}</p>
                  <p className="text-xs text-muted-foreground">{storeName}</p>
                </div>
                <InventoryStockStatusBadge status={row.status} />
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">On hand</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {row.quantity} {row.uom}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Reorder point</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {row.reorder_at > 0 ? row.reorder_at : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Batches</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{row.batches}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button type="button" className="w-full">
                  Adjust stock
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="gap-1.5">
                    <Eye className="size-4" aria-hidden />
                    View item
                  </Button>
                  <Button type="button" variant="outline" className="gap-1.5">
                    <ScrollText className="size-4" aria-hidden />
                    View ledger
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-medium">Lots at this store</h4>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading lots…</p>
                ) : lots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lot breakdown available.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lot</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lots.map((lot) => (
                          <TableRow key={lot.id}>
                            <TableCell>{lot.lot_number}</TableCell>
                            <TableCell>{lot.expiry_date}</TableCell>
                            <TableCell>{lot.received_date}</TableCell>
                            <TableCell className="text-right tabular-nums">{lot.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface InventoryStockGridProps {
  rows: InventoryStockRow[];
  onSelect: (row: InventoryStockRow) => void;
}

const GRID_STATUS_CLASS: Record<InventoryStockRow['status'], string> = {
  critical: 'border-destructive/30 bg-destructive/5',
  low: 'border-amber-500/30 bg-amber-500/5',
  normal: 'border-emerald-500/30 bg-emerald-500/5',
};

export function InventoryStockGrid({ rows, onSelect }: InventoryStockGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={`rounded-lg border p-4 text-left transition-colors hover:shadow-sm ${GRID_STATUS_CLASS[row.status]}`}
          onClick={() => onSelect(row)}
        >
          <p className="truncate text-sm font-medium">{row.item_name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.item_code}</p>
          <p className="mt-3 text-3xl font-bold tabular-nums">{row.quantity}</p>
        </button>
      ))}
    </div>
  );
}

export function InventoryStockDisplayPopoverContent({
  showReorder,
  showUom,
  onShowReorderChange,
  onShowUomChange,
  statusFilters,
  onStatusFilterToggle,
}: {
  showReorder: boolean;
  showUom: boolean;
  onShowReorderChange: (value: boolean) => void;
  onShowUomChange: (value: boolean) => void;
  statusFilters: Set<InventoryStockRow['status']>;
  onStatusFilterToggle: (status: InventoryStockRow['status']) => void;
}) {
  const toggleButtonClass = (active: boolean) =>
    active ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground';

  return (
    <div className="space-y-4 p-1">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Stock level</p>
        <div className="flex flex-wrap gap-2">
          {(['critical', 'low', 'normal'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-md border px-3 py-1 text-xs capitalize ${toggleButtonClass(statusFilters.has(status))}`}
              onClick={() => onStatusFilterToggle(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Show in table</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-xs ${toggleButtonClass(showReorder)}`}
            onClick={() => onShowReorderChange(!showReorder)}
          >
            Reorder
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-xs ${toggleButtonClass(showUom)}`}
            onClick={() => onShowUomChange(!showUom)}
          >
            UoM
          </button>
        </div>
      </div>
    </div>
  );
}

export function InventoryStockIndentLink() {
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to="/inventory/indents/new">Indent</Link>
    </Button>
  );
}
