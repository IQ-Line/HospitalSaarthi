import { useMemo } from 'react';
import { Input } from '@pulse/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { formatIndentRequestDate } from '../../lib/replenishment-display';
import type { IndentDraftLine } from '../../types/replenishment-ui.types';

type IndentRequestedItemsTableProps = {
  lines: IndentDraftLine[];
  onLineChange: (key: string, patch: Partial<IndentDraftLine>) => void;
  onItemSearchFocus?: (lineKey: string) => void;
};

export function IndentRequestedItemsTable({
  lines,
  onLineChange,
  onItemSearchFocus,
}: IndentRequestedItemsTableProps) {
  const filledCount = useMemo(
    () => lines.filter((line) => line.item_id.trim().length > 0).length,
    [lines],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Requested items</h3>
        <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
          {filledCount} items
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[200px]">Item</TableHead>
              <TableHead>Item code</TableHead>
              <TableHead className="text-right">Qty avail.</TableHead>
              <TableHead>Base UOM</TableHead>
              <TableHead className="text-right">Req. qty</TableHead>
              <TableHead>Last GRN</TableHead>
              <TableHead className="min-w-[140px]">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={line.key}>
                <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                <TableCell>
                  <Input
                    value={line.item_name}
                    onChange={(e) =>
                      onLineChange(line.key, { item_name: e.target.value })
                    }
                    onFocus={() => onItemSearchFocus?.(line.key)}
                    placeholder="Search or scan item..."
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {line.item_code || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {line.available_qty ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{line.base_uom || '—'}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={line.requested_qty}
                    onChange={(e) =>
                      onLineChange(line.key, { requested_qty: e.target.value })
                    }
                    className="h-8 w-20 text-right tabular-nums"
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {line.last_grn_date ? formatIndentRequestDate(line.last_grn_date) : '—'}
                </TableCell>
                <TableCell>
                  <Input
                    value={line.line_remarks}
                    onChange={(e) =>
                      onLineChange(line.key, { line_remarks: e.target.value })
                    }
                    placeholder="Remarks..."
                    className="h-8"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
