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
import { previewNextItemCode } from '@/features/inventory-masters/items/item-master-api';
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
  const [hsnSelectedId, setHsnSelectedId] = React.useState('');
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
    setHsnSelectedId('');
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

  const parseDim = (s: string): number | null => {
    const n = Number.parseFloat(s.trim());
    return Number.isFinite(n) ? n : null;
  };

  const toggleDepartment = (id: string, checked: boolean) => {
    setDepartmentSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    void (async () => {
      const name = itemName.trim();
      if (!name) {
        toast.error('Enter an item name.');
        return;
      }
      if (!parentCategoryId) {
        toast.error('Select a category.');
        return;
      }
      if (subCategories.length > 0 && !subCategoryId) {
        toast.error('Select a sub category.');
        return;
      }
      if (departmentSelectedIds.size === 0) {
        toast.error('Select at least one department.');
        return;
      }
      const reorderParsed = Number.parseInt(reorderStr.trim(), 10);
      if (!Number.isFinite(reorderParsed) || reorderStr.trim() === '') {
        toast.error('Enter a valid reorder level.');
        return;
      }
      if (activeStorage.length > 0 && !storageConditionId) {
        toast.error('Select a storage condition.');
        return;
      }
      const effectiveTracking: ItemTrackingMode = isMedicine ? 'by-batch' : (itemTracking as ItemTrackingMode);
      if (!effectiveTracking) {
        toast.error('Select item tracking mode.');
        return;
      }
      if (!itemTypeId) {
        toast.error('Select an item type.');
        return;
      }
      if (!purchaseUomId || !consumptionUomId || !saleUomId) {
        toast.error('Select purchase, consumption, and sale units.');
        return;
      }
      if (activeHsnRows.length > 0 && !hsnSelectedId) {
        toast.error('Select an HSN row.');
        return;
      }

      const su = activeUoms.find((u) => u.id === saleUomId);
      const saleName = su?.abbreviation ?? su?.name ?? 'Each';

      const conv = Number.parseFloat(conversionStr.trim() || '1');
      if (!Number.isFinite(conv) || conv <= 0) {
        toast.error('Enter a valid conversion factor (> 0).');
        return;
      }

      if (isMedicine && !formularyOptionId) {
        toast.error('Select a tenant formulary medicine for medicine items.');
        return;
      }

      let pharmacy: ItemMasterPharmacyAttributes | undefined;
      if (isMedicine) {
        if (!genericName.trim() || !strength.trim() || !dosageForm) {
          toast.error('Medicine requires generic name, strength, and dosage form.');
          return;
        }
        if (!minDispensingUomId) {
          toast.error('Select minimum dispensing unit.');
          return;
        }
        const minU = activeUoms.find((u) => u.id === minDispensingUomId);
        const mrp = Number.parseFloat(mrpStr.trim());
        if (!Number.isFinite(mrp) || mrp <= 0) {
          toast.error('MRP must be greater than 0.');
          return;
        }
        pharmacy = {
          genericName: genericName.trim(),
          strength: strength.trim(),
          dosageForm,
          prescriptionRequired,
          minDispensingUomId,
          minDispensingUomName: minU?.name ?? '—',
          drugClass: drugClass.trim() || undefined,
          scheduleType: scheduleType.trim() || undefined,
          mrp,
        };
      }

      const categoryId = subCategoryId || parentCategoryId;
      const isExpirable = isMedicine ? true : effectiveTracking === 'by-batch' ? batchExpirable === 'yes' : false;
      const isShortExpiry = effectiveTracking === 'by-batch' ? batchShortExpiry === 'yes' : false;

      await onSubmit({
        name,
        display_name: displayName.trim() || name,
        item_classification: itemClassification,
        item_type_id: itemTypeId,
        category_id: categoryId,
        sub_category_id: subCategoryId || null,
        tenant_formulary_id: isMedicine ? formularyOptionId : null,
        department_ids: Array.from(departmentSelectedIds),
        manufacturer_id: manufacturerId || null,
        manufacturer_item_code: manufacturerCode.trim() || undefined,
        purchase_uom_id: purchaseUomId,
        consumption_uom_id: consumptionUomId,
        sale_uom_id: saleUomId,
        unit_of_measure: saleName,
        conversion_factor: conv,
        item_tracking: effectiveTracking,
        is_expirable: isExpirable,
        is_short_expiry: isShortExpiry,
        loose_sale_allowed: looseQualitySale === 'yes',
        hsn_gst_id: hsnSelectedId || null,
        catalog_number: catalogNo.trim() || undefined,
        reorder_level: reorderParsed,
        storage_condition_id: storageConditionId || null,
        pack_size: packSize.trim() || undefined,
        length_cm: parseDim(lengthStr),
        width_cm: parseDim(widthStr),
        height_cm: parseDim(heightStr),
        weight_kg: parseDim(weightStr),
        description: description.trim() || undefined,
        pharmacy,
        is_active: statusActive,
      });
    })();
  };

  if (!open) return null;

  const itemCodeDisplay = itemTypeId ? (codePreview?.item_code ?? 'Generating…') : 'Select item type';
  const itemCodeHint = selectedType
    ? `Auto-generated from item type "${selectedType.item_type}" (${itemTypeCodePrefix(selectedType.item_type)}-######)`
    : 'Select an item type to preview the code prefix.';
  const departmentSummary = departmentLabelFromIds(Array.from(departmentSelectedIds), departments);
  const brandDisplay =
    selectedFormularyOption?.brandNames?.[0]?.trim() ||
    selectedFormularyOption?.manufacturer?.trim() ||
    '—';

  const formBody = (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">General</CardTitle>
          <CardDescription>Names, category, tracking, manufacturer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Item classification" htmlFor="imf-classification" required>
            <Select
              value={itemClassification}
              onValueChange={(v) => handleClassificationChange(v as ItemClassification)}
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
          <Field label="Display name" htmlFor="imf-display-name" hint="Optional; defaults to item name when empty.">
            <Input
              id="imf-display-name"
              className="h-9"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
                  {activeDepartments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active departments available.</p>
                  ) : (
                    activeDepartments.map((d) => (
                      <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={departmentSelectedIds.has(d.id)}
                          onCheckedChange={(c) => toggleDepartment(d.id, c === true)}
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
              value={parentCategoryId || undefined}
              onValueChange={(value) => {
                setParentCategoryId(value);
                setSubCategoryId('');
              }}
            >
              <SelectTrigger id="imf-cat" className="h-9 w-full">
                <SelectValue placeholder={parentCategories.length ? 'Select category' : 'Add categories first'} />
              </SelectTrigger>
              <SelectContent>
                {parentCategories.map((c) => (
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
            required={subCategories.length > 0}
            hint={subCategories.length === 0 && parentCategoryId ? 'No sub categories for this parent.' : undefined}
          >
            <Select
              value={subCategoryId || undefined}
              onValueChange={setSubCategoryId}
              disabled={!parentCategoryId || subCategories.length === 0}
            >
              <SelectTrigger id="imf-sub-cat" className="h-9 w-full">
                <SelectValue
                  placeholder={
                    !parentCategoryId
                      ? 'Select category first'
                      : subCategories.length
                        ? 'Select sub category'
                        : 'None available'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map((c) => (
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
            hint={isMedicine ? 'Batch tracking is required for medicine items.' : undefined}
          >
            {isMedicine ? (
              <Input id="imf-tracking" className="h-9 bg-muted/40" readOnly value="By batch" />
            ) : (
              <Select
                value={itemTracking || undefined}
                onValueChange={(v) => setItemTracking(v as ItemTrackingMode)}
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
            <Select value={manufacturerId || undefined} onValueChange={setManufacturerId}>
              <SelectTrigger id="imf-mfg" className="h-9 w-full">
                <SelectValue placeholder={activeManufacturers.length ? 'Select manufacturer' : 'Add manufacturers'} />
              </SelectTrigger>
              <SelectContent>
                {activeManufacturers.map((m) => (
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
              value={manufacturerCode}
              onChange={(e) => setManufacturerCode(e.target.value)}
            />
          </Field>
          {isMedicine || itemTracking === 'by-batch' ? (
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
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Item type and sale unit</CardTitle>
          <CardDescription>Item code is generated from the selected item type, not from classification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Item type" htmlFor="imf-itype" required>
            <Select value={itemTypeId || undefined} onValueChange={setItemTypeId}>
              <SelectTrigger id="imf-itype" className="h-9 w-full">
                <SelectValue placeholder={activeItemTypes.length ? 'Select' : 'Add item types first'} />
              </SelectTrigger>
              <SelectContent>
                {activeItemTypes.map((t) => (
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
          <Field label="Sale unit" htmlFor="imf-su" required={activeUoms.length > 0}>
            <Select value={saleUomId || undefined} onValueChange={setSaleUomId}>
              <SelectTrigger id="imf-su" className="h-9 w-full">
                <SelectValue placeholder={activeUoms.length ? 'Select' : 'Add UOMs first'} />
              </SelectTrigger>
              <SelectContent>
                {activeUoms.map((u) => (
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
              value={looseQualitySale}
              onValueChange={(v) => setLooseQualitySale(v as 'yes' | 'no')}
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

      {isMedicine ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Medicine attributes</CardTitle>
            <CardDescription>
              Pulled from tenant formulary when you select item name. Set MRP and dispensing unit for this SKU.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Generic name" htmlFor="imf-generic" required>
              <Input id="imf-generic" className="h-9 bg-muted/40" readOnly value={genericName} />
            </Field>
            <Field label="Strength" htmlFor="imf-strength" required>
              <Input id="imf-strength" className="h-9 bg-muted/40" readOnly value={strength} />
            </Field>
            <Field label="Dosage form" htmlFor="imf-dosage" required>
              <Input id="imf-dosage" className="h-9 bg-muted/40" readOnly value={dosageForm || '—'} />
            </Field>
            <Field label="Prescription required" htmlFor="imf-rx">
              <Input id="imf-rx" className="h-9 bg-muted/40" readOnly value={prescriptionRequired ? 'Yes' : 'No'} />
            </Field>
            <Field label="Minimum dispensing unit" htmlFor="imf-min-uom" required>
              <Select value={minDispensingUomId || undefined} onValueChange={setMinDispensingUomId}>
                <SelectTrigger id="imf-min-uom" className="h-9 w-full">
                  <SelectValue placeholder="UOM" />
                </SelectTrigger>
                <SelectContent>
                  {activeUoms.map((u) => (
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
                value={mrpStr}
                onChange={(e) => setMrpStr(e.target.value)}
              />
            </Field>
            <Field label="Drug class" htmlFor="imf-drug-class">
              <Input id="imf-drug-class" className="h-9 bg-muted/40" readOnly value={drugClass || '—'} />
            </Field>
            <Field label="Schedule type" htmlFor="imf-schedule">
              <Input id="imf-schedule" className="h-9 bg-muted/40" readOnly value={scheduleType || '—'} />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Dimensions and units</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!isMedicine ? (
            <>
              <Field label="Length" htmlFor="imf-len">
                <Input id="imf-len" className="h-9" inputMode="decimal" value={lengthStr} onChange={(e) => setLengthStr(e.target.value)} />
              </Field>
              <Field label="Width" htmlFor="imf-w">
                <Input id="imf-w" className="h-9" inputMode="decimal" value={widthStr} onChange={(e) => setWidthStr(e.target.value)} />
              </Field>
              <Field label="Height" htmlFor="imf-h">
                <Input id="imf-h" className="h-9" inputMode="decimal" value={heightStr} onChange={(e) => setHeightStr(e.target.value)} />
              </Field>
            </>
          ) : null}
          <Field label="Weight (kg)" htmlFor="imf-wt">
            <Input id="imf-wt" className="h-9" inputMode="decimal" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} />
          </Field>
          <Field label="Purchase unit" htmlFor="imf-pu" required={activeUoms.length > 0}>
            <Select value={purchaseUomId || undefined} onValueChange={setPurchaseUomId}>
              <SelectTrigger id="imf-pu" className="h-9 w-full">
                <SelectValue placeholder={activeUoms.length ? 'Select' : 'Add UOMs first'} />
              </SelectTrigger>
              <SelectContent>
                {activeUoms.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Consumption unit" htmlFor="imf-cu" required={activeUoms.length > 0}>
            <Select value={consumptionUomId || undefined} onValueChange={setConsumptionUomId}>
              <SelectTrigger id="imf-cu" className="h-9 w-full">
                <SelectValue placeholder={activeUoms.length ? 'Select' : 'Add UOMs first'} />
              </SelectTrigger>
              <SelectContent>
                {activeUoms.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Conversion factor" htmlFor="imf-conv" required>
            <Input id="imf-conv" className="h-9 tabular-nums" inputMode="decimal" value={conversionStr} onChange={(e) => setConversionStr(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Financial and regulatory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="HSN / GST row" htmlFor="imf-hsn" required={activeHsnRows.length > 0}>
            <Select value={hsnSelectedId || undefined} onValueChange={setHsnSelectedId}>
              <SelectTrigger id="imf-hsn" className="h-9 w-full">
                <SelectValue placeholder={activeHsnRows.length ? 'Select HSN…' : 'Add HSN rows first'} />
              </SelectTrigger>
              <SelectContent>
                {activeHsnRows.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.hsn_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Catalog number" htmlFor="imf-catalog">
            <Input id="imf-catalog" className="h-9" value={catalogNo} onChange={(e) => setCatalogNo(e.target.value)} />
          </Field>
          <Field label="Reorder level" htmlFor="imf-reorder" required>
            <Input id="imf-reorder" className="h-9 tabular-nums" inputMode="numeric" value={reorderStr} onChange={(e) => setReorderStr(e.target.value)} />
          </Field>
          <Field label="Storage condition" htmlFor="imf-storage" required={activeStorage.length > 0}>
            <Select value={storageConditionId || undefined} onValueChange={setStorageConditionId}>
              <SelectTrigger id="imf-storage" className="h-9 w-full">
                <SelectValue placeholder={activeStorage.length ? 'Select' : 'Add storage conditions'} />
              </SelectTrigger>
              <SelectContent>
                {activeStorage.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.storage_condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pack size" htmlFor="imf-pack">
            <Input id="imf-pack" className="h-9" value={packSize} onChange={(e) => setPackSize(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

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
