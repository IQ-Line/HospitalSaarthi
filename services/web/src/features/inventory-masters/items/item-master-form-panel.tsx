import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  VISITPAD_CATALOG_FORM_PAGE,
  useVisitpadMedicines,
} from '@/features/visitpad/api';
import type { Department } from '@/features/master-data/types';
import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemType,
  InventoryManufacturer,
  InventoryStorageCondition,
  InventoryUom,
} from '@/features/inventory-masters/types';
import { ItemMasterDetailPanel } from '@/features/inventory-masters/items/item-master-detail-panel';
import {
  previewNextItemCode,
  type ItemCodePreview,
} from '@/features/inventory-masters/items/item-master-api';
import {
  buildFormularyMedicineOptions,
  type FormularyMedicineOption,
} from '@/features/inventory-masters/items/formulary-medicine-options';
import {
  departmentLabelFromIds,
  itemClassificationLabel,
  itemTypeCodePrefix,
  type CreateItemMasterPayload,
  type ItemClassification,
  type ItemMasterHsnSnapshot,
  type ItemMasterPharmacyAttributes,
  type ItemTrackingMode,
} from '@/features/inventory-masters/items/item-master-model';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pulse/ui/card';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import { RadioGroup, RadioGroupItem } from '@pulse/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { cn } from '@pulse/utils';

