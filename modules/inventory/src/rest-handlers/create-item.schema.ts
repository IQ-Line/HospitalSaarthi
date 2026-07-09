import { z } from "zod";

const itemTrackingSchema = z.enum(["by-batch", "by-serial", "no-tracking"]);

const pharmacySchema = z.object({
  genericName: z.string(),
  strength: z.string(),
  dosageForm: z.string(),
  prescriptionRequired: z.boolean(),
  minDispensingUomId: z.string().uuid(),
  minDispensingUomName: z.string(),
  drugClass: z.string().optional(),
  scheduleType: z.string().optional(),
  mrp: z.number().finite().nonnegative(),
});

const hsnSnapshotSchema = z.object({
  id: z.string().uuid(),
  hsn_code: z.string(),
  effective_from: z.string(),
  cgst_pct: z.number(),
  sgst_pct: z.number(),
  igst_pct: z.number(),
});

export const createItemBodySchema = z
  .object({
    name: z.string().trim().min(1, "name is required"),
    display_name: z.string().trim().optional(),
    item_classification: z.enum(["inventory", "medicine"]).optional(),
    item_type_id: z.string().uuid("item_type_id must be a valid UUID"),
    category_id: z.string().uuid().nullable().optional(),
    sub_category_id: z.string().uuid().nullable().optional(),
    tenant_formulary_id: z.string().uuid().nullable().optional(),
    department_ids: z.array(z.string().uuid()).optional(),
    manufacturer_id: z.string().uuid().nullable().optional(),
    manufacturer_item_code: z.string().trim().optional(),
    purchase_uom_id: z.string().uuid("purchase_uom_id must be a valid UUID"),
    consumption_uom_id: z.string().uuid().optional(),
    sale_uom_id: z.string().uuid().optional(),
    unit_of_measure: z.string().trim().min(1, "unit_of_measure is required"),
    conversion_factor: z.number().finite().positive().optional(),
    item_tracking: itemTrackingSchema.optional(),
    is_expirable: z.boolean().optional(),
    is_short_expiry: z.boolean().optional(),
    loose_sale_allowed: z.boolean().optional(),
    hsn_gst_id: z.string().uuid().nullable().optional(),
    hsn_selections: z.array(hsnSnapshotSchema).optional(),
    catalog_number: z.string().trim().optional(),
    reorder_level: z.number().finite().nonnegative().optional(),
    storage_condition_id: z.string().uuid().nullable().optional(),
    pack_size: z.string().trim().optional(),
    length_cm: z.number().finite().nonnegative().nullable().optional(),
    width_cm: z.number().finite().nonnegative().nullable().optional(),
    height_cm: z.number().finite().nonnegative().nullable().optional(),
    weight_kg: z.number().finite().nonnegative().nullable().optional(),
    description: z.string().trim().optional(),
    pharmacy: pharmacySchema.optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((body, ctx) => {
    if (body.item_classification === "medicine" && !body.tenant_formulary_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Medicine items require a tenant formulary medicine selection",
        path: ["tenant_formulary_id"],
      });
    }
  });

export type CreateItemBody = z.infer<typeof createItemBodySchema>;
