import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { cn } from '@pulse/utils';
import { useInventoryTransferCancel, useInventoryTransferReceive } from '../api/transfer-mutations';
import { useInventoryIndentDetail } from '../api/queries';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import { canReceiveTransfer, transferHasUnsettledQty } from '../lib/transfer-workflow';
import type { InventoryTransferLine, InventoryTransferRow } from '../types';

const QTY_EPSILON = 0.0005;

function qtyNearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= QTY_EPSILON;
}

type InventoryTransferReceiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: InventoryTransferRow | null;
  transferLoading?: boolean;
};

type ReceiveLineState = InventoryTransferLine & {
  previously_received: number;
  previously_accepted: number;
  previously_rejected: number;
  remaining_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rejection_reason: string;
};

function toReceiveLine(line: InventoryTransferLine): ReceiveLineState {
  const dispatched = line.dispatched_qty ?? line.quantity;
  const previouslyReceived = line.received_qty ?? 0;
  const previouslyAccepted = line.accepted_qty ?? 0;
  const previouslyRejected = line.rejected_qty ?? 0;
  const remaining = Math.max(0, dispatched - previouslyReceived);
  return {
    ...line,
    dispatched_qty: dispatched,
    previously_received: previouslyReceived,
    previously_accepted: previouslyAccepted,
    previously_rejected: previouslyRejected,
    remaining_qty: remaining,
    received_qty: remaining,
    accepted_qty: remaining,
    rejected_qty: 0,
    rejection_reason: line.rejection_reason ?? '',
  };
}

