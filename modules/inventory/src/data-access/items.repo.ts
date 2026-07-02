import { and, eq, or, sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import { toIlikeContainsPattern } from "../lib/ilike.js";
import {
  inventoryItemCodeSequences,
  inventoryItems,
} from "../schema/tables.js";

export type InventoryItemRow = typeof inventoryItems.$inferSelect;

export type ListInventoryItemsInput = {
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  itemClassification?: "inventory" | "medicine";
  limit: number;
  offset: number;
};

export type ItemTrackingMode = "by-batch" | "by-serial" | "no-tracking";

export type CreateInventoryItemInput = {
  name: string;
  displayName: string;
  itemClassification: "inventory" | "medicine";
  itemTypeId: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  tenantFormularyId?: string | null;
  manufacturerId?: string | null;
  manufacturerItemCode?: string | null;
  catalogNumber?: string | null;
  hsnGstId?: string | null;
  purchaseUomId: string;
  consumptionUomId: string;
  saleUomId: string;
  unitOfMeasure: string;
  conversionFactor?: string;
  itemTracking?: ItemTrackingMode;
  isExpirable?: boolean;
  isShortExpiryMonitoring?: boolean;
  looseSaleAllowed?: boolean;
  reorderPoint?: string;
  storageConditionId?: string | null;
  packSize?: string | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  description?: string | null;
  isActive: boolean;
  supplyAttributes?: Record<string, unknown>;
};

export class DrizzleInventoryItemRepository {
  constructor(private readonly db: DbInstance) {}

  async list(tenantId: string, input: ListInventoryItemsInput): Promise<{ rows: InventoryItemRow[]; total: number }> {
    const filters: SQL[] = [eq(inventoryItems.iq_tenant_id, tenantId)];

    if (input.isActive != null) {
      filters.push(eq(inventoryItems.is_active, input.isActive));
    }

    const search = input.search?.trim();
    if (search) {
      const pattern = toIlikeContainsPattern(search);
      filters.push(
        or(
          sql`${inventoryItems.name} ILIKE ${pattern} ESCAPE '\\'`,
          sql`${inventoryItems.display_name} ILIKE ${pattern} ESCAPE '\\'`,
          sql`${inventoryItems.item_code} ILIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }

    if (input.categoryId) {
      filters.push(
        or(
          eq(inventoryItems.category_id, input.categoryId),
          eq(inventoryItems.sub_category_id, input.categoryId),
        )!,
      );
    }

    if (input.itemClassification) {
      filters.push(eq(inventoryItems.item_classification, input.itemClassification));
    }

    const where = and(...filters);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(inventoryItems)
        .where(where)
        .orderBy(inventoryItems.name)
        .limit(input.limit)
        .offset(input.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryItems)
        .where(where),
    ]);

    return { rows, total: countRows[0]?.count ?? 0 };
  }

  /**
   * Non-binding preview of the next code for an item type.
   * Sequence is per item_type_id; persisted codes use the shared ITM-##### format
   * (no type prefix in the code string).
   */
  async previewItemCode(tenantId: string, itemTypeId: string): Promise<string> {
    const [row] = await this.db
      .select({ last_sequence: inventoryItemCodeSequences.last_sequence })
      .from(inventoryItemCodeSequences)
      .where(
        and(
          eq(inventoryItemCodeSequences.iq_tenant_id, tenantId),
          eq(inventoryItemCodeSequences.item_type_id, itemTypeId),
        ),
      )
      .limit(1);

    const next = (row?.last_sequence ?? 0) + 1;
    return `ITM-${next.toString().padStart(5, "0")}`;
  }

  async create(tenantId: string, input: CreateInventoryItemInput): Promise<InventoryItemRow> {
    const itemCode = await this.allocateItemCode(tenantId, input.itemTypeId);

    const tracking = input.itemTracking ?? "by-batch";
    const isLotTracked = tracking === "by-batch";
    const isSerialTracked = tracking === "by-serial";

    const [row] = await this.db
      .insert(inventoryItems)
      .values({
        iq_tenant_id: tenantId,
        item_code: itemCode,
        name: input.name,
        display_name: input.displayName,
        item_classification: input.itemClassification,
        item_type_id: input.itemTypeId,
        category_id: input.categoryId ?? null,
        sub_category_id: input.subCategoryId ?? null,
        tenant_formulary_id: input.tenantFormularyId ?? null,
        manufacturer_id: input.manufacturerId ?? null,
        manufacturer_item_code: input.manufacturerItemCode ?? null,
        catalog_number: input.catalogNumber ?? null,
        hsn_gst_id: input.hsnGstId ?? null,
        purchase_uom_id: input.purchaseUomId,
        consumption_uom_id: input.consumptionUomId,
        sale_uom_id: input.saleUomId,
        unit_of_measure: input.unitOfMeasure,
        conversion_factor: input.conversionFactor ?? "1",
        tracking_mode: isSerialTracked ? "serial" : isLotTracked ? "lot" : "none",
        is_lot_tracked: isLotTracked,
        is_serial_tracked: isSerialTracked,
        is_expirable: input.isExpirable ?? isLotTracked,
        is_short_expiry_monitoring: input.isShortExpiryMonitoring ?? false,
        loose_sale_allowed: input.looseSaleAllowed ?? false,
        reorder_point: input.reorderPoint ?? "0",
        storage_condition_id: input.storageConditionId ?? null,
        pack_size: input.packSize ?? null,
        length_cm: input.lengthCm ?? null,
        width_cm: input.widthCm ?? null,
        height_cm: input.heightCm ?? null,
        weight_kg: input.weightKg ?? null,
        description: input.description ?? null,
        supply_attributes: input.supplyAttributes ?? {},
        is_active: input.isActive,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create inventory item");
    }

    return row;
  }

  private async allocateItemCode(tenantId: string, itemTypeId: string): Promise<string> {
    const [seq] = await this.db
      .insert(inventoryItemCodeSequences)
      .values({
        iq_tenant_id: tenantId,
        item_type_id: itemTypeId,
        last_sequence: 1,
      })
      .onConflictDoUpdate({
        target: [inventoryItemCodeSequences.iq_tenant_id, inventoryItemCodeSequences.item_type_id],
        set: {
          last_sequence: sql`${inventoryItemCodeSequences.last_sequence} + 1`,
        },
      })
      .returning({ last_sequence: inventoryItemCodeSequences.last_sequence });

    const sequence = seq?.last_sequence ?? 1;
    return `ITM-${sequence.toString().padStart(5, "0")}`;
  }
}
