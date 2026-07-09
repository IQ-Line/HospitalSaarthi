import { Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { formatInrAmount } from '../../lib/dispense-billing';
import {
  createEmptyIssuedItemRow,
  isIssuedRowStarted,
  issuedRowLineTotal,
} from '../../lib/dispense-workspace';
import type { DispenseIssuedItemRow } from '../../types/dispense-ui.types';
import { DispenseStockSearchInput } from './dispense-stock-search-input';

type DispenseIssuedItemsTableProps = {
  rows: DispenseIssuedItemRow[];
  onChange: (rows: DispenseIssuedItemRow[]) => void;
  disabled?: boolean;
};

function appendEmptyRowIfNeeded(
  rows: DispenseIssuedItemRow[],
  updatedKey: string,
): DispenseIssuedItemRow[] {
  const last = rows[rows.length - 1];
  if (last && last.key === updatedKey && isIssuedRowStarted(last)) {
    return [...rows, createEmptyIssuedItemRow()];
  }
  return rows;
}

export function DispenseIssuedItemsTable({
  rows,
  onChange,
  disabled = false,
}: DispenseIssuedItemsTableProps) {
  const updateRow = (key: string, patch: Partial<DispenseIssuedItemRow>) => {
    const mapped = rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
    onChange(appendEmptyRowIfNeeded(mapped, key));
  };

  const removeRow = (key: string) => {
    const next = rows.filter((row) => row.key !== key);
    onChange(next.length > 0 ? next : [createEmptyIssuedItemRow()]);
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-20">Code</TableHead>
            <TableHead className="min-w-[200px]">Issued Item</TableHead>
            <TableHead className="w-16 text-right">Qty</TableHead>
            <TableHead className="w-20 text-right">Available</TableHead>
            <TableHead className="w-28">Batch</TableHead>
            <TableHead className="w-20 text-right">MRP</TableHead>
            <TableHead className="w-20 text-right">Disc. (₹)</TableHead>
            <TableHead className="w-16 text-right">Tax (%)</TableHead>
            <TableHead className="w-24 text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="p-1.5">
                <Input
                  value={row.item_code}
                  disabled={disabled}
                  className="h-9 font-mono text-xs"
                  onChange={(e) => updateRow(row.key, { item_code: e.target.value })}
                />
              </TableCell>
              <TableCell className="p-1.5">
                <DispenseStockSearchInput
                  value={row.medicine_display_name}
                  disabled={disabled}
                  onValueChange={(v) => updateRow(row.key, { medicine_display_name: v })}
                  onSelect={(item) =>
                    updateRow(row.key, {
                      medicine_id: item.id,
                      item_code: item.code,
                      medicine_display_name: item.name,
                      available_qty: String(item.available),
                      batch: item.batch,
                      mrp: item.mrp,
                      quantity: row.quantity || '1',
                    })
                  }
                />
              </TableCell>
              <TableCell className="p-1.5">
                <Input
                  value={row.quantity}
                  disabled={disabled}
                  inputMode="decimal"
                  className="h-9 text-right tabular-nums"
                  onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                />
              </TableCell>
              <TableCell className="p-1.5">
                <Input
                  value={row.available_qty}
                  readOnly
                  disabled
                  className="h-9 bg-muted/30 text-right tabular-nums"
                />
              </TableCell>
              <TableCell className="p-1.5">
                <Select
                  value={row.batch || undefined}
                  disabled={disabled || !row.batch}
                  onValueChange={(v) => updateRow(row.key, { batch: v })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {row.batch ? (
                      <SelectItem value={row.batch}>{row.batch}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1.5">
                <Input
                  value={row.mrp}
                  disabled={disabled}
                  inputMode="decimal"
                  className="h-9 text-right tabular-nums"
                  onChange={(e) => updateRow(row.key, { mrp: e.target.value })}
                />
              </TableCell>
              <TableCell className="p-1.5">
                <Input
                  value={row.line_discount}
                  disabled={disabled}
                  inputMode="decimal"
                  className="h-9 text-right tabular-nums"
                  onChange={(e) => updateRow(row.key, { line_discount: e.target.value })}
                />
              </TableCell>
              <TableCell className="p-1.5">
                <Input
                  value={row.tax_percent}
                  disabled={disabled}
                  inputMode="decimal"
                  className="h-9 text-right tabular-nums"
                  onChange={(e) => updateRow(row.key, { tax_percent: e.target.value })}
                />
              </TableCell>
              <TableCell className="p-1.5 text-right text-sm font-medium tabular-nums">
                {formatInrAmount(issuedRowLineTotal(row))}
              </TableCell>
              <TableCell className="p-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={disabled || rows.length <= 1}
                  onClick={() => removeRow(row.key)}
                  aria-label="Remove row"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
