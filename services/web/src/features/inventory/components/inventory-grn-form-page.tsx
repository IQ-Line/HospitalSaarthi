import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
import { Route } from '@/routes/_authenticated/inventory/grn-logs/new';
import type { InventorySvcGrnDetail } from '../api/api-types';
import {
  useInventoryGrnCreate,
  useInventoryGrnSubmit,
  useInventoryGrnUpdate,
} from '../api/mutations';
import { useInventoryGrnDetail, useInventoryItems, useInventoryStores } from '../api/queries';
import { useManufacturerMasterLookup } from '@/features/inventory-masters/api/manufacturer-lookup';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import {
  isManufacturerSelected,
  isPlaceholderManufacturerId,
  resolveManufacturerIdForPayload,
} from '../lib/resolve-manufacturer-id';
import { EMPTY_GRN_LINE } from '../mock/fixtures';
import type { InventoryGrnLineDraft, InventoryGrnType } from '../types';
import { InventoryPanel } from './inventory-kpi-card';
import { InventoryPageShell } from './inventory-page-shell';

const GRN_TYPES: InventoryGrnType[] = ['Purchase', 'Transfer'];

function mapApiLinesToDraft(lines: InventorySvcGrnDetail['lines']): InventoryGrnLineDraft[] {
  if (!lines?.length) return [EMPTY_GRN_LINE()];
  return lines.map((line) => ({
    id: line.id,
    item_id: line.item_id,
    item_code: line.item?.item_code ?? '',
    item_name: line.item?.name ?? '',
    uom: line.base_uom || line.item?.unit_of_measure || '',
    required_qty: null,
    remaining_qty: null,
    grn_qty: line.grn_qty,
    amount: line.purchase_rate,
    batch_no: line.lot_number,
    expiry_date: line.expiry_date ?? '',
    storage: line.storage_location ?? '',
    remarks: line.line_remarks ?? '',
  }));
}