export function InventoryTransferReceiveDialog({
  open,
  onOpenChange,
  transfer,
  transferLoading = false,
}: InventoryTransferReceiveDialogProps) {
  const receiveTransfer = useInventoryTransferReceive();
  const cancelTransfer = useInventoryTransferCancel();
  const { data: linkedIndent } = useInventoryIndentDetail(transfer?.inventory_indent_id ?? undefined);
  const [lines, setLines] = useState<ReceiveLineState[]>([]);
  const [cancelReason, setCancelReason] = useState('');

  const readOnly = transfer != null && !canReceiveTransfer(transfer);
  const canCancelRemainder = transfer != null && transferHasUnsettledQty(transfer);

  useEffect(() => {
    if (!open || transferLoading || !transfer) return;
    setLines(transfer.lines.map(toReceiveLine));
    setCancelReason('');
  }, [open, transfer, transferLoading]);

  const updateLine = (lineId: string, patch: Partial<ReceiveLineState>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...patch };
        if ('received_qty' in patch || 'accepted_qty' in patch) {
          const received = Number(next.received_qty) || 0;
          const accepted = Math.min(Number(next.accepted_qty) || 0, received);
          next.accepted_qty = accepted;
          next.rejected_qty = Math.max(0, received - accepted);
        }
        if ('rejected_qty' in patch) {
          const received = Number(next.received_qty) || 0;
          const rejected = Math.min(Number(next.rejected_qty) || 0, received);
          next.rejected_qty = rejected;
          next.accepted_qty = Math.max(0, received - rejected);
        }
        return next;
      }),
    );
  };

  const validate = (): string | null => {
    if (!transfer) return 'Transfer not loaded.';
    for (const line of lines) {
      const remaining = line.remaining_qty;
      const received = Number(line.received_qty);
      const accepted = Number(line.accepted_qty);
      const rejected = Number(line.rejected_qty);
      if (received > remaining) {
        return `${line.item_name}: this receipt cannot exceed remaining qty (${remaining}).`;
      }
      if (!qtyNearlyEqual(accepted + rejected, received)) {
        return `${line.item_name}: accepted + rejected must equal received qty for this receipt.`;
      }
      if (rejected > 0 && !line.rejection_reason.trim()) {
        return `${line.item_name}: rejection reason is required.`;
      }
    }
    const totalThisAccepted = lines.reduce((sum, line) => sum + Number(line.accepted_qty), 0);
    const totalThisReceived = lines.reduce((sum, line) => sum + Number(line.received_qty), 0);
    if (totalThisReceived <= 0) {
      return 'Enter quantities for this receipt, or cancel the remaining transfer.';
    }
    if (totalThisAccepted <= 0) {
      const allRejectedWithReason = lines.every(
        (line) =>
          Number(line.received_qty) > 0 &&
          Number(line.rejected_qty) === Number(line.received_qty) &&
          line.rejection_reason.trim().length > 0,
      );
      if (!allRejectedWithReason) {
        return 'Provide rejection reasons to reject quantities, or accept at least one line.';
      }
    }
    return null;
  };

  const handleReceive = async () => {
    if (!transfer) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = lines.map((line) => ({
      item_id: line.item_id!,
      received_qty: line.previously_received + Number(line.received_qty),
      accepted_qty: line.previously_accepted + Number(line.accepted_qty),
      rejected_qty: line.previously_rejected + Number(line.rejected_qty),
      rejection_reason: line.rejection_reason.trim() || null,
    }));

    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Transfer received (mock).');
      onOpenChange(false);
      return;
    }

    try {
      await receiveTransfer.mutateAsync({ transferId: transfer.id, lines: payload });
      toast.success('Transfer received — stock updated.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to receive transfer');
    }
  };

  const handleCancelRemainder = async () => {
    if (!transfer) return;
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required.');
      return;
    }
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('Transfer cancelled (mock).');
      onOpenChange(false);
      return;
    }
    try {
      await cancelTransfer.mutateAsync({ transferId: transfer.id, reason: cancelReason.trim() });
      toast.success('Remaining transfer qty returned to source store.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel transfer');
    }
  };

  const title = transfer?.transfer_number ?? 'Receive transfer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(90dvh,52rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl',
        )}
      >
        <DialogHeader className="shrink-0 gap-1 border-b px-4 pb-3 pt-3 pr-12 text-left">
          <DialogTitle className={cn('text-base font-medium', transfer?.transfer_number && 'font-mono')}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          {transferLoading ? (
            <p className="text-sm text-muted-foreground">Loading transfer…</p>
          ) : transfer ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Source store</Label>
                  <Input className="h-9" value={transfer.from_store} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Destination store</Label>
                  <Input className="h-9" value={transfer.to_store} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Dispatch date</Label>
                  <Input className="h-9" value={transfer.transfer_date} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Linked indent</Label>
                  <Input
                    className="h-9"
                    value={linkedIndent?.indent_number ?? transfer.indent_number ?? '—'}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <Label className="mb-2 block">Items — this receipt</Label>
                <div className="flex flex-col gap-3">
                  {lines.map((line) => (
                    <div key={line.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">
                        <span className="mr-1 font-mono text-xs text-muted-foreground">{line.item_code}</span>
                        {line.item_name}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                        <div className="grid gap-1">
                          <Label className="text-xs">Dispatched</Label>
                          <Input className="h-9 tabular-nums" value={line.dispatched_qty ?? 0} disabled readOnly />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Previously received</Label>
                          <Input className="h-9 tabular-nums" value={line.previously_received} disabled readOnly />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Remaining</Label>
                          <Input className="h-9 tabular-nums" value={line.remaining_qty} disabled readOnly />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Received now</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            className="h-9 tabular-nums"
                            value={line.received_qty}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateLine(line.id, { received_qty: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Accepted now</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            className="h-9 tabular-nums"
                            value={line.accepted_qty}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateLine(line.id, { accepted_qty: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Rejected now</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            className="h-9 tabular-nums"
                            value={line.rejected_qty}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateLine(line.id, { rejected_qty: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                      {line.rejected_qty > 0 ? (
                        <div className="mt-2 grid gap-1">
                          <Label className="text-xs">Rejection reason</Label>
                          <Input
                            className="h-9"
                            value={line.rejection_reason}
                            disabled={readOnly}
                            onChange={(e) => updateLine(line.id, { rejection_reason: e.target.value })}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {!readOnly && canCancelRemainder ? (
                <div className="rounded-md border border-dashed p-3">
                  <Label className="text-xs">Cancel remaining in-transit qty</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Returns undelivered stock to the source store and closes this transfer.
                  </p>
                  <Input
                    className="mt-2 h-9"
                    placeholder="Cancellation reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={cancelTransfer.isPending}
                    onClick={() => void handleCancelRemainder()}
                  >
                    Cancel remaining qty
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex shrink-0 border-t bg-background px-4 py-3">
          {readOnly ? (
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="ml-auto">
                Close
              </Button>
            </DialogClose>
          ) : (
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              disabled={receiveTransfer.isPending || transferLoading}
              onClick={() => void handleReceive()}
            >
              Confirm receipt
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
