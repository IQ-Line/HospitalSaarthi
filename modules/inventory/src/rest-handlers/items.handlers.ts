import type { FastifyInstance } from "fastify";
import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import { createItem, previewItemCode } from "../use-cases/create-item.js";
import { listItems } from "../use-cases/list-items.js";
import { createItemBodySchema } from "./create-item.schema.js";
import { sendItemHandlerError } from "./item-error-response.js";

interface ItemsHandlerDeps {
  itemRepo: DrizzleInventoryItemRepository;
}

function parseClassification(
  value: string | undefined,
): "inventory" | "medicine" | undefined {
  if (value === "inventory" || value === "medicine") return value;
  return undefined;
}

export function registerItemHandlers(app: FastifyInstance, deps: ItemsHandlerDeps): void {
  app.get<{
    Querystring: {
      search?: string;
      is_active?: string;
      category_id?: string;
      item_classification?: string;
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

    const categoryId = q.category_id?.trim() || undefined;
    const itemClassification = parseClassification(q.item_classification?.trim());

    const result = await listItems({ itemRepo: deps.itemRepo }, tenantId, {
      search: q.search,
      is_active: isActive,
      category_id: categoryId,
      item_classification: itemClassification,
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
      return reply.code(400).send({ message: "item_type_id is required", code: "VALIDATION_ERROR" });
    }

    const data = await previewItemCode({ itemRepo: deps.itemRepo }, tenantId, itemTypeId);
    return reply.send({
      ...data,
      /** Preview only — final code is allocated atomically on create. */
      non_binding: true,
    });
  });

  app.post<{ Body: Record<string, unknown> }>("/items", async (request, reply) => {
    const tenantId = request.tenantId;
    const parsed = createItemBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendItemHandlerError(reply, parsed.error);
    }

    const body = parsed.data;

    try {
      const data = await createItem({ itemRepo: deps.itemRepo }, tenantId, {
        name: body.name,
        display_name: body.display_name,
        item_classification: body.item_classification,
        item_type_id: body.item_type_id,
        category_id: body.category_id,
        sub_category_id: body.sub_category_id,
        tenant_formulary_id: body.tenant_formulary_id ?? undefined,
        department_ids: body.department_ids,
        manufacturer_id: body.manufacturer_id,
        manufacturer_item_code: body.manufacturer_item_code,
        purchase_uom_id: body.purchase_uom_id,
        consumption_uom_id: body.consumption_uom_id,
        sale_uom_id: body.sale_uom_id,
        unit_of_measure: body.unit_of_measure,
        conversion_factor: body.conversion_factor,
        item_tracking: body.item_tracking,
        is_expirable: body.is_expirable,
        is_short_expiry: body.is_short_expiry,
        loose_sale_allowed: body.loose_sale_allowed,
        hsn_gst_id: body.hsn_gst_id,
        catalog_number: body.catalog_number,
        reorder_level: body.reorder_level,
        storage_condition_id: body.storage_condition_id,
        pack_size: body.pack_size,
        length_cm: body.length_cm,
        width_cm: body.width_cm,
        height_cm: body.height_cm,
        weight_kg: body.weight_kg,
        description: body.description,
        pharmacy: body.pharmacy,
        is_active: body.is_active,
      });

      return reply.code(201).send({ data });
    } catch (error) {
      return sendItemHandlerError(reply, error);
    }
  });
}