function Field({
  label,
  htmlFor,
  children,
  hint,
  className,
  required,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function isActiveStatus(status: string): boolean {
  return status === 'active';
}

function hsnRowToSnapshot(row: InventoryHsnGst): ItemMasterHsnSnapshot {
  const from =
    row.activation_date.length >= 10 ? row.activation_date.slice(0, 10) : row.activation_date;
  return {
    id: row.id,
    hsn_code: row.hsn_code,
    effective_from: from,
    cgst_pct: row.cgst_percent,
    sgst_pct: row.sgst_percent,
    igst_pct: row.igst_percent,
  };
}

function formatHsnRowLabel(row: InventoryHsnGst): string {
  return `${row.hsn_code} · CGST ${row.cgst_percent}% / SGST ${row.sgst_percent}% / IGST ${row.igst_percent}%`;
}

function parseDim(s: string): number | null {
  const n = Number.parseFloat(s.trim());
  return Number.isFinite(n) ? n : null;
}

function optionalTrimmed(value: string): string | undefined {
  return value.trim() || undefined;
}

function deriveSaleName(activeUoms: InventoryUom[], saleUomId: string): string {
  const su = activeUoms.find((u) => u.id === saleUomId);
  return su?.abbreviation ?? su?.name ?? 'Each';
}

function computeExpiryFlags(
  isMedicine: boolean,
  effectiveTracking: ItemTrackingMode,
  batchExpirable: 'yes' | 'no',
  batchShortExpiry: 'yes' | 'no',
): { isExpirable: boolean; isShortExpiry: boolean } {
  const isExpirable = isMedicine ? true : effectiveTracking === 'by-batch' ? batchExpirable === 'yes' : false;
  const isShortExpiry = effectiveTracking === 'by-batch' ? batchShortExpiry === 'yes' : false;
  return { isExpirable, isShortExpiry };
}

type ValidateBasicsInput = {
  itemName: string;
  parentCategoryId: string;
  subCategories: InventoryCategory[];
  subCategoryId: string;
  departmentSelectedIds: Set<string>;
};

function validateBasics(i: ValidateBasicsInput): string | null {
  const name = i.itemName.trim();
  if (!name) {
    return 'Enter an item name.';
  }
  if (!i.parentCategoryId) {
    return 'Select a category.';
  }
  if (i.subCategories.length > 0 && !i.subCategoryId) {
    return 'Select a sub category.';
  }
  if (i.departmentSelectedIds.size === 0) {
    return 'Select at least one department.';
  }
  return null;
}

type ValidateStockInput = {
  reorderStr: string;
  activeStorage: InventoryStorageCondition[];
  storageConditionId: string;
  isMedicine: boolean;
  itemTracking: '' | ItemTrackingMode;
  itemTypeId: string;
  purchaseUomId: string;
  consumptionUomId: string;
  saleUomId: string;
  activeHsnRows: InventoryHsnGst[];
  hsnSelectedIds: Set<string>;
  conversionStr: string;
};

function validateStockFields(i: ValidateStockInput): string | null {
  const reorderParsed = Number.parseInt(i.reorderStr.trim(), 10);
  if (!Number.isFinite(reorderParsed) || i.reorderStr.trim() === '') {
    return 'Enter a valid reorder level.';
  }
  if (i.activeStorage.length > 0 && !i.storageConditionId) {
    return 'Select a storage condition.';
  }
  const effectiveTracking: ItemTrackingMode = i.isMedicine ? 'by-batch' : (i.itemTracking as ItemTrackingMode);
  if (!effectiveTracking) {
    return 'Select item tracking mode.';
  }
  if (!i.itemTypeId) {
    return 'Select an item type.';
  }
  if (!i.purchaseUomId || !i.consumptionUomId || !i.saleUomId) {
    return 'Select purchase, consumption, and sale units.';
  }
  if (i.activeHsnRows.length > 0 && i.hsnSelectedIds.size === 0) {
    return 'Select at least one HSN row.';
  }
  const conv = Number.parseFloat(i.conversionStr.trim() || '1');
  if (!Number.isFinite(conv) || conv <= 0) {
    return 'Enter a valid conversion factor (> 0).';
  }
  return null;
}

type PharmacyInput = {
  isMedicine: boolean;
  formularyOptionId: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  minDispensingUomId: string;
  activeUoms: InventoryUom[];
  mrpStr: string;
  drugClass: string;
  scheduleType: string;
  prescriptionRequired: boolean;
};

function buildPharmacyAttributes(
  i: PharmacyInput,
): { error: string } | { pharmacy: ItemMasterPharmacyAttributes | undefined } {
  if (i.isMedicine && !i.formularyOptionId) {
    return { error: 'Select a tenant formulary medicine for medicine items.' };
  }
  if (!i.isMedicine) {
    return { pharmacy: undefined };
  }
  if (!i.genericName.trim() || !i.strength.trim() || !i.dosageForm) {
    return { error: 'Medicine requires generic name, strength, and dosage form.' };
  }
  if (!i.minDispensingUomId) {
    return { error: 'Select minimum dispensing unit.' };
  }
  const minU = i.activeUoms.find((u) => u.id === i.minDispensingUomId);
  const mrp = Number.parseFloat(i.mrpStr.trim());
  if (!Number.isFinite(mrp) || mrp <= 0) {
    return { error: 'MRP must be greater than 0.' };
  }
  return {
    pharmacy: {
      genericName: i.genericName.trim(),
      strength: i.strength.trim(),
      dosageForm: i.dosageForm,
      prescriptionRequired: i.prescriptionRequired,
      minDispensingUomId: i.minDispensingUomId,
      minDispensingUomName: minU?.name ?? '—',
      drugClass: i.drugClass.trim() || undefined,
      scheduleType: i.scheduleType.trim() || undefined,
      mrp,
    },
  };
}

type BuildPayloadInput = {
  itemName: string;
  displayName: string;
  itemClassification: ItemClassification;
  itemTypeId: string;
  parentCategoryId: string;
  subCategoryId: string;
  isMedicine: boolean;
  formularyOptionId: string;
  departmentSelectedIds: Set<string>;
  manufacturerId: string;
  manufacturerCode: string;
  purchaseUomId: string;
  consumptionUomId: string;
  saleUomId: string;
  activeUoms: InventoryUom[];
  conversionStr: string;
  itemTracking: '' | ItemTrackingMode;
  batchExpirable: 'yes' | 'no';
  batchShortExpiry: 'yes' | 'no';
  looseQualitySale: 'yes' | 'no';
  activeHsnRows: InventoryHsnGst[];
  hsnSelectedIds: Set<string>;
  catalogNo: string;
  reorderStr: string;
  storageConditionId: string;
  packSize: string;
  lengthStr: string;
  widthStr: string;
  heightStr: string;
  weightStr: string;
  description: string;
  pharmacy: ItemMasterPharmacyAttributes | undefined;
  statusActive: boolean;
};

function buildItemMasterPayload(i: BuildPayloadInput): CreateItemMasterPayload {
  const name = i.itemName.trim();
  const effectiveTracking: ItemTrackingMode = i.isMedicine ? 'by-batch' : (i.itemTracking as ItemTrackingMode);
  const categoryId = i.subCategoryId || i.parentCategoryId;
  const { isExpirable, isShortExpiry } = computeExpiryFlags(
    i.isMedicine,
    effectiveTracking,
    i.batchExpirable,
    i.batchShortExpiry,
  );
  const hsnSelections = i.activeHsnRows
    .filter((row) => i.hsnSelectedIds.has(row.id))
    .map(hsnRowToSnapshot);
  const primaryHsnId = hsnSelections[0]?.id ?? null;
  const reorderParsed = Number.parseInt(i.reorderStr.trim(), 10);
  const conv = Number.parseFloat(i.conversionStr.trim() || '1');
  const saleName = deriveSaleName(i.activeUoms, i.saleUomId);

  return {
    name,
    display_name: i.displayName.trim() || name,
    item_classification: i.itemClassification,
    item_type_id: i.itemTypeId,
    category_id: categoryId,
    sub_category_id: i.subCategoryId || null,
    tenant_formulary_id: i.isMedicine ? i.formularyOptionId : null,
    department_ids: Array.from(i.departmentSelectedIds),
    manufacturer_id: i.manufacturerId || null,
    manufacturer_item_code: optionalTrimmed(i.manufacturerCode),
    purchase_uom_id: i.purchaseUomId,
    consumption_uom_id: i.consumptionUomId,
    sale_uom_id: i.saleUomId,
    unit_of_measure: saleName,
    conversion_factor: conv,
    item_tracking: effectiveTracking,
    is_expirable: isExpirable,
    is_short_expiry: isShortExpiry,
    loose_sale_allowed: i.looseQualitySale === 'yes',
    hsn_gst_id: primaryHsnId,
    hsn_selections: hsnSelections.length > 0 ? hsnSelections : undefined,
    catalog_number: optionalTrimmed(i.catalogNo),
    reorder_level: reorderParsed,
    storage_condition_id: i.storageConditionId || null,
    pack_size: optionalTrimmed(i.packSize),
    length_cm: parseDim(i.lengthStr),
    width_cm: parseDim(i.widthStr),
    height_cm: parseDim(i.heightStr),
    weight_kg: parseDim(i.weightStr),
    description: optionalTrimmed(i.description),
    pharmacy: i.pharmacy,
    is_active: i.statusActive,
  };
}

function ItemNameField({
  isMedicine,
  formularyPickerOpen,
  setFormularyPickerOpen,
  selectedFormularyOption,
  formularySearch,
  setFormularySearch,
  filteredFormularyOptions,
  formularyOptions,
  formularyOptionId,
  applyFormularySelection,
  itemName,
  setItemName,
}: {
  isMedicine: boolean;
  formularyPickerOpen: boolean;
  setFormularyPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFormularyOption: FormularyMedicineOption | null;
  formularySearch: string;
  setFormularySearch: React.Dispatch<React.SetStateAction<string>>;
  filteredFormularyOptions: FormularyMedicineOption[];
  formularyOptions: FormularyMedicineOption[];
  formularyOptionId: string;
  applyFormularySelection: (opt: FormularyMedicineOption) => void;
  itemName: string;
  setItemName: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <Field
      label="Item name"
      htmlFor="imf-item-name"
      required
      hint={
        isMedicine
          ? 'Select from tenant formulary — strength, dosage, and related fields fill automatically.'
          : undefined
      }
    >
      {isMedicine ? (
        <Popover open={formularyPickerOpen} onOpenChange={setFormularyPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              id="imf-item-name"
              type="button"
              variant="outline"
              className="h-9 w-full justify-between font-normal"
            >
              <span className="truncate text-left">
                {selectedFormularyOption?.displayName ?? 'Select formulary medicine…'}
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
            <Input
              className="mb-2 h-9"
              placeholder="Search formulary…"
              value={formularySearch}
              onChange={(e) => setFormularySearch(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto">
              {filteredFormularyOptions.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {formularyOptions.length
                    ? 'No matches — try another search.'
                    : 'No formulary medicines. Add rows in Admin → Medicines.'}
                </p>
              ) : (
                filteredFormularyOptions.map((o) => (
                  <button
                    key={o.formularyId}
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted',
                      formularyOptionId === o.formularyId && 'bg-muted',
                    )}
                    onClick={() => {
                      applyFormularySelection(o);
                      setFormularyPickerOpen(false);
                    }}
                  >
                    <span className="font-medium leading-snug">{o.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {[o.genericName, o.strength, o.dosageForm].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Input
          id="imf-item-name"
          className="h-9"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      )}
    </Field>
  );
}

function ExpirableBatchFields({
  isMedicine,
  itemTracking,
  batchExpirable,
  setBatchExpirable,
  batchShortExpiry,
  setBatchShortExpiry,
}: {
  isMedicine: boolean;
  itemTracking: '' | ItemTrackingMode;
  batchExpirable: 'yes' | 'no';
  setBatchExpirable: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
  batchShortExpiry: 'yes' | 'no';
  setBatchShortExpiry: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
}) {
  if (!(isMedicine || itemTracking === 'by-batch')) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3 pt-1 md:col-span-2">
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Is expirable?</Label>
        {isMedicine ? (
          <Input className="h-9 max-w-[120px] bg-muted/40" readOnly value="Yes" />
        ) : (
          <RadioGroup
            value={batchExpirable}
            onValueChange={(v) => setBatchExpirable(v as 'yes' | 'no')}
            className="flex flex-row flex-wrap gap-x-12 gap-y-2"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="yes" />
              Yes
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="no" />
              No
            </label>
          </RadioGroup>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Is short expiry?</Label>
        <RadioGroup
          value={batchShortExpiry}
          onValueChange={(v) => setBatchShortExpiry(v as 'yes' | 'no')}
          className="flex flex-row flex-wrap gap-x-12 gap-y-2"
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="yes" />
            Yes
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="no" />
            No
          </label>
        </RadioGroup>
      </div>
    </div>
  );
}

type GeneralSectionProps = {
  itemClassification: ItemClassification;
  handleClassificationChange: (value: ItemClassification) => void;
  isMedicine: boolean;
  formularyPickerOpen: boolean;
  setFormularyPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFormularyOption: FormularyMedicineOption | null;
  formularySearch: string;
  setFormularySearch: React.Dispatch<React.SetStateAction<string>>;
  filteredFormularyOptions: FormularyMedicineOption[];
  formularyOptions: FormularyMedicineOption[];
  formularyOptionId: string;
  applyFormularySelection: (opt: FormularyMedicineOption) => void;
  itemName: string;
  setItemName: React.Dispatch<React.SetStateAction<string>>;
  displayName: string;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  departments: Department[];
  departmentSelectedIds: Set<string>;
  activeDepartments: Department[];
  toggleDepartment: (id: string, checked: boolean) => void;
  parentCategoryId: string;
  setParentCategoryId: React.Dispatch<React.SetStateAction<string>>;
  parentCategories: InventoryCategory[];
  subCategoryId: string;
  setSubCategoryId: React.Dispatch<React.SetStateAction<string>>;
  subCategories: InventoryCategory[];
  itemTracking: '' | ItemTrackingMode;
  setItemTracking: React.Dispatch<React.SetStateAction<'' | ItemTrackingMode>>;
  manufacturerId: string;
  setManufacturerId: React.Dispatch<React.SetStateAction<string>>;
  activeManufacturers: InventoryManufacturer[];
  manufacturerCode: string;
  setManufacturerCode: React.Dispatch<React.SetStateAction<string>>;
  batchExpirable: 'yes' | 'no';
  setBatchExpirable: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
  batchShortExpiry: 'yes' | 'no';
  setBatchShortExpiry: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
};

function GeneralSection(props: GeneralSectionProps) {
  const departmentSummary = departmentLabelFromIds(
    Array.from(props.departmentSelectedIds),
    props.departments,
  );
  const brandDisplay =
    props.selectedFormularyOption?.brandNames?.[0]?.trim() ||
    props.selectedFormularyOption?.manufacturer?.trim() ||
    '—';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">General</CardTitle>
        <CardDescription>Names, category, tracking, manufacturer.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Item classification" htmlFor="imf-classification" required>
          <Select
            value={props.itemClassification}
            onValueChange={(v) => props.handleClassificationChange(v as ItemClassification)}
          >
            <SelectTrigger id="imf-classification" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inventory">{itemClassificationLabel('inventory')}</SelectItem>
              <SelectItem value="medicine">{itemClassificationLabel('medicine')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ItemNameField
          isMedicine={props.isMedicine}
          formularyPickerOpen={props.formularyPickerOpen}
          setFormularyPickerOpen={props.setFormularyPickerOpen}
          selectedFormularyOption={props.selectedFormularyOption}
          formularySearch={props.formularySearch}
          setFormularySearch={props.setFormularySearch}
          filteredFormularyOptions={props.filteredFormularyOptions}
          formularyOptions={props.formularyOptions}
          formularyOptionId={props.formularyOptionId}
          applyFormularySelection={props.applyFormularySelection}
          itemName={props.itemName}
          setItemName={props.setItemName}
        />
        <Field label="Display name" htmlFor="imf-display-name" hint="Optional; defaults to item name when empty.">
          <Input
            id="imf-display-name"
            className="h-9"
            value={props.displayName}
            onChange={(e) => props.setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="Brand (read-only)" htmlFor="imf-brand">
          <Input id="imf-brand" className="h-9 bg-muted/40" readOnly value={brandDisplay} />
        </Field>
        <Field label="Departments" htmlFor="imf-dept" required>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="imf-dept"
                type="button"
                variant="outline"
                className="h-9 w-full justify-start font-normal"
              >
                <span className="truncate">{departmentSummary}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Select one or more departments
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {props.activeDepartments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active departments available.</p>
                ) : (
                  props.activeDepartments.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={props.departmentSelectedIds.has(d.id)}
                        onCheckedChange={(c) => props.toggleDepartment(d.id, c === true)}
                      />
                      <span>{d.name}</span>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Category" htmlFor="imf-cat" required>
          <Select
            value={props.parentCategoryId || undefined}
            onValueChange={(value) => {
              props.setParentCategoryId(value);
              props.setSubCategoryId('');
            }}
          >
            <SelectTrigger id="imf-cat" className="h-9 w-full">
              <SelectValue placeholder={props.parentCategories.length ? 'Select category' : 'Add categories first'} />
            </SelectTrigger>
            <SelectContent>
              {props.parentCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Sub category"
          htmlFor="imf-sub-cat"
          required={props.subCategories.length > 0}
          hint={props.subCategories.length === 0 && props.parentCategoryId ? 'No sub categories for this parent.' : undefined}
        >
          <Select
            value={props.subCategoryId || undefined}
            onValueChange={props.setSubCategoryId}
            disabled={!props.parentCategoryId || props.subCategories.length === 0}
          >
            <SelectTrigger id="imf-sub-cat" className="h-9 w-full">
              <SelectValue
                placeholder={
                  !props.parentCategoryId
                    ? 'Select category first'
                    : props.subCategories.length
                      ? 'Select sub category'
                      : 'None available'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {props.subCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Item tracking"
          htmlFor="imf-tracking"
          required
          hint={props.isMedicine ? 'Batch tracking is required for medicine items.' : undefined}
        >
          {props.isMedicine ? (
            <Input id="imf-tracking" className="h-9 bg-muted/40" readOnly value="By batch" />
          ) : (
            <Select
              value={props.itemTracking || undefined}
              onValueChange={(v) => props.setItemTracking(v as ItemTrackingMode)}
            >
              <SelectTrigger id="imf-tracking" className="h-9 w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="by-batch">By batch</SelectItem>
                <SelectItem value="by-serial">By unique serial number</SelectItem>
                <SelectItem value="no-tracking">No tracking</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Manufacturer" htmlFor="imf-mfg">
          <Select value={props.manufacturerId || undefined} onValueChange={props.setManufacturerId}>
            <SelectTrigger id="imf-mfg" className="h-9 w-full">
              <SelectValue placeholder={props.activeManufacturers.length ? 'Select manufacturer' : 'Add manufacturers'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeManufacturers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.manufacturer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Manufacturer code" htmlFor="imf-mfg-code">
          <Input
            id="imf-mfg-code"
            className="h-9 font-mono text-xs"
            value={props.manufacturerCode}
            onChange={(e) => props.setManufacturerCode(e.target.value)}
          />
        </Field>
        <ExpirableBatchFields
          isMedicine={props.isMedicine}
          itemTracking={props.itemTracking}
          batchExpirable={props.batchExpirable}
          setBatchExpirable={props.setBatchExpirable}
          batchShortExpiry={props.batchShortExpiry}
          setBatchShortExpiry={props.setBatchShortExpiry}
        />
      </CardContent>
    </Card>
  );
}

type ItemTypeSaleSectionProps = {
  itemTypeId: string;
  setItemTypeId: React.Dispatch<React.SetStateAction<string>>;
  activeItemTypes: InventoryItemType[];
  codePreview: ItemCodePreview | undefined;
  selectedType: InventoryItemType | undefined;
  saleUomId: string;
  setSaleUomId: React.Dispatch<React.SetStateAction<string>>;
  activeUoms: InventoryUom[];
  looseQualitySale: 'yes' | 'no';
  setLooseQualitySale: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
};

function ItemTypeSaleSection(props: ItemTypeSaleSectionProps) {
  const itemCodeDisplay = props.itemTypeId ? (props.codePreview?.item_code ?? 'Generating…') : 'Select item type';
  const itemCodeHint = props.selectedType
    ? `Indicative preview only — the saved code is allocated when you save (format: ITM-#####, sequence per item type "${props.selectedType.item_type}").`
    : 'Select an item type to preview the next code.';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Item type and sale unit</CardTitle>
        <CardDescription>Item code is generated from the selected item type, not from classification.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Field label="Item type" htmlFor="imf-itype" required>
          <Select value={props.itemTypeId || undefined} onValueChange={props.setItemTypeId}>
            <SelectTrigger id="imf-itype" className="h-9 w-full">
              <SelectValue placeholder={props.activeItemTypes.length ? 'Select' : 'Add item types first'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeItemTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.item_type} ({itemTypeCodePrefix(t.item_type)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Item code" htmlFor="imf-item-code" hint={itemCodeHint}>
          <Input id="imf-item-code" className="h-9 bg-muted/40 font-mono text-sm" readOnly value={itemCodeDisplay} />
        </Field>
        <Field label="Sale unit" htmlFor="imf-su" required={props.activeUoms.length > 0}>
          <Select value={props.saleUomId || undefined} onValueChange={props.setSaleUomId}>
            <SelectTrigger id="imf-su" className="h-9 w-full">
              <SelectValue placeholder={props.activeUoms.length ? 'Select' : 'Add UOMs first'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeUoms.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium text-foreground">Loose sale allowed</Label>
          <RadioGroup
            value={props.looseQualitySale}
            onValueChange={(v) => props.setLooseQualitySale(v as 'yes' | 'no')}
            className="flex flex-row flex-wrap gap-x-8 gap-y-2"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="yes" />
              Yes
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="no" />
              No
            </label>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}

type MedicineAttributesSectionProps = {
  genericName: string;
  strength: string;
  dosageForm: string;
  prescriptionRequired: boolean;
  minDispensingUomId: string;
  setMinDispensingUomId: React.Dispatch<React.SetStateAction<string>>;
  activeUoms: InventoryUom[];
  mrpStr: string;
  setMrpStr: React.Dispatch<React.SetStateAction<string>>;
  drugClass: string;
  scheduleType: string;
};

function MedicineAttributesSection(props: MedicineAttributesSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Medicine attributes</CardTitle>
        <CardDescription>
          Pulled from tenant formulary when you select item name. Set MRP and dispensing unit for this SKU.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Generic name" htmlFor="imf-generic" required>
          <Input id="imf-generic" className="h-9 bg-muted/40" readOnly value={props.genericName} />
        </Field>
        <Field label="Strength" htmlFor="imf-strength" required>
          <Input id="imf-strength" className="h-9 bg-muted/40" readOnly value={props.strength} />
        </Field>
        <Field label="Dosage form" htmlFor="imf-dosage" required>
          <Input id="imf-dosage" className="h-9 bg-muted/40" readOnly value={props.dosageForm || '—'} />
        </Field>
        <Field label="Prescription required" htmlFor="imf-rx">
          <Input id="imf-rx" className="h-9 bg-muted/40" readOnly value={props.prescriptionRequired ? 'Yes' : 'No'} />
        </Field>
        <Field label="Minimum dispensing unit" htmlFor="imf-min-uom" required>
          <Select value={props.minDispensingUomId || undefined} onValueChange={props.setMinDispensingUomId}>
            <SelectTrigger id="imf-min-uom" className="h-9 w-full">
              <SelectValue placeholder="UOM" />
            </SelectTrigger>
            <SelectContent>
              {props.activeUoms.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="MRP" htmlFor="imf-mrp" required>
          <Input
            id="imf-mrp"
            className="h-9 tabular-nums"
            inputMode="decimal"
            value={props.mrpStr}
            onChange={(e) => props.setMrpStr(e.target.value)}
          />
        </Field>
        <Field label="Drug class" htmlFor="imf-drug-class">
          <Input id="imf-drug-class" className="h-9 bg-muted/40" readOnly value={props.drugClass || '—'} />
        </Field>
        <Field label="Schedule type" htmlFor="imf-schedule">
          <Input id="imf-schedule" className="h-9 bg-muted/40" readOnly value={props.scheduleType || '—'} />
        </Field>
      </CardContent>
    </Card>
  );
}

type DimensionsUnitsSectionProps = {
  isMedicine: boolean;
  lengthStr: string;
  setLengthStr: React.Dispatch<React.SetStateAction<string>>;
  widthStr: string;
  setWidthStr: React.Dispatch<React.SetStateAction<string>>;
  heightStr: string;
  setHeightStr: React.Dispatch<React.SetStateAction<string>>;
  weightStr: string;
  setWeightStr: React.Dispatch<React.SetStateAction<string>>;
  purchaseUomId: string;
  setPurchaseUomId: React.Dispatch<React.SetStateAction<string>>;
  activeUoms: InventoryUom[];
  consumptionUomId: string;
  setConsumptionUomId: React.Dispatch<React.SetStateAction<string>>;
  conversionStr: string;
  setConversionStr: React.Dispatch<React.SetStateAction<string>>;
};

function DimensionsUnitsSection(props: DimensionsUnitsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Dimensions and units</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {!props.isMedicine ? (
          <>
            <Field label="Length" htmlFor="imf-len">
              <Input id="imf-len" className="h-9" inputMode="decimal" value={props.lengthStr} onChange={(e) => props.setLengthStr(e.target.value)} />
            </Field>
            <Field label="Width" htmlFor="imf-w">
              <Input id="imf-w" className="h-9" inputMode="decimal" value={props.widthStr} onChange={(e) => props.setWidthStr(e.target.value)} />
            </Field>
            <Field label="Height" htmlFor="imf-h">
              <Input id="imf-h" className="h-9" inputMode="decimal" value={props.heightStr} onChange={(e) => props.setHeightStr(e.target.value)} />
            </Field>
          </>
        ) : null}
        <Field label="Weight (kg)" htmlFor="imf-wt">
          <Input id="imf-wt" className="h-9" inputMode="decimal" value={props.weightStr} onChange={(e) => props.setWeightStr(e.target.value)} />
        </Field>
        <Field label="Purchase unit" htmlFor="imf-pu" required={props.activeUoms.length > 0}>
          <Select value={props.purchaseUomId || undefined} onValueChange={props.setPurchaseUomId}>
            <SelectTrigger id="imf-pu" className="h-9 w-full">
              <SelectValue placeholder={props.activeUoms.length ? 'Select' : 'Add UOMs first'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeUoms.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Consumption unit" htmlFor="imf-cu" required={props.activeUoms.length > 0}>
          <Select value={props.consumptionUomId || undefined} onValueChange={props.setConsumptionUomId}>
            <SelectTrigger id="imf-cu" className="h-9 w-full">
              <SelectValue placeholder={props.activeUoms.length ? 'Select' : 'Add UOMs first'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeUoms.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Conversion factor" htmlFor="imf-conv" required>
          <Input id="imf-conv" className="h-9 tabular-nums" inputMode="decimal" value={props.conversionStr} onChange={(e) => props.setConversionStr(e.target.value)} />
        </Field>
      </CardContent>
    </Card>
  );
}

type FinancialRegulatorySectionProps = {
  activeHsnRows: InventoryHsnGst[];
  hsnSelectedIds: Set<string>;
  toggleHsn: (id: string, checked: boolean) => void;
  catalogNo: string;
  setCatalogNo: React.Dispatch<React.SetStateAction<string>>;
  reorderStr: string;
  setReorderStr: React.Dispatch<React.SetStateAction<string>>;
  storageConditionId: string;
  setStorageConditionId: React.Dispatch<React.SetStateAction<string>>;
  activeStorage: InventoryStorageCondition[];
  packSize: string;
  setPackSize: React.Dispatch<React.SetStateAction<string>>;
};

function FinancialRegulatorySection(props: FinancialRegulatorySectionProps) {
  const hsnSummary =
    props.hsnSelectedIds.size === 0
      ? props.activeHsnRows.length
        ? 'Select HSN…'
        : 'Add HSN rows first'
      : `${props.hsnSelectedIds.size} HSN row(s)`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Financial and regulatory</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="HSN / GST rows" htmlFor="imf-hsn-pop" required={props.activeHsnRows.length > 0}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="imf-hsn-pop"
                type="button"
                variant="outline"
                className="h-9 w-full justify-start font-normal"
              >
                <span className="truncate">{hsnSummary}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Select one or more HSN rows
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {props.activeHsnRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add HSN/GST in Masters.</p>
                ) : (
                  props.activeHsnRows.map((row) => (
                    <label key={row.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={props.hsnSelectedIds.has(row.id)}
                        onCheckedChange={(checked) => props.toggleHsn(row.id, checked === true)}
                      />
                      <span className="font-mono text-xs leading-snug">{formatHsnRowLabel(row)}</span>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Catalog number" htmlFor="imf-catalog">
          <Input id="imf-catalog" className="h-9" value={props.catalogNo} onChange={(e) => props.setCatalogNo(e.target.value)} />
        </Field>
        <Field label="Reorder level" htmlFor="imf-reorder" required>
          <Input id="imf-reorder" className="h-9 tabular-nums" inputMode="numeric" value={props.reorderStr} onChange={(e) => props.setReorderStr(e.target.value)} />
        </Field>
        <Field label="Storage condition" htmlFor="imf-storage" required={props.activeStorage.length > 0}>
          <Select value={props.storageConditionId || undefined} onValueChange={props.setStorageConditionId}>
            <SelectTrigger id="imf-storage" className="h-9 w-full">
              <SelectValue placeholder={props.activeStorage.length ? 'Select' : 'Add storage conditions'} />
            </SelectTrigger>
            <SelectContent>
              {props.activeStorage.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.storage_condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pack size" htmlFor="imf-pack">
          <Input id="imf-pack" className="h-9" value={props.packSize} onChange={(e) => props.setPackSize(e.target.value)} />
        </Field>
      </CardContent>
    </Card>
  );
}

export type ItemMasterFormPanelProps = {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  categories: InventoryCategory[];
  itemTypes: InventoryItemType[];
  uoms: InventoryUom[];
  storageConditions: InventoryStorageCondition[];
  hsnRows: InventoryHsnGst[];
  manufacturers: InventoryManufacturer[];
  departments: Department[];
  onSubmit: (payload: CreateItemMasterPayload) => Promise<void>;
};

export function ItemMasterFormPanel({
  open,
  onClose,
  isSaving,
  categories,
  itemTypes,
  uoms,
  storageConditions,
  hsnRows,
  manufacturers,
  departments,
  onSubmit,
}: ItemMasterFormPanelProps) {
  const [itemClassification, setItemClassification] = React.useState<ItemClassification>('inventory');
  const [itemTracking, setItemTracking] = React.useState<'' | ItemTrackingMode>('');
  const [batchExpirable, setBatchExpirable] = React.useState<'yes' | 'no'>('yes');
  const [batchShortExpiry, setBatchShortExpiry] = React.useState<'yes' | 'no'>('yes');
  const [looseQualitySale, setLooseQualitySale] = React.useState<'yes' | 'no'>('no');
  const [statusActive, setStatusActive] = React.useState(true);

  const [itemName, setItemName] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [departmentSelectedIds, setDepartmentSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [parentCategoryId, setParentCategoryId] = React.useState('');
  const [subCategoryId, setSubCategoryId] = React.useState('');
  const [manufacturerId, setManufacturerId] = React.useState('');
  const [manufacturerCode, setManufacturerCode] = React.useState('');
  const [lengthStr, setLengthStr] = React.useState('');
  const [widthStr, setWidthStr] = React.useState('');
  const [heightStr, setHeightStr] = React.useState('');
  const [weightStr, setWeightStr] = React.useState('');
  const [purchaseUomId, setPurchaseUomId] = React.useState('');
  const [consumptionUomId, setConsumptionUomId] = React.useState('');
  const [itemTypeId, setItemTypeId] = React.useState('');
  const [saleUomId, setSaleUomId] = React.useState('');
  const [hsnSelectedIds, setHsnSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [catalogNo, setCatalogNo] = React.useState('');
  const [reorderStr, setReorderStr] = React.useState('');
  const [storageConditionId, setStorageConditionId] = React.useState('');
  const [packSize, setPackSize] = React.useState('');
  const [conversionStr, setConversionStr] = React.useState('1');
  const [description, setDescription] = React.useState('');

  const [genericName, setGenericName] = React.useState('');
  const [strength, setStrength] = React.useState('');
  const [dosageForm, setDosageForm] = React.useState('');
  const [prescriptionRequired, setPrescriptionRequired] = React.useState(true);
  const [minDispensingUomId, setMinDispensingUomId] = React.useState('');
  const [drugClass, setDrugClass] = React.useState('');
  const [scheduleType, setScheduleType] = React.useState('');
  const [mrpStr, setMrpStr] = React.useState('');
  const [formularyOptionId, setFormularyOptionId] = React.useState('');
  const [formularySearch, setFormularySearch] = React.useState('');
  const [formularyPickerOpen, setFormularyPickerOpen] = React.useState(false);

  const { data: medicinesData } = useVisitpadMedicines(undefined, undefined, VISITPAD_CATALOG_FORM_PAGE, {
    enabled: open,
  });

  const formularyOptions = React.useMemo(
    () => buildFormularyMedicineOptions(medicinesData?.data ?? []),
    [medicinesData?.data],
  );

  const filteredFormularyOptions = React.useMemo(() => {
    const q = formularySearch.trim().toLowerCase();
    if (!q) return formularyOptions;
    return formularyOptions.filter((o) => o.displayName.toLowerCase().includes(q));
  }, [formularyOptions, formularySearch]);

  const selectedFormularyOption = React.useMemo(
    () => formularyOptions.find((o) => o.formularyId === formularyOptionId) ?? null,
    [formularyOptions, formularyOptionId],
  );

  const { data: codePreview } = useQuery({
    queryKey: ['item-master-next-code', itemTypeId],
    queryFn: () => previewNextItemCode(itemTypeId),
    enabled: open && !!itemTypeId,
    staleTime: 30_000,
  });

  const activeHsnRows = React.useMemo(() => hsnRows.filter((r) => isActiveStatus(r.status)), [hsnRows]);
  const activeUoms = React.useMemo(() => uoms.filter((u) => isActiveStatus(u.status)), [uoms]);
  const activeStorage = React.useMemo(
    () => storageConditions.filter((s) => isActiveStatus(s.status)),
    [storageConditions],
  );
  const activeManufacturers = React.useMemo(
    () => manufacturers.filter((m) => isActiveStatus(m.status)),
    [manufacturers],
  );
  const activeItemTypes = React.useMemo(() => itemTypes.filter((t) => isActiveStatus(t.status)), [itemTypes]);
  const activeCategories = React.useMemo(() => categories.filter((c) => isActiveStatus(c.status)), [categories]);
  const parentCategories = React.useMemo(
    () => activeCategories.filter((c) => !c.parent_category_id),
    [activeCategories],
  );
  const subCategories = React.useMemo(
    () =>
      parentCategoryId
        ? activeCategories.filter((c) => c.parent_category_id === parentCategoryId)
        : [],
    [activeCategories, parentCategoryId],
  );
  const activeDepartments = React.useMemo(
    () => departments.filter((d) => d.is_active && !d.is_deleted),
    [departments],
  );

  const selectedType = React.useMemo(
    () => activeItemTypes.find((t) => t.id === itemTypeId),
    [activeItemTypes, itemTypeId],
  );
  const isMedicine = itemClassification === 'medicine';

  const applyFormularySelection = React.useCallback(
    (opt: FormularyMedicineOption) => {
      setFormularyOptionId(opt.formularyId);
      setFormularySearch('');
      setItemName(opt.displayName);
      setDisplayName(opt.displayName);
      setGenericName(opt.genericName);
      setStrength(opt.strength);
      setDosageForm(opt.dosageForm);
      setPrescriptionRequired(opt.prescriptionRequired);
      setDrugClass(opt.drugClass);
      setScheduleType(opt.schedule);
      if (opt.skuCode) setCatalogNo(opt.skuCode);
      if (opt.packSize) setPackSize(opt.packSize);
      const mfg = activeManufacturers.find(
        (m) => m.manufacturer.trim().toLowerCase() === opt.manufacturer.trim().toLowerCase(),
      );
      if (mfg) setManufacturerId(mfg.id);
      const stor = activeStorage.find(
        (s) => s.storage_condition.trim().toLowerCase() === opt.storageCondition.trim().toLowerCase(),
      );
      if (stor) setStorageConditionId(stor.id);
    },
    [activeManufacturers, activeStorage],
  );

  const handleClassificationChange = (value: ItemClassification) => {
    setItemClassification(value);
    if (value === 'medicine') {
      setItemTracking('by-batch');
      setBatchExpirable('yes');
    } else {
      setFormularyOptionId('');
      setFormularySearch('');
      setGenericName('');
      setStrength('');
      setDosageForm('');
      setMinDispensingUomId('');
      setDrugClass('');
      setScheduleType('');
      setMrpStr('');
      setItemName('');
    }
  };

  React.useEffect(() => {
    if (!open) return;
    setItemClassification('inventory');
    setItemTracking('');
    setBatchExpirable('yes');
    setBatchShortExpiry('yes');
    setLooseQualitySale('no');
    setStatusActive(true);
    setItemName('');
    setDisplayName('');
    setDepartmentSelectedIds(new Set());
    setParentCategoryId('');
    setSubCategoryId('');
    setManufacturerId('');
    setManufacturerCode('');
    setLengthStr('');
    setWidthStr('');
    setHeightStr('');
    setWeightStr('');
    setPurchaseUomId('');
    setConsumptionUomId('');
    setSaleUomId('');
    setItemTypeId('');
    setHsnSelectedIds(new Set());
    setCatalogNo('');
    setReorderStr('');
    setStorageConditionId('');
    setPackSize('');
    setConversionStr('1');
    setDescription('');
    setGenericName('');
    setStrength('');
    setDosageForm('');
    setPrescriptionRequired(true);
    setMinDispensingUomId('');
    setDrugClass('');
    setScheduleType('');
    setMrpStr('');
    setFormularyOptionId('');
    setFormularySearch('');
  }, [open]);

  const toggleDepartment = (id: string, checked: boolean) => {
    setDepartmentSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleHsn = (id: string, checked: boolean) => {
    setHsnSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    void (async () => {
      const basicsError = validateBasics({
        itemName,
        parentCategoryId,
        subCategories,
        subCategoryId,
        departmentSelectedIds,
      });
      if (basicsError) {
        toast.error(basicsError);
        return;
      }
      const stockError = validateStockFields({
        reorderStr,
        activeStorage,
        storageConditionId,
        isMedicine,
        itemTracking,
        itemTypeId,
        purchaseUomId,
        consumptionUomId,
        saleUomId,
        activeHsnRows,
        hsnSelectedIds,
        conversionStr,
      });
      if (stockError) {
        toast.error(stockError);
        return;
      }
      const pharmacyResult = buildPharmacyAttributes({
        isMedicine,
        formularyOptionId,
        genericName,
        strength,
        dosageForm,
        minDispensingUomId,
        activeUoms,
        mrpStr,
        drugClass,
        scheduleType,
        prescriptionRequired,
      });
      if ('error' in pharmacyResult) {
        toast.error(pharmacyResult.error);
        return;
      }

      const payload = buildItemMasterPayload({
        itemName,
        displayName,
        itemClassification,
        itemTypeId,
        parentCategoryId,
        subCategoryId,
        isMedicine,
        formularyOptionId,
        departmentSelectedIds,
        manufacturerId,
        manufacturerCode,
        purchaseUomId,
        consumptionUomId,
        saleUomId,
        activeUoms,
        conversionStr,
        itemTracking,
        batchExpirable,
        batchShortExpiry,
        looseQualitySale,
        activeHsnRows,
        hsnSelectedIds,
        catalogNo,
        reorderStr,
        storageConditionId,
        packSize,
        lengthStr,
        widthStr,
        heightStr,
        weightStr,
        description,
        pharmacy: pharmacyResult.pharmacy,
        statusActive,
      });

      await onSubmit(payload);
    })();
  };

  if (!open) return null;

  const formBody = (
    <div className="flex flex-col gap-4">
      <GeneralSection
        itemClassification={itemClassification}
        handleClassificationChange={handleClassificationChange}
        isMedicine={isMedicine}
        formularyPickerOpen={formularyPickerOpen}
        setFormularyPickerOpen={setFormularyPickerOpen}
        selectedFormularyOption={selectedFormularyOption}
        formularySearch={formularySearch}
        setFormularySearch={setFormularySearch}
        filteredFormularyOptions={filteredFormularyOptions}
        formularyOptions={formularyOptions}
        formularyOptionId={formularyOptionId}
        applyFormularySelection={applyFormularySelection}
        itemName={itemName}
        setItemName={setItemName}
        displayName={displayName}
        setDisplayName={setDisplayName}
        departments={departments}
        departmentSelectedIds={departmentSelectedIds}
        activeDepartments={activeDepartments}
        toggleDepartment={toggleDepartment}
        parentCategoryId={parentCategoryId}
        setParentCategoryId={setParentCategoryId}
        parentCategories={parentCategories}
        subCategoryId={subCategoryId}
        setSubCategoryId={setSubCategoryId}
        subCategories={subCategories}
        itemTracking={itemTracking}
        setItemTracking={setItemTracking}
        manufacturerId={manufacturerId}
        setManufacturerId={setManufacturerId}
        activeManufacturers={activeManufacturers}
        manufacturerCode={manufacturerCode}
        setManufacturerCode={setManufacturerCode}
        batchExpirable={batchExpirable}
        setBatchExpirable={setBatchExpirable}
        batchShortExpiry={batchShortExpiry}
        setBatchShortExpiry={setBatchShortExpiry}
      />

      <ItemTypeSaleSection
        itemTypeId={itemTypeId}
        setItemTypeId={setItemTypeId}
        activeItemTypes={activeItemTypes}
        codePreview={codePreview}
        selectedType={selectedType}
        saleUomId={saleUomId}
        setSaleUomId={setSaleUomId}
        activeUoms={activeUoms}
        looseQualitySale={looseQualitySale}
        setLooseQualitySale={setLooseQualitySale}
      />

      {isMedicine ? (
        <MedicineAttributesSection
          genericName={genericName}
          strength={strength}
          dosageForm={dosageForm}
          prescriptionRequired={prescriptionRequired}
          minDispensingUomId={minDispensingUomId}
          setMinDispensingUomId={setMinDispensingUomId}
          activeUoms={activeUoms}
          mrpStr={mrpStr}
          setMrpStr={setMrpStr}
          drugClass={drugClass}
          scheduleType={scheduleType}
        />
      ) : null}

      <DimensionsUnitsSection
        isMedicine={isMedicine}
        lengthStr={lengthStr}
        setLengthStr={setLengthStr}
        widthStr={widthStr}
        setWidthStr={setWidthStr}
        heightStr={heightStr}
        setHeightStr={setHeightStr}
        weightStr={weightStr}
        setWeightStr={setWeightStr}
        purchaseUomId={purchaseUomId}
        setPurchaseUomId={setPurchaseUomId}
        activeUoms={activeUoms}
        consumptionUomId={consumptionUomId}
        setConsumptionUomId={setConsumptionUomId}
        conversionStr={conversionStr}
        setConversionStr={setConversionStr}
      />

      <FinancialRegulatorySection
        activeHsnRows={activeHsnRows}
        hsnSelectedIds={hsnSelectedIds}
        toggleHsn={toggleHsn}
        catalogNo={catalogNo}
        setCatalogNo={setCatalogNo}
        reorderStr={reorderStr}
        setReorderStr={setReorderStr}
        storageConditionId={storageConditionId}
        setStorageConditionId={setStorageConditionId}
        activeStorage={activeStorage}
        packSize={packSize}
        setPackSize={setPackSize}
      />

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Additional</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Description (optional)" htmlFor="imf-desc">
              <Input id="imf-desc" className="h-9" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Item image / document" htmlFor="imf-files">
              <Button type="button" variant="outline" className="h-9 w-fit gap-2" disabled>
                <Upload className="size-4" />
                Choose files
              </Button>
              <p className="text-xs text-muted-foreground">0 saved — file upload ships in a later release.</p>
            </Field>
          </CardContent>
        </Card>
        <Card className="h-fit md:w-48">
          <CardContent className="flex flex-col gap-2 pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive hides from ordering.</p>
              </div>
              <Switch checked={statusActive} onCheckedChange={setStatusActive} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <ItemMasterDetailPanel
      title="Add Item"
      description="Classification controls medicine vs supply behavior. Item type is separate and determines the item code prefix."
      onClose={onClose}
      onSave={handleSave}
      saving={isSaving}
    >
      {formBody}
    </ItemMasterDetailPanel>
  );
}
