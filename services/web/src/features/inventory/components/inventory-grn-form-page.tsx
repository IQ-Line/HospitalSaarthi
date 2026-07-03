import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Save, Send, Trash2 } from 'lucide-react';
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
import { cn } from '@pulse/utils';
import { Route } from '@/routes/_authenticated/inventory/grn-logs/new';
import type { InventorySvcGrnDetail } from '../api/api-types';
import {
  useInventoryGrnCreate,
  useInventoryGrnSubmit,
  useInventoryGrnUpdate,
} from '../api/mutations';
import { mapUiGrnTypeToApi } from '../api/mappers';
import { useInventoryGrnDetail, useInventoryItems, useInventoryStores } from '../api/queries';
import { useManufacturerMasterLookup } from '@/features/inventory-masters/api/manufacturer-lookup';
import {
  findUomMasterOption,
  useUomMasterLookup,
} from '@/features/inventory-masters/api/uom-lookup';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import {
  firstGrnValidationMessage,
  validateGrnForm,
  type GrnFormValidationResult,
  type GrnHeaderFieldErrors,
  type GrnLineFieldErrors,
} from '../lib/grn-validation';
import {
  isPlaceholderManufacturerId,
  resolveManufacturerIdForPayload,
} from '../lib/resolve-manufacturer-id';
import { EMPTY_GRN_LINE } from '../mock/fixtures';
import type { InventoryGrnLineDraft, InventoryGrnType } from '../types';
import { calcGrnLineAmount } from '../types';
import { InventoryPanel } from './inventory-kpi-card';
import { InventoryPageShell } from './inventory-page-shell';
import { GrnDocumentUploadField } from './grn-document-upload-field';

const GRN_TYPES: InventoryGrnType[] = ['Purchase', 'Transfer'];

