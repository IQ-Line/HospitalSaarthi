import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { cn } from '@pulse/utils';
import {
  useInventoryTransferCancel,
  useInventoryTransferCreate,
  useInventoryTransferDispatch,
} from '../api/transfer-mutations';
import {
  useInventoryItems,
  useInventoryIndentDetail,
  useInventoryStock,
} from '../api/queries';
import { EMPTY_TRANSFER_LINE } from '../mock/fixtures';
import {
  mapIndentToTransferPrefill,
  validateIndentForTransferPrefill,
} from '../lib/transfer-indent-prefill';
import type { InventoryOperationalVariant } from '../lib/inventory-operational-variant';
import { useOperationalStoreOptions } from '../lib/use-operational-store-options';
import type {
  InventoryIndentRow,
  InventoryTransferLine,
  InventoryTransferRow,
  InventoryTransferType,
} from '../types';

const REMARKS_MAX = 250;

type InventoryTransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: InventoryTransferRow | null;
  transferLoading?: boolean;
  indentPrefill?: InventoryIndentRow | null;
  variant?: InventoryOperationalVariant;
};

function isReadOnly(transfer: InventoryTransferRow | null): boolean {
  return transfer != null && transfer.status !== 'Draft';
}

function formatTransferType(type: InventoryTransferType): string {
  return type === 'emergency' ? 'Emergency' : 'Normal';
}

