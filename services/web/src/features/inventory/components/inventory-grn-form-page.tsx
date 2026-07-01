import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, useEffect } from 'react';
import { Plus, Save, Send, Trash2, Upload } from 'lucide-react';
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
import { EMPTY_GRN_LINE } from '../mock/fixtures';
import { useInventoryItems, useInventoryManufacturers, useInventoryStores } from '../api/queries';
import type { InventoryGrnLineDraft, InventoryGrnType } from '../types';
import { InventoryPanel } from './inventory-kpi-card';
import { InventoryPageShell } from './inventory-page-shell';

const GRN_TYPES: InventoryGrnType[] = ['Purchase', 'Transfer'];

function generateGrnNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `GRN-${date}-${suffix}`;
}

export function InventoryGrnFormPage() {
  const navigate = useNavigate();
  const { data: stores = [] } = useInventoryStores();
  const { data: manufacturers = [] } = useInventoryManufacturers();
  const { data: items = [] } = useInventoryItems();

  const grnNumber = useMemo(() => generateGrnNumber(), []);
  const [grnType, setGrnType] = useState<InventoryGrnType>('Purchase');
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [storeId, setStoreId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('mfr-none');
  const [purchaseIndentId, setPurchaseIndentId] = useState('none');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [registerPageNo, setRegisterPageNo] = useState('');
  const [lines, setLines] = useState<InventoryGrnLineDraft[]>([EMPTY_GRN_LINE()]);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [storeId, stores]);

  const updateLine = (lineId: string, patch: Partial<InventoryGrnLineDraft>) => {
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
    toast.success('GRN draft saved (mock). API integration will persist this form.');
    void navigate({ to: '/inventory/grn-logs' });
  };

  const handleSubmit = () => {
    toast.success('GRN submitted (mock). Stock ledger update will connect to inventory APIs.');
    void navigate({ to: '/inventory/grn-logs' });
  };

  return (
    <InventoryPageShell
      title={grnNumber}
      breadcrumbs={[
        { label: 'Inventory', to: '/inventory/dashboard' },
        { label: 'GRN logs', to: '/inventory/grn-logs' },
        { label: grnNumber },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/inventory/grn-logs">Cancel</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft}>
            <Save className="size-4" aria-hidden />
            Save draft
          </Button>
          <Button type="button" size="sm" className="gap-1.5" onClick={handleSubmit}>
            <Send className="size-4" aria-hidden />
            Submit GRN
          </Button>
        </div>
      }
    >
      <InventoryPanel title="GRN Details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>
              GRN type <span className="text-destructive">*</span>
            </Label>
            <Select value={grnType} onValueChange={(value) => setGrnType(value as InventoryGrnType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grn-date">
              GRN date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="grn-date"
              type="date"
              value={grnDate}
              onChange={(event) => setGrnDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Store <span className="text-destructive">*</span>
            </Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
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
            <Label>
              Manufacturer <span className="text-destructive">*</span>
            </Label>
            <Select value={manufacturerId} onValueChange={setManufacturerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {manufacturers.map((manufacturer) => (
                  <SelectItem key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Purchase Indent (optional)</Label>
            <Select value={purchaseIndentId} onValueChange={setPurchaseIndentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voucher-number">
              Voucher / Invoice no. <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voucher-number"
              value={voucherNumber}
              onChange={(event) => setVoucherNumber(event.target.value)}
            />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="grn-remarks">Remarks (max 250)</Label>
            <Input
              id="grn-remarks"
              value={remarks}
              maxLength={250}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-page">Register page no.</Label>
            <Input
              id="register-page"
              value={registerPageNo}
              onChange={(event) => setRegisterPageNo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Shipment Image / PDF</Label>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Upload className="size-4" aria-hidden />
              Upload
            </Button>
          </div>
        </div>
      </InventoryPanel>

      <InventoryPanel title="Items">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Code</th>
                <th className="px-2 py-2 font-medium">Item name</th>
                <th className="px-2 py-2 font-medium">UOM</th>
                <th className="px-2 py-2 font-medium">Req.</th>
                <th className="px-2 py-2 font-medium">Rem.</th>
                <th className="px-2 py-2 font-medium">GRN qty *</th>
                <th className="px-2 py-2 font-medium">Amount *</th>
                <th className="px-2 py-2 font-medium">Batch No *</th>
                <th className="px-2 py-2 font-medium">Expiry Date *</th>
                <th className="px-2 py-2 font-medium">Storage</th>
                <th className="px-2 py-2 font-medium">Remarks</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b align-top">
                  <td className="px-2 py-2 text-muted-foreground">{line.item_code || '—'}</td>
                  <td className="px-2 py-2">
                    <Select
                      value={line.item_id || ''}
                      onValueChange={(value) => handleItemSelect(line.id, value)}
                    >
                      <SelectTrigger className="min-w-[240px]">
                        <SelectValue placeholder="Search by code or name…" />
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
                  <td className="px-2 py-2 text-muted-foreground">{line.uom || '—'}</td>
                  <td className="px-2 py-2 text-muted-foreground">—</td>
                  <td className="px-2 py-2 text-muted-foreground">—</td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={line.grn_qty}
                      onChange={(event) =>
                        updateLine(line.id, { grn_qty: Number(event.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={line.amount}
                      onChange={(event) =>
                        updateLine(line.id, { amount: Number(event.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Batch"
                      value={line.batch_no}
                      onChange={(event) => updateLine(line.id, { batch_no: event.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="date"
                      value={line.expiry_date}
                      onChange={(event) => updateLine(line.id, { expiry_date: event.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Location"
                      value={line.storage}
                      onChange={(event) => updateLine(line.id, { storage: event.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Remarks…"
                      value={line.remarks}
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
          onClick={() => setLines((prev) => [...prev, EMPTY_GRN_LINE()])}
        >
          <Plus className="size-4" aria-hidden />
          Add item
        </Button>
      </InventoryPanel>
    </InventoryPageShell>
  );
}
