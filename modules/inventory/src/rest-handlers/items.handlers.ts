import type { FastifyInstance } from "fastify";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { createItem, previewItemCode } from "../use-cases/create-item.js";
import { listItems } from "../use-cases/list-items.js";

interface ItemsHandlerDeps {
  itemRepo: DrizzleInventoryItemRepository;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function registerItemHandlers(app: FastifyInstance, deps: ItemsHandlerDeps): void {
  app.get<{
    Querystring: {
      search?: string;
      is_active?: string;
      limit?: string;
      offset?: string;
    };
  }>("/items", async (request, reply) => {
    const tenantId = request.tenantId;
    const q = request.query;
    const limit = Math.min(Math.max(Number(q.limit ?? 50), 1), 200);
    const offset = Math.max(Number(q.offset ?? 0), 0);
    let isActive: boolean | undefined;
    if (q.is_active === "true") isActive = true;
    if (q.is_active === "false") isActive = false;

    const result = await listItems({ itemRepo: deps.itemRepo }, tenantId, {
      search: q.search,
      is_active: isActive,
      limit,
      offset,
    });

    return reply.send(result);
  });

  app.get<{
    Querystring: {
      item_type_id?: string;
    };
  }>("/items/next-code", async (request, reply) => {
    const tenantId = request.tenantId;
    const itemTypeId = request.query.item_type_id?.trim() ?? "";
    if (!itemTypeId) {
      return reply.code(400).send({ message: "item_type_id is required" });
    }

    const data = await previewItemCode({ itemRepo: deps.itemRepo }, tenantId, itemTypeId);
    return reply.send(data);
  });

  app.post<{ Body: Record<string, unknown> }>("/items", async (request, reply) => {
    const tenantId = request.tenantId;
    const body = request.body;

    const name = typeof body.name === "string" ? body.name : "";
    const itemTypeId = typeof body.item_type_id === "string" ? body.item_type_id : "";
    const purchaseUomId = typeof body.purchase_uom_id === "string" ? body.purchase_uom_id : "";
    const unitOfMeasure = typeof body.unit_of_measure === "string" ? body.unit_of_measure : "";

    if (!name.trim()) {
      return reply.code(400).send({ message: "name is required" });
    }
    if (!itemTypeId.trim()) {
      return reply.code(400).send({ message: "item_type_id is required" });
    }
    if (!purchaseUomId.trim()) {
      return reply.code(400).send({ message: "purchase_uom_id is required" });
    }
    if (!unitOfMeasure.trim()) {
      return reply.code(400).send({ message: "unit_of_measure is required" });
    }

    const itemTracking = body.item_tracking;
    const tracking =
      itemTracking === "by-batch" || itemTracking === "by-serial" || itemTracking === "no-tracking"
        ? itemTracking
        : undefined;

    const departmentIds = Array.isArray(body.department_ids)
      ? body.department_ids.filter((id): id is string => typeof id === "string")
      : undefined;

    const pharmacyRaw = body.pharmacy;
    const pharmacy =
      pharmacyRaw && typeof pharmacyRaw === "object"
        ? {
            genericName: parseOptionalString((pharmacyRaw as Record<string, unknown>).genericName) ?? "",
            strength: parseOptionalString((pharmacyRaw as Record<string, unknown>).strength) ?? "",
            dosageForm: parseOptionalString((pharmacyRaw as Record<string, unknown>).dosageForm) ?? "",
            prescriptionRequired:
              (pharmacyRaw as Record<string, unknown>).prescriptionRequired === true,
            minDispensingUomId:
              parseOptionalString((pharmacyRaw as Record<string, unknown>).minDispensingUomId) ?? "",
            minDispensingUomName:
              parseOptionalString((pharmacyRaw as Record<string, unknown>).minDispensingUomName) ?? "",
            drugClass: parseOptionalString((pharmacyRaw as Record<string, unknown>).drugClass),
            scheduleType: parseOptionalString((pharmacyRaw as Record<string, unknown>).scheduleType),
            mrp: parseOptionalNumber((pharmacyRaw as Record<string, unknown>).mrp) ?? 0,
          }
        : undefined;

    try {
      const data = await createItem({ itemRepo: deps.itemRepo }, tenantId, {
        name,
        display_name: typeof body.display_name === "string" ? body.display_name : undefined,
        item_classification:
          body.item_classification === "medicine" || body.item_classification === "inventory"
            ? body.item_classification
            : "inventory",
        item_type_id: itemTypeId,
        category_id:
          typeof body.category_id === "string"
            ? body.category_id
            : body.category_id === null
              ? null
              : undefined,
        sub_category_id:
          typeof body.sub_category_id === "string"
            ? body.sub_category_id
            : body.sub_category_id === null
              ? null
              : undefined,
        tenant_formulary_id:
          typeof body.tenant_formulary_id === "string" ? body.tenant_formulary_id : undefined,
        department_ids: departmentIds,
        manufacturer_id:
          typeof body.manufacturer_id === "string"
            ? body.manufacturer_id
            : body.manufacturer_id === null
              ? null
              : undefined,
        manufacturer_item_code: parseOptionalString(body.manufacturer_item_code),
        purchase_uom_id: purchaseUomId,
        consumption_uom_id: parseOptionalString(body.consumption_uom_id),
        sale_uom_id: parseOptionalString(body.sale_uom_id),
        unit_of_measure: unitOfMeasure,
        conversion_factor: parseOptionalNumber(body.conversion_factor),
        item_tracking: tracking,
        is_expirable: typeof body.is_expirable === "boolean" ? body.is_expirable : undefined,
        is_short_expiry: typeof body.is_short_expiry === "boolean" ? body.is_short_expiry : undefined,
        loose_sale_allowed:
          typeof body.loose_sale_allowed === "boolean" ? body.loose_sale_allowed : undefined,
        hsn_gst_id:
          typeof body.hsn_gst_id === "string"
            ? body.hsn_gst_id
            : body.hsn_gst_id === null
              ? null
              : undefined,
        catalog_number: parseOptionalString(body.catalog_number),
        reorder_level: parseOptionalNumber(body.reorder_level),
        storage_condition_id:
          typeof body.storage_condition_id === "string"
            ? body.storage_condition_id
            : body.storage_condition_id === null
              ? null
              : undefined,
        pack_size: parseOptionalString(body.pack_size),
        length_cm: parseOptionalNumber(body.length_cm) ?? null,
        width_cm: parseOptionalNumber(body.width_cm) ?? null,
        height_cm: parseOptionalNumber(body.height_cm) ?? null,
        weight_kg: parseOptionalNumber(body.weight_kg) ?? null,
        description: parseOptionalString(body.description),
        pharmacy,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      });

      return reply.code(201).send({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create item";
      return reply.code(400).send({ message });
    }
  });
}