function mapApiLinesToDraft(lines: InventorySvcGrnDetail['lines']): InventoryGrnLineDraft[] {
  if (!lines?.length) return [EMPTY_GRN_LINE()];
  return lines.map((line) => ({
    id: line.id,
    item_id: line.item_id,
    item_code: line.item?.item_code ?? '',
    item_name: line.item?.name ?? '',
    uom: line.base_uom || line.item?.unit_of_measure || '',
    purchase_uom: line.purchase_uom ?? '',
    required_qty: line.requested_qty,
    remaining_qty: line.requested_qty,
    grn_qty: line.grn_qty,
    purchase_rate: line.purchase_rate,
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
  const {
    options: uoms,
    isLoading: isLoadingUoms,
    isError: uomsError,
  } = useUomMasterLookup();
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
  const [indentNumber, setIndentNumber] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [registerPageNo, setRegisterPageNo] = useState('');
  const [shipmentDocumentPath, setShipmentDocumentPath] = useState<string | null>(null);
  const [voucherDocumentPath, setVoucherDocumentPath] = useState<string | null>(null);
  const [lines, setLines] = useState<InventoryGrnLineDraft[]>([EMPTY_GRN_LINE()]);
  const [validationErrors, setValidationErrors] = useState<GrnFormValidationResult>({
    ok: true,
    header: {},
    lines: {},
  });

  const isSaving = createGrn.isPending || updateGrn.isPending || submitGrn.isPending;
  const isSubmitted = existingGrn?.status === 'submitted';
  const isReadOnly = isSubmitted;
  const headerErrors = validationErrors.header;
  const lineErrors = validationErrors.lines;

  const clearHeaderError = (field: keyof GrnHeaderFieldErrors) => {
    setValidationErrors((prev) => {
      if (!prev.header[field]) return prev;
      const nextHeader = { ...prev.header };
      delete nextHeader[field];
      return { ...prev, ok: false, header: nextHeader };
    });
  };

  const clearLineError = (lineId: string, field: keyof GrnLineFieldErrors) => {
    setValidationErrors((prev) => {
      const current = prev.lines[lineId];
      if (!current?.[field]) return prev;
      const nextLine = { ...current };
      delete nextLine[field];
      const nextLines = { ...prev.lines };
      if (Object.keys(nextLine).length === 0) {
        delete nextLines[lineId];
      } else {
        nextLines[lineId] = nextLine;
      }
      return { ...prev, lines: nextLines };
    });
  };

  const buildValidationInput = () => ({
    grn_type: mapUiGrnTypeToApi(grnType),
    grn_date: grnDate,
    store_id: storeId,
    vendor_id: resolveManufacturerIdForPayload(manufacturerId, manufacturers) ?? '',
    voucher_invoice_no: voucherNumber,
    remarks,
    register_page_no: registerPageNo,
    lines: lines.map((line) => ({
      id: line.id,
      item_id: line.item_id,
      grn_qty: line.grn_qty,
      purchase_rate: line.purchase_rate,
      batch_no: line.batch_no,
      expiry_date: line.expiry_date,
      required_qty: line.required_qty,
      tracking_mode: line.tracking_mode,
      is_expirable: line.is_expirable,
    })),
  });

  const runValidation = (mode: 'draft' | 'submit'): boolean => {
    const result = validateGrnForm(buildValidationInput(), mode);
    setValidationErrors(result);
    if (!result.ok) {
      toast.error(firstGrnValidationMessage(result) ?? 'Please fix validation errors');
    }
    return result.ok;
  };

  useEffect(() => {
    if (!existingGrn) return;
    setGrnId(existingGrn.id);
    setGrnNumber(existingGrn.grn_number);
    setGrnType(existingGrn.grn_type === 'purchase' ? 'Purchase' : 'Transfer');
    setGrnDate(existingGrn.grn_date);
    setStoreId(existingGrn.store_id);
    setManufacturerId(existingGrn.manufacturer_id ?? '');
    setIndentNumber(existingGrn.indent_number ?? '');
    setVoucherNumber(existingGrn.voucher_invoice_no ?? '');
    setRegisterPageNo(existingGrn.register_page_no ?? '');
    setRemarks(existingGrn.remarks ?? '');
    setShipmentDocumentPath(existingGrn.shipment_document_path ?? null);
    setVoucherDocumentPath(existingGrn.voucher_document_path ?? null);
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
    const baseUom = findUomMasterOption(item.uom, uoms);
    updateLine(lineId, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      uom: baseUom?.abbreviation ?? item.uom,
      purchase_uom: baseUom?.abbreviation ?? '',
      tracking_mode: item.tracking_mode,
      is_expirable: item.is_expirable,
    });
    clearLineError(lineId, 'item_id');
  };

  const handlePurchaseUomSelect = (lineId: string, uomId: string) => {
    if (uomId === '__none__') {
      updateLine(lineId, { purchase_uom: '' });
      return;
    }
    const uom = uoms.find((row) => row.id === uomId);
    updateLine(lineId, { purchase_uom: uom?.abbreviation ?? '' });
  };

  const buildPayload = () => ({
    grn_type: grnType,
    grn_date: grnDate,
    store_id: storeId,
    manufacturer_id: resolveManufacturerIdForPayload(manufacturerId, manufacturers),
    indent_number: indentNumber.trim() || undefined,
    voucher_invoice_no: voucherNumber,
    register_page_no: registerPageNo,
    remarks,
    lines,
    uomOptions: uoms,
  });

  const persistDraft = async (): Promise<string | null> => {
    if (!OPERATIONAL_INVENTORY_API_ENABLED) {
      if (!runValidation('draft')) return null;
      toast.success('GRN draft saved (mock). Enable VITE_INVENTORY_API_ENABLED for live APIs.');
      return null;
    }
    if (!runValidation('draft')) return null;

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
      if (!runValidation('submit')) return;

      if (!OPERATIONAL_INVENTORY_API_ENABLED) {
        toast.success('GRN submitted (mock). Enable VITE_INVENTORY_API_ENABLED for live APIs.');
        void navigate({ to: '/inventory/grn-logs' });
        return;
      }

      const id = await persistDraft();
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
              aria-invalid={Boolean(headerErrors.grn_date)}
              className={cn(headerErrors.grn_date && 'border-destructive')}
              onChange={(event) => {
                setGrnDate(event.target.value);
                clearHeaderError('grn_date');
              }}
            />
            {headerErrors.grn_date ? (
              <p className="text-xs text-destructive">{headerErrors.grn_date}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Store <span className="text-destructive">*</span>
            </Label>
            <Select
              value={storeId}
              onValueChange={(value) => {
                setStoreId(value);
                clearHeaderError('store_id');
              }}
            >
              <SelectTrigger className={cn(headerErrors.store_id && 'border-destructive')}>
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
            {headerErrors.store_id ? (
              <p className="text-xs text-destructive">{headerErrors.store_id}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Vendor
              {grnType === 'Purchase' ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Select
              value={manufacturerId || '__none__'}
              onValueChange={(value) => {
                setManufacturerId(value === '__none__' ? '' : value);
                clearHeaderError('vendor_id');
              }}
              disabled={isReadOnly || isLoadingManufacturers}
            >
              <SelectTrigger className={cn(headerErrors.vendor_id && 'border-destructive')}>
                <SelectValue
                  placeholder={
                    isLoadingManufacturers
                      ? 'Loading vendors…'
                      : manufacturersError
                        ? 'Failed to load vendors'
                        : 'Select vendor'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select vendor</SelectItem>
                {manufacturers.map((manufacturer) => (
                  <SelectItem key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {headerErrors.vendor_id ? (
              <p className="text-xs text-destructive">{headerErrors.vendor_id}</p>
            ) : null}
            {manufacturersError ? (
              <p className="text-xs text-destructive">
                Could not load vendor master. Ensure master-data service is running.
              </p>
            ) : null}
            {!manufacturersError && !isLoadingManufacturers && manufacturers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No vendors in master. Add suppliers under{' '}
                <Link to="/inventory-supply-masters/manufacturers" className="text-primary underline">
                  Inventory Supply Masters → Manufacturers
                </Link>{' '}
                until Vendor Master is available.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="indent-number">Purchase indent no. (optional)</Label>
            <Input
              id="indent-number"
              value={indentNumber}
              placeholder="e.g. IND-202606-00013"
              onChange={(event) => setIndentNumber(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              When provided, this GRN will be linked to the purchase indent.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voucher-number">
              Voucher / Invoice no.
              {grnType === 'Purchase' ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              id="voucher-number"
              value={voucherNumber}
              aria-invalid={Boolean(headerErrors.voucher_invoice_no)}
              className={cn(headerErrors.voucher_invoice_no && 'border-destructive')}
              onChange={(event) => {
                setVoucherNumber(event.target.value);
                clearHeaderError('voucher_invoice_no');
              }}
            />
            {headerErrors.voucher_invoice_no ? (
              <p className="text-xs text-destructive">{headerErrors.voucher_invoice_no}</p>
            ) : null}
          </div>
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="grn-remarks">Remarks (max 250)</Label>
            <Input
              id="grn-remarks"
              value={remarks}
              maxLength={250}
              aria-invalid={Boolean(headerErrors.remarks)}
              className={cn(headerErrors.remarks && 'border-destructive')}
              onChange={(event) => {
                setRemarks(event.target.value);
                clearHeaderError('remarks');
              }}
            />
            {headerErrors.remarks ? (
              <p className="text-xs text-destructive">{headerErrors.remarks}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-page">Register page no.</Label>
            <Input
              id="register-page"
              value={registerPageNo}
              aria-invalid={Boolean(headerErrors.register_page_no)}
              className={cn(headerErrors.register_page_no && 'border-destructive')}
              onChange={(event) => {
                setRegisterPageNo(event.target.value);
                clearHeaderError('register_page_no');
              }}
            />
            {headerErrors.register_page_no ? (
              <p className="text-xs text-destructive">{headerErrors.register_page_no}</p>
            ) : null}
          </div>
          <GrnDocumentUploadField
            kind="shipment"
            label="Shipment image / PDF"
            grnId={grnId}
            documentPath={shipmentDocumentPath}
            onDocumentPathChange={setShipmentDocumentPath}
            disabled={isReadOnly}
            apiEnabled={OPERATIONAL_INVENTORY_API_ENABLED}
            ensureDraftSaved={persistDraft}
          />
          <GrnDocumentUploadField
            kind="voucher"
            label="Voucher document"
            grnId={grnId}
            documentPath={voucherDocumentPath}
            onDocumentPathChange={setVoucherDocumentPath}
            disabled={isReadOnly}
            apiEnabled={OPERATIONAL_INVENTORY_API_ENABLED}
            ensureDraftSaved={persistDraft}
          />
        </div>
      </InventoryPanel>

      <InventoryPanel title="Items">
        {validationErrors.general ? (
          <p className="mb-3 text-sm text-destructive">{validationErrors.general}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Code</th>
                <th className="px-2 py-2 font-medium">Item name *</th>
                <th className="px-2 py-2 font-medium">UOM</th>
                <th className="px-2 py-2 font-medium">Purchase unit</th>
                <th className="px-2 py-2 font-medium">Req.</th>
                <th className="px-2 py-2 font-medium">GRN qty *</th>
                <th className="px-2 py-2 font-medium">Purchase rate *</th>
                <th className="px-2 py-2 font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Batch no.</th>
                <th className="px-2 py-2 font-medium">Expiry</th>
                <th className="px-2 py-2 font-medium">Storage</th>
                <th className="px-2 py-2 font-medium">Remarks</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const errors = lineErrors[line.id] ?? {};
                return (
                <tr key={line.id} className="border-b align-top">
                  <td className="px-2 py-2 text-muted-foreground">{line.item_code || '—'}</td>
                  <td className="px-2 py-2">
                    <Select
                      value={line.item_id || ''}
                      onValueChange={(value) => handleItemSelect(line.id, value)}
                    >
                      <SelectTrigger className={cn('min-w-[240px]', errors.item_id && 'border-destructive')}>
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
                    {errors.item_id ? (
                      <p className="mt-1 text-xs text-destructive">{errors.item_id}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{line.uom || '—'}</td>
                  <td className="px-2 py-2">
                    <Select
                      value={findUomMasterOption(line.purchase_uom, uoms)?.id ?? '__none__'}
                      onValueChange={(value) => handlePurchaseUomSelect(line.id, value)}
                      disabled={isReadOnly || isLoadingUoms}
                    >
                      <SelectTrigger className="min-w-[120px]">
                        <SelectValue
                          placeholder={
                            isLoadingUoms
                              ? 'Loading…'
                              : uomsError
                                ? 'UOM unavailable'
                                : 'Select unit'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {uoms.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.abbreviation} — {uom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {uomsError ? (
                      <p className="mt-1 text-xs text-destructive">Could not load UOM master</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground tabular-nums">
                    {line.required_qty != null ? line.required_qty : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className={cn('w-20', errors.grn_qty && 'border-destructive')}
                      value={line.grn_qty}
                      disabled={isReadOnly}
                      aria-invalid={Boolean(errors.grn_qty)}
                      onChange={(event) => {
                        updateLine(line.id, { grn_qty: Number(event.target.value) || 0 });
                        clearLineError(line.id, 'grn_qty');
                      }}
                    />
                    {errors.grn_qty ? (
                      <p className="mt-1 text-xs text-destructive">{errors.grn_qty}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className={cn('w-24', errors.purchase_rate && 'border-destructive')}
                      value={line.purchase_rate}
                      disabled={isReadOnly}
                      aria-invalid={Boolean(errors.purchase_rate)}
                      onChange={(event) => {
                        updateLine(line.id, { purchase_rate: Number(event.target.value) || 0 });
                        clearLineError(line.id, 'purchase_rate');
                      }}
                    />
                    {errors.purchase_rate ? (
                      <p className="mt-1 text-xs text-destructive">{errors.purchase_rate}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground tabular-nums">
                    {calcGrnLineAmount(line.grn_qty, line.purchase_rate).toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Batch"
                      value={line.batch_no}
                      disabled={isReadOnly}
                      aria-invalid={Boolean(errors.batch_no)}
                      className={cn(errors.batch_no && 'border-destructive')}
                      onChange={(event) => {
                        updateLine(line.id, { batch_no: event.target.value });
                        clearLineError(line.id, 'batch_no');
                      }}
                    />
                    {errors.batch_no ? (
                      <p className="mt-1 text-xs text-destructive">{errors.batch_no}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="date"
                      value={line.expiry_date}
                      disabled={isReadOnly}
                      aria-invalid={Boolean(errors.expiry_date)}
                      className={cn(errors.expiry_date && 'border-destructive')}
                      onChange={(event) => {
                        updateLine(line.id, { expiry_date: event.target.value });
                        clearLineError(line.id, 'expiry_date');
                      }}
                    />
                    {errors.expiry_date ? (
                      <p className="mt-1 text-xs text-destructive">{errors.expiry_date}</p>
                    ) : null}
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
              );
              })}
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
