import { Button } from '@pulse/ui/button';
import { formatInrAmount } from '../../lib/dispense-billing';

type DispensePageFooterProps = {
  pendingAmount: number;
  itemCount: number;
  issuing?: boolean;
  onIssueItems: () => void;
};

export function DispensePageFooter({
  pendingAmount,
  itemCount,
  issuing = false,
  onIssueItems,
}: DispensePageFooterProps) {
  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

  return (
    <div className="z-20 flex w-full shrink-0 items-center justify-between gap-4 border-t bg-background px-6 py-3">
      <p className="min-w-0 text-sm">
        <span className="text-muted-foreground">Pending </span>
        <span className="font-semibold tabular-nums">{formatInrAmount(pendingAmount)}</span>
        <span className="text-muted-foreground"> · </span>
        <span className="text-foreground">{itemCount > 0 ? itemLabel : 'No items'}</span>
      </p>
      <Button
        type="button"
        size="default"
        className="min-w-[140px]"
        disabled={issuing || itemCount < 1}
        onClick={onIssueItems}
      >
        {issuing ? 'Issuing…' : 'Issue items'}
      </Button>
    </div>
  );
}