export function InventoryGrnFormPage() {
  const navigate = useNavigate();
  const { grnId: grnIdFromUrl } = Route.useSearch();
  const { data: existingGrn, isLoading: isLoadingGrn } = useInventoryGrnDetail(grnIdFromUrl);
  const { data: stores = [] } = useInventoryStores();
  const {
    options: manufacturers,
    isLoading: isLoadingManufacturers,
    isError: manufacturersError,
  } = useManufacturerMasterLookup();
  const { data: items = [] } = useInventoryItems();
  const createGrn = useInventoryGrnCreate();
  const updateGrn = useInventoryGrnUpdate();
  const submitGrn = useInventoryGrnSubmit();

  const [grnId, setGrnId] = useState<string | null>(null);
  const [grnNumber, setGrnNumber] = useState('New GRN');
  const [grnType, setGrnType] = useState<InventoryGrnType>('Purchase');
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [storeId, setStoreId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [purchaseIndentId, setPurchaseIndentId] = useState('none');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [registerPageNo, setRegisterPageNo] = useState('');
  const [lines, setLines] = useState<InventoryGrnLineDraft[]>([EMPTY_GRN_LINE()]);

  const isSaving = createGrn.isPending || updateGrn.isPending || submitGrn.isPending;
  const isSubmitted = existingGrn?.status === 'submitted';
  const isReadOnly = isSubmitted;

  useEffect(() => {
    if (!existingGrn) return;
    setGrnId(existingGrn.id);
    setGrnNumber(existingGrn.grn_number);
    setGrnType(existingGrn.grn_type === 'purchase' ? 'Purchase' : 'Transfer');
    setGrnDate(existingGrn.grn_date);
    setStoreId(existingGrn.store_id);
    setManufacturerId(existingGrn.manufacturer_id ?? '');
    setVoucherNumber(existingGrn.voucher_invoice_no ?? '');
    setRegisterPageNo(existingGrn.register_page_no ?? '');
    setRemarks(existingGrn.remarks ?? '');
    setLines(mapApiLinesToDraft(existingGrn.lines));
  }, [existingGrn]);

  useEffect(() => {
    if (grnIdFromUrl) setGrnId(grnIdFromUrl);
  }, [grnIdFromUrl]);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [storeId, stores]);

  useEffect(() => {
    if (isPlaceholderManufacturerId(manufacturerId) || manufacturers.length === 0) return;
    if (!manufacturers.some((row) => row.id === manufacturerId)) {
      setManufacturerId('');
    }
  }, [manufacturerId, manufacturers]);

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

  const buildPayload = () => ({
    grn_type: grnType,
    grn_date: grnDate,
    store_id: storeId,
    manufacturer_id: resolveManufacturerIdForPayload(manufacturerId, manufacturers),
    voucher_invoice_no: voucherNumber,
    register_page_no: registerPageNo,
    remarks,
    lines,
  });

  const persistDraft = async (): Promise<string | null> => {
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      toast.success('GRN draft saved (mock). Enable VITE_INVENTORY_API_ENABLED for live APIs.');
      return null;
    }
    if (!storeId) {
      toast.error('Select a store');
      return null;
    }
    if (grnType === 'Purchase' && !isManufacturerSelected(manufacturerId, manufacturers)) {
      if (manufacturersError) {
        toast.error('Could not load manufacturers. Check master-data service and retry.');
      } else if (isLoadingManufacturers) {
        toast.error('Manufacturers are still loading. Please wait and try again.');
      } else if (manufacturers.length === 0) {
        toast.error('No manufacturers found. Add one under Inventory Supply Masters → Manufacturers.');
      } else {
        toast.error('Select a manufacturer for purchase GRN');
      }
      return null;
    }

    try {
      if (grnId) {
        const saved = await updateGrn.mutateAsync({ grnId, payload: buildPayload() });
        setGrnNumber(saved.grn_number);
        return saved.id;
      }
      const created = await createGrn.mutateAsync(buildPayload());
      setGrnId(created.id);
      setGrnNumber(created.grn_number);
      return created.id;
    } catch {
      toast.error('Failed to save GRN draft');
      return null;
    }
  };

  const handleSaveDraft = () => {
    void (async () => {
      const id = await persistDraft();
      if (id || !OPERATIONAL_INVENTORY_API_ENABLED) {
        if (OPERATIONAL_INVENTORY_API_ENABLED) toast.success('GRN draft saved');
        void navigate({ to: '/inventory/grn-logs' });
      }
    })();
  };

  const handleSubmit = () => {
    void (async () => {
      if (!OPERATIONAL_INVENTORY_API_ENABLED) {
        toast.success('GRN submitted (mock). Enable VITE_INVENTORY_API_ENABLED for live APIs.');
        void navigate({ to: '/inventory/grn-logs' });
        return;
      }

      const id = grnId ?? (await persistDraft());
      if (!id) return;

      try {
        await submitGrn.mutateAsync(id);
        toast.success('GRN submitted');
        void navigate({ to: '/inventory/grn-logs' });
      } catch {
        toast.error('Failed to submit GRN');
      }
    })();
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
          <Button type="button" variant="outline" size="sm" asChild disabled={isSaving}>
            <Link to="/inventory/grn-logs">Cancel</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isSaving || isReadOnly}
            onClick={handleSaveDraft}
          >
            <Save className="size-4" aria-hidden />
            Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={isSaving || isReadOnly}
            onClick={handleSubmit}
          >
            <Send className="size-4" aria-hidden />
            Submit GRN
          </Button>
        </div>
      }
    >
      {isLoadingGrn && grnIdFromUrl ? (
        <p className="text-sm text-muted-foreground">Loading GRN…</p>
      ) : null}

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
            <Select
              value={manufacturerId || '__none__'}
              onValueChange={(value) => setManufacturerId(value === '__none__' ? '' : value)}
              disabled={isReadOnly || isLoadingManufacturers}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingManufacturers
                      ? 'Loading manufacturers…'
                      : manufacturersError
                        ? 'Failed to load manufacturers'
                        : 'Select manufacturer'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select manufacturer</SelectItem>
                {manufacturers.map((manufacturer) => (
                  <SelectItem key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {manufacturersError ? (
              <p className="text-xs text-destructive">
                Could not load manufacturer master (master-data). Ensure master-data service is running.
              </p>
            ) : null}
            {!manufacturersError && !isLoadingManufacturers && manufacturers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No manufacturers in master. Add them under{' '}
                <Link to="/inventory-supply-masters/manufacturers" className="text-primary underline">
                  Inventory Supply Masters → Manufacturers
                </Link>
                .
              </p>
            ) : null}
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
