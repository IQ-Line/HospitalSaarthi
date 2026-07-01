import { useEffect, useState } from 'react';
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
import { useInventoryItems, useInventoryStores } from '../api/queries';
import { EMPTY_TRANSFER_LINE } from '../mock/fixtures';
import type {
  InventoryTransferLine,
  InventoryTransferRow,
  InventoryTransferType,
} from '../types';

const REMARKS_MAX = 250;

type InventoryTransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: InventoryTransferRow | null;
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
}: InventoryTransferDialogProps) {
  const { data: stores = [] } = useInventoryStores();
  const { data: items = [] } = useInventoryItems();
  const readOnly = isReadOnly(transfer);

  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [transferType, setTransferType] = useState<InventoryTransferType>('normal');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<InventoryTransferLine[]>([EMPTY_TRANSFER_LINE()]);

  useEffect(() => {
    if (!open) return;
    if (transfer) {
      setTransferDate(transfer.transfer_date);
      setFromStoreId(transfer.from_store_id ?? '');
      setToStoreId(transfer.to_store_id ?? '');
      setTransferType(transfer.transfer_type);
      setRemarks(transfer.remarks ?? '');
      setLines(transfer.lines.length > 0 ? transfer.lines : [EMPTY_TRANSFER_LINE()]);
      return;
    }
    setTransferDate(new Date().toISOString().slice(0, 10));
    setFromStoreId('');
    setToStoreId('');
    setTransferType('normal');
    setRemarks('');
    setLines([EMPTY_TRANSFER_LINE()]);
  }, [open, transfer]);

  const updateLine = (lineId: string, patch: Partial<InventoryTransferLine>) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      uom: item.uom,
    });
  };

  const handleSaveDraft = () => {
    if (!fromStoreId || !toStoreId) {
      toast.error('Select both source and destination stores.');
      return;
    }
    if (fromStoreId === toStoreId) {
      toast.error('Source and destination stores must be different.');
      return;
    }
    toast.success('Transfer draft saved (mock). API integration will persist this form.');
    onOpenChange(false);
  };

  const title =
    transfer?.transfer_number ??
    (transfer ? 'Transfer' : 'New Transfer');

  const destinationStores = stores.filter((store) => store.id !== fromStoreId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(90dvh,52rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl',
        )}
      >
        <DialogHeader className="shrink-0 gap-1 border-b px-4 pb-3 pt-3 pr-12 text-left">
          <DialogTitle className={cn('text-base font-medium', transfer?.transfer_number && 'font-mono')}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="xfer-from-store">
                  From store / location <span className="text-destructive">*</span>
                </Label>
                <Select value={fromStoreId || undefined} onValueChange={setFromStoreId} disabled={readOnly}>
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
                  To store / location <span className="text-destructive">*</span>
                </Label>
                <Select value={toStoreId || undefined} onValueChange={setToStoreId} disabled={readOnly}>
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
                <Label>Lines</Label>
                {!readOnly ? (
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
                        <Select
                          value={line.item_id || undefined}
                          onValueChange={(value) => handleItemSelect(line.id, value)}
                          disabled={readOnly}
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
                      </div>
                      {!readOnly && lines.length > 1 ? (
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Qty ({line.uom || '—'})</Label>
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
                      <div className="grid gap-1">
                        <Label className="text-xs">Line remarks</Label>
                        <Input
                          className="h-9"
                          value={line.line_remarks ?? ''}
                          disabled={readOnly}
                          onChange={(event) => updateLine(line.id, { line_remarks: event.target.value })}
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
        </div>

        <div className="mt-auto flex shrink-0 border-t bg-background px-4 py-3">
          {readOnly ? (
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="ml-auto">
                Close
              </Button>
            </DialogClose>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={handleSaveDraft}>
              Save draft
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
