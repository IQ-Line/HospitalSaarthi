import type { DrizzleInventoryItemRepository, ItemTrackingMode } from "../data-access/items.repo.js";
import { InventoryValidationError } from "../errors.js";

export type CreateItemDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export type CreateItemInput = {
  name: string;
  display_name?: string;
  item_classification?: "inventory" | "medicine";
  item_type_id: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  tenant_formulary_id?: string | null;
  department_ids?: string[];
  manufacturer_id?: string | null;
  manufacturer_item_code?: string;
  purchase_uom_id: string;
  consumption_uom_id?: string;
  sale_uom_id?: string;
  unit_of_measure: string;
  conversion_factor?: number;
  item_tracking?: ItemTrackingMode;
  is_expirable?: boolean;
  is_short_expiry?: boolean;
  loose_sale_allowed?: boolean;
  hsn_gst_id?: string | null;
  catalog_number?: string;
  reorder_level?: number;
  storage_condition_id?: string | null;
  pack_size?: string;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  description?: string;
  pharmacy?: {
    genericName: string;
    strength: string;
    dosageForm: string;
    prescriptionRequired: boolean;
    minDispensingUomId: string;
    minDispensingUomName: string;
    drugClass?: string;
    scheduleType?: string;
    mrp: number;
  };
  is_active?: boolean;
};

function numOrNull(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return String(value);
}

export async function createItem(
  deps: CreateItemDeps,
  tenantId: string,
  input: CreateItemInput,
) {
  const classification = input.item_classification ?? "inventory";
  if (classification === "medicine" && !input.tenant_formulary_id?.trim()) {
    throw new InventoryValidationError(
      "Medicine items require a tenant formulary medicine selection",
      "FORMULARY_REQUIRED",
    );
  }

  const purchaseUomId = input.purchase_uom_id;
  const consumptionUomId = input.consumption_uom_id ?? purchaseUomId;
  const saleUomId = input.sale_uom_id ?? purchaseUomId;
  const name = input.name.trim();
  const displayName = input.display_name?.trim() || name;

  const supplyAttributes: Record<string, unknown> = {
    department_ids: input.department_ids ?? [],
  };
  if (input.pharmacy) {
    supplyAttributes.pharmacy = input.pharmacy;
  }

  const row = await deps.itemRepo.create(tenantId, {
    name,
    displayName,
    itemClassification: classification,
    itemTypeId: input.item_type_id,
    categoryId: input.category_id ?? null,
    subCategoryId: input.sub_category_id ?? null,
    tenantFormularyId: input.tenant_formulary_id ?? null,
    manufacturerId: input.manufacturer_id ?? null,
    manufacturerItemCode: input.manufacturer_item_code?.trim() || null,
    catalogNumber: input.catalog_number?.trim() || null,
    hsnGstId: input.hsn_gst_id ?? null,
    purchaseUomId,
    consumptionUomId,
    saleUomId,
    unitOfMeasure: input.unit_of_measure.trim(),
    conversionFactor: input.conversion_factor != null ? String(input.conversion_factor) : "1",
    itemTracking: input.item_tracking ?? (classification === "medicine" ? "by-batch" : "by-batch"),
    isExpirable: input.is_expirable,
    isShortExpiryMonitoring: input.is_short_expiry,
    looseSaleAllowed: input.loose_sale_allowed,
    reorderPoint: input.reorder_level != null ? String(input.reorder_level) : "0",
    storageConditionId: input.storage_condition_id ?? null,
    packSize: input.pack_size?.trim() || null,
    lengthCm: numOrNull(input.length_cm),
    widthCm: numOrNull(input.width_cm),
    heightCm: numOrNull(input.height_cm),
    weightKg: numOrNull(input.weight_kg),
    description: input.description?.trim() || null,
    isActive: input.is_active ?? true,
    supplyAttributes,
  });

  return {
    id: row.id,
    item_code: row.item_code,
    name: row.name,
    display_name: row.display_name,
    item_classification: row.item_classification,
    item_type_id: row.item_type_id,
    category_id: row.category_id,
    manufacturer_id: row.manufacturer_id,
    is_active: row.is_active,
  };
}

export type PreviewItemCodeDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export async function previewItemCode(
  deps: PreviewItemCodeDeps,
  tenantId: string,
  itemTypeId: string,
) {
  const item_code = await deps.itemRepo.previewItemCode(tenantId, itemTypeId);
  return { item_code };
}
