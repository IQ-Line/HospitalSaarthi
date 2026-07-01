import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { EMPTY_INDENT_LINE } from '../mock/fixtures';
import { useInventoryItems, useInventoryStores } from '../api/queries';
import type { InventoryIndentLine } from '../types';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryPanel } from './inventory-kpi-card';

const INDENT_TYPES = [
  { value: 'store_transfer', label: 'Store transfer' },
  { value: 'pharmacy_refill', label: 'Pharmacy refill' },
  { value: 'emergency', label: 'Emergency' },
] as const;

const FULFILLMENT_OPTIONS = [
  { value: 'stock_transfer', label: 'Stock transfer' },
  { value: 'procurement', label: 'Procurement' },
] as const;

export function InventoryIndentFormPage() {
  const navigate = useNavigate();
  const { data: stores = [] } = useInventoryStores();
  const { data: items = [] } = useInventoryItems();

  const [indentDate, setIndentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fulfillment, setFulfillment] = useState<'stock_transfer' | 'procurement'>('stock_transfer');
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [indentType, setIndentType] = useState<'store_transfer' | 'pharmacy_refill' | 'emergency'>(
    'store_transfer',
  );
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'stat'>('normal');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<InventoryIndentLine[]>([EMPTY_INDENT_LINE()]);

  const totalQty = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.requested_qty) || 0), 0),
    [lines],
  );

  const updateLine = (lineId: string, patch: Partial<InventoryIndentLine>) => {
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
      qty_available: null,
      last_grn: null,
    });
  };

  const handleSaveDraft = () => {
    toast.success('Indent draft saved (mock). API integration will persist this form.');
    void navigate({ to: '/inventory/indents' });
  };

  return (
    <InventoryPageShell
      title="New indent"
      breadcrumbs={[
        { label: 'Inventory', to: '/inventory/dashboard' },
        { label: 'Indents', to: '/inventory/indents' },
        { label: 'New' },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/inventory/indents">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Link>
          </Button>
          <Button type="button" onClick={handleSaveDraft}>
            Save draft
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <InventoryPanel title="Indent details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="indent-date">Indent date</Label>
                <Input
                  id="indent-date"
                  type="date"
                  value={indentDate}
                  onChange={(event) => setIndentDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fulfillment</Label>
                <Select value={fulfillment} onValueChange={(v) => setFulfillment(v as typeof fulfillment)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From store</Label>
                <Select value={fromStoreId} onValueChange={setFromStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
              <div className="space-y-2">
                <Label>To store</Label>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
              <div className="space-y-2">
                <Label>Indent type</Label>
                <Select value={indentType} onValueChange={(v) => setIndentType(v as typeof indentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>Priority</Label>
              <ToggleGroup
                type="single"
                value={priority}
                onValueChange={(value) => {
                  if (value) setPriority(value as typeof priority);
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
                <ToggleGroupItem value="urgent">Urgent</ToggleGroupItem>
                <ToggleGroupItem value="stat">STAT</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="indent-remarks">Remarks</Label>
              <Textarea
                id="indent-remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
              />
            </div>
          </InventoryPanel>

          <InventoryPanel title={`Requested items (${lines.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium">Item code</th>
                    <th className="px-2 py-2 font-medium">Qty avail.</th>
                    <th className="px-2 py-2 font-medium">Base UOM</th>
                    <th className="px-2 py-2 font-medium">Req. qty</th>
                    <th className="px-2 py-2 font-medium">Last GRN</th>
                    <th className="px-2 py-2 font-medium">Remarks</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className="border-b align-top">
                      <td className="px-2 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-2">
                        <Select
                          value={line.item_id ?? ''}
                          onValueChange={(value) => handleItemSelect(line.id, value)}
                        >
                          <SelectTrigger className="min-w-[220px]">
                            <SelectValue placeholder="Search or scan item…" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{line.item_code || '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground">—</td>
                      <td className="px-2 py-2 text-muted-foreground">{line.uom || '—'}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-24"
                          value={line.requested_qty}
                          onChange={(event) =>
                            updateLine(line.id, { requested_qty: Number(event.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">—</td>
                      <td className="px-2 py-2">
                        <Input
                          value={line.remarks ?? ''}
                          placeholder="Remarks…"
                          onChange={(event) => updateLine(line.id, { remarks: event.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove line"
                          disabled={lines.length <= 1}
                          onClick={() => setLines((prev) => prev.filter((entry) => entry.id !== line.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setLines((prev) => [...prev, EMPTY_INDENT_LINE()])}
            >
              <Plus className="size-4" aria-hidden />
              Add item
            </Button>
          </InventoryPanel>
        </div>

        <InventoryPanel title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="font-medium tabular-nums">{lines.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total req. qty</dt>
              <dd className="font-medium tabular-nums">{totalQty || '—'}</dd>
            </div>
          </dl>
        </InventoryPanel>
      </div>
    </InventoryPageShell>
  );
}