export function InventoryTransferDialog({
  open,
  onOpenChange,
  transfer,
  transferLoading = false,
  indentPrefill,
  variant = 'inventory',
}: InventoryTransferDialogProps) {
  const { stores } = useOperationalStoreOptions(variant);
  const { data: items = [] } = useInventoryItems();
  const linkedIndentId = transfer?.inventory_indent_id ?? indentPrefill?.id;
  const { data: linkedIndent } = useInventoryIndentDetail(linkedIndentId ?? undefined);
  const createTransfer = useInventoryTransferCreate();
  const dispatchTransfer = useInventoryTransferDispatch();
  const cancelTransfer = useInventoryTransferCancel();
  const readOnly = isReadOnly(transfer);
  const indentLocked = Boolean(indentPrefill);

  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [transferType, setTransferType] = useState<InventoryTransferType>('normal');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<InventoryTransferLine[]>([EMPTY_TRANSFER_LINE()]);
  const [linkedIndentNumber, setLinkedIndentNumber] = useState<string | null>(null);

  const { data: stockData } = useInventoryStock({
    store_id: fromStoreId || undefined,
  });

  const availableQtyByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockData?.data ?? []) {
      map.set(row.id, row.quantity);
    }
    return map;
  }, [stockData?.data]);

  useEffect(() => {
    if (!open || transferLoading) return;
    if (transfer) {
      setTransferDate(transfer.transfer_date);
      setFromStoreId(transfer.from_store_id ?? '');
      setToStoreId(transfer.to_store_id ?? '');
      setTransferType(transfer.transfer_type);
      setRemarks(transfer.remarks ?? '');
      setLines(transfer.lines.length > 0 ? transfer.lines : [EMPTY_TRANSFER_LINE()]);
      setLinkedIndentNumber(linkedIndent?.indent_number ?? null);
      return;
    }
    if (indentPrefill) {
      const validation = validateIndentForTransferPrefill(indentPrefill);
      if (!validation.ok) {
        toast.error(validation.message);
        return;
      }
      const prefill = mapIndentToTransferPrefill(indentPrefill, availableQtyByItemId);
      setTransferDate(prefill.transferDate);
      setFromStoreId(prefill.fromStoreId);
      setToStoreId(prefill.toStoreId);
      setTransferType(prefill.transferType);
      setRemarks(prefill.remarks);
      setLines(prefill.lines);
      setLinkedIndentNumber(indentPrefill.indent_number);
      return;
    }
    setTransferDate(new Date().toISOString().slice(0, 10));
    setFromStoreId('');
    setToStoreId('');
    setTransferType('normal');
    setRemarks('');
    setLines([EMPTY_TRANSFER_LINE()]);
    setLinkedIndentNumber(null);
  }, [open, transfer, transferLoading, indentPrefill, availableQtyByItemId, linkedIndent?.indent_number]);

  useEffect(() => {
    if (!open || transfer || !indentPrefill || !fromStoreId) return;
    setLines((prev) =>
      prev.map((line) => {
        if (!line.item_id) return line;
        const availableQty = availableQtyByItemId.get(line.item_id) ?? 0;
        const approvedQty = line.approved_qty ?? line.quantity;
        return {
          ...line,
          available_qty: availableQty,
          quantity: Math.min(approvedQty, availableQty > 0 ? availableQty : approvedQty),
        };
      }),
    );
  }, [availableQtyByItemId, fromStoreId, indentPrefill, open, transfer]);

  const updateLine = (lineId: string, patch: Partial<InventoryTransferLine>) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    const availableQty = availableQtyByItemId.get(item.id) ?? 0;
    updateLine(lineId, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      uom: item.uom,
      available_qty: availableQty,
    });
  };

  const buildPayloadLines = () =>
    lines
      .filter((line) => line.item_id && Number(line.quantity) > 0)
      .map((line, index) => ({
        item_id: line.item_id!,
        transfer_qty: Number(line.quantity),
        line_remarks: line.line_remarks?.trim() || null,
        sort_order: index,
      }));

  const validateBeforeSubmit = (): string | null => {
    if (!fromStoreId || !toStoreId) return 'Select both source and destination stores.';
    if (fromStoreId === toStoreId) return 'Source and destination stores must be different.';
    const payloadLines = buildPayloadLines();
    if (payloadLines.length === 0) return 'Add at least one item with dispatch quantity greater than zero.';

    for (const line of lines) {
      if (!line.item_id || Number(line.quantity) <= 0) continue;
      const approved = line.approved_qty;
      const available = line.available_qty;
      const dispatch = Number(line.quantity);
      if (approved != null && dispatch > approved) {
        return `${line.item_name}: dispatch qty cannot exceed approved qty (${approved}).`;
      }
      if (available != null && dispatch > available) {
        return `${line.item_name}: dispatch qty cannot exceed available stock (${available}).`;
      }
    }
    return null;
  };

  const handleDispatch = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payloadLines = buildPayloadLines();
    const dispatchLines = payloadLines.map((line) => ({
      item_id: line.item_id,
      dispatch_qty: line.transfer_qty,
    }));

    try {
      let transferId = transfer?.id;
      if (!transferId) {
        const created = await createTransfer.mutateAsync({
          transfer_date: transferDate,
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          transfer_type: transferType,
          remarks: remarks.trim() || null,
          inventory_indent_id: indentPrefill?.id ?? null,
          lines: payloadLines,
        });
        transferId = created.id;
      }
      await dispatchTransfer.mutateAsync({ transferId, lines: dispatchLines });
      toast.success('Stock dispatched from source store.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to dispatch transfer');
    }
  };

  const handleCancelDraft = async () => {
    if (!transfer?.id) return;
    try {
      await cancelTransfer.mutateAsync({ transferId: transfer.id, reason: 'Draft cancelled' });
      toast.success('Draft transfer cancelled.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel transfer');
    }
  };

  const title =
    transfer?.transfer_number ?? (transfer ? 'Transfer' : 'New Transfer');

  const destinationStores = stores.filter((store) => store.id !== fromStoreId);
  const isPending =
    createTransfer.isPending || dispatchTransfer.isPending || cancelTransfer.isPending;

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
          ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {linkedIndentNumber ? (
                <div className="grid min-w-0 gap-2 sm:col-span-2">
                  <Label>Linked indent</Label>
                  <Input className="h-9" value={linkedIndentNumber} readOnly disabled />
                </div>
              ) : null}
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="xfer-from-store">
                  Source store <span className="text-destructive">*</span>
                </Label>
                <Select value={fromStoreId || undefined} onValueChange={setFromStoreId} disabled={readOnly || indentLocked}>
                  <SelectTrigger id="xfer-from-store" className="h-9 w-full min-w-0">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_code} — {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="xfer-to-store">
                  Destination store <span className="text-destructive">*</span>
                </Label>
                <Select value={toStoreId || undefined} onValueChange={setToStoreId} disabled={readOnly || indentLocked}>
                  <SelectTrigger id="xfer-to-store" className="h-9 w-full min-w-0">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_code} — {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="xfer-date">Transfer date</Label>
                <Input
                  id="xfer-date"
                  type="date"
                  className="h-9 w-full [color-scheme:light] dark:[color-scheme:dark]"
                  value={transferDate}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={readOnly}
                  onChange={(event) => setTransferDate(event.target.value)}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="xfer-type">Transfer type</Label>
                <Select
                  value={transferType}
                  onValueChange={(value) => setTransferType(value as InventoryTransferType)}
                  disabled={readOnly}
                >
                  <SelectTrigger id="xfer-type" className="h-9 w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="xfer-remarks">Remarks (max {REMARKS_MAX})</Label>
              <Input
                id="xfer-remarks"
                className="h-9"
                value={remarks}
                maxLength={REMARKS_MAX}
                disabled={readOnly}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </div>

            <div className="border-t pt-3">
              <div className="mb-2 flex items-center justify-between">
                <Label>Items</Label>
                {!readOnly && !indentLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLines((prev) => [...prev, EMPTY_TRANSFER_LINE()])}
                  >
                    Add line
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {lines.map((line) => (
                  <div key={line.id} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex justify-between gap-2">
                      <div className="grid min-w-0 flex-1 gap-1">
                        <Label className="text-xs">Item</Label>
                        {indentLocked || readOnly ? (
                          <p className="text-sm">
                            <span className="mr-1 font-mono text-xs text-muted-foreground">{line.item_code}</span>
                            {line.item_name}
                          </p>
                        ) : (
                          <Select
                            value={line.item_id || undefined}
                            onValueChange={(value) => handleItemSelect(line.id, value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <span className="mr-1 font-mono text-xs text-muted-foreground">
                                    {item.code}
                                  </span>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {!readOnly && !indentLocked && lines.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-5 shrink-0"
                          aria-label="Remove line"
                          onClick={() => setLines((prev) => prev.filter((entry) => entry.id !== line.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {line.requested_qty != null ? (
                        <div className="grid gap-1">
                          <Label className="text-xs">Requested</Label>
                          <Input className="h-9 tabular-nums" value={line.requested_qty} readOnly disabled />
                        </div>
                      ) : null}
                      {line.approved_qty != null ? (
                        <div className="grid gap-1">
                          <Label className="text-xs">Approved</Label>
                          <Input className="h-9 tabular-nums" value={line.approved_qty} readOnly disabled />
                        </div>
                      ) : null}
                      {line.available_qty != null ? (
                        <div className="grid gap-1">
                          <Label className="text-xs">Available</Label>
                          <Input className="h-9 tabular-nums" value={line.available_qty} readOnly disabled />
                        </div>
                      ) : null}
                      <div className="grid gap-1">
                        <Label className="text-xs">Dispatch ({line.uom || '—'})</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          className="h-9 tabular-nums"
                          value={line.quantity || ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateLine(line.id, { quantity: Number(event.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {transfer ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Status: {transfer.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Type: {formatTransferType(transfer.transfer_type)}
                </p>
              </div>
            ) : null}
          </div>
          )}
        </div>

        <div className="mt-auto flex shrink-0 border-t bg-background px-4 py-3">
          {readOnly ? (
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="ml-auto">
                Close
              </Button>
            </DialogClose>
          ) : (
            <div className="ml-auto flex gap-2">
              {transfer?.status === 'Draft' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending || transferLoading}
                  onClick={() => void handleCancelDraft()}
                >
                  Cancel draft
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => void handleDispatch()}
                disabled={isPending || transferLoading}
              >
                {transfer ? 'Dispatch transfer' : 'Create & dispatch'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
