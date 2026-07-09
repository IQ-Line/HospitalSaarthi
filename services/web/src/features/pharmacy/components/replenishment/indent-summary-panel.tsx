import { countFilledIndentLines, sumRequestedQty } from '../../lib/indent-draft';
import type { IndentDraftLine } from '../../types/replenishment-ui.types';

type IndentSummaryPanelProps = {
  lines: IndentDraftLine[];
};

export function IndentSummaryPanel({ lines }: IndentSummaryPanelProps) {
  const itemCount = countFilledIndentLines(lines);
  const totalQty = sumRequestedQty(lines);

  return (
    <aside className="w-full shrink-0 rounded-lg border bg-muted/20 p-4 lg:w-56">
      <h3 className="text-sm font-medium">Summary</h3>
      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Items</dt>
          <dd className="font-medium tabular-nums">{itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Total req. qty</dt>
          <dd className="font-medium tabular-nums">{totalQty > 0 ? totalQty : '—'}</dd>
        </div>
      </dl>
    </aside>
  );
}
