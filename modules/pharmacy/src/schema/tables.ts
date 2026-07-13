import {
  boolean,
  foreignKey,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
  tenantColumn,
} from "@hims/ts-sdk-db";
import { integer } from "drizzle-orm/pg-core";

export const PHARMACY_SCHEMA_NAME = "pharmacy" as const;
export const pharmacySchema = pgSchema(PHARMACY_SCHEMA_NAME);

/** OPD visit dispense header — one row per visit (IQSandbox `pharmacy_workflow` billing slice). */
export const dispense = pharmacySchema.table(
  "dispense",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    visit_id: uuid("visit_id").notNull(),
    patient_id: uuid("patient_id").notNull(),
    opd_prescription_id: uuid("opd_prescription_id"),
    department_id: uuid("department_id"),
    branch_id: uuid("branch_id"),
    inventory_store_id: uuid("inventory_store_id"),
    priority: text("priority").notNull().default("routine"),
    subtotal: numeric("subtotal", { precision: 18, scale: 4 }).notNull().default("0"),
    discount: numeric("discount", { precision: 18, scale: 4 }).notNull().default("0"),
    total_amount: numeric("total_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    notes: text("notes"),
    dispense_status: text("dispense_status").notNull().default("issued"),
    dispense_draft_json: jsonb("dispense_draft_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.id] })],
);

/** @deprecated Use `dispense` — table renamed in migration 0001. */
export const dispenseRecords = dispense;

export const dispenseLineItems = pharmacySchema.table(
  "dispense_line_items",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    dispense_id: uuid("dispense_id").notNull(),
    medicine_id: uuid("medicine_id"),
    medicine_display_name: text("medicine_display_name").notNull(),
    opd_prescription_item_id: uuid("opd_prescription_item_id"),
    opd_prescription_line_no: integer("opd_prescription_line_no"),
    prescribed_quantity: numeric("prescribed_quantity", { precision: 12, scale: 4 }),
    quantity_dispensed: numeric("quantity_dispensed", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    quantity_returned: numeric("quantity_returned", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    unit_amount: numeric("unit_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    line_discount: numeric("line_discount", { precision: 18, scale: 4 }).notNull().default("0"),
    tax_percent: numeric("tax_percent", { precision: 8, scale: 4 }).notNull().default("0"),
    tax_amount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    line_total: numeric("line_total", { precision: 18, scale: 4 }).notNull().default("0"),
    inventory_item_id: uuid("inventory_item_id"),
    stock_batch_id: uuid("stock_batch_id"),
    is_substitution: boolean("is_substitution").notNull().default(false),
    substitute_of_line_id: uuid("substitute_of_line_id"),
    substitution_reason: text("substitution_reason"),
    line_remarks: text("line_remarks"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "dispense_line_items_dispense_fk",
      columns: [t.iq_tenant_id, t.dispense_id],
      foreignColumns: [dispense.iq_tenant_id, dispense.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "dispense_line_items_substitute_fk",
      columns: [t.iq_tenant_id, t.substitute_of_line_id],
      foreignColumns: [t.iq_tenant_id, t.id],
    })
      .onDelete("set null")
      .onUpdate("no action"),
  ],
);

/** Unified pharmacy queue — OPD + IPD producers push denormalized rows. */
export const queueProjection = pharmacySchema.table(
  "queue_projection",
  {
    queue_item_id: uuid("queue_item_id").defaultRandom().notNull(),
    ...tenantColumn(),
    source_kind: text("source_kind").notNull().default("opd"),
    source_ref_id: uuid("source_ref_id").notNull(),
    encounter_id: uuid("encounter_id").notNull(),
    patient_id: uuid("patient_id").notNull(),
    prescription_id: uuid("prescription_id").notNull(),
    doctor_id: uuid("doctor_id"),
    visit_status: text("visit_status").notNull(),
    prescription_status: text("prescription_status").notNull(),
    medicine_count: integer("medicine_count").notNull().default(0),
    priority: text("priority").notNull().default("routine"),
    queued_at: timestamp("queued_at", { withTimezone: true }).notNull(),
    patient_name: text("patient_name"),
    uhid: text("uhid"),
    phone: text("phone"),
    age_years: integer("age_years"),
    gender: text("gender"),
    doctor_name: text("doctor_name"),
    formatted_visit_id: text("formatted_visit_id"),
    dispense_status: text("dispense_status").notNull().default("pending"),
    context_json: jsonb("context_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    last_synced_at: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.queue_item_id] })],
);

/** @deprecated Use `queueProjection` — renamed from opd_queue_projection in migration 0001. */
export const opdQueueProjection = queueProjection;

export const dispenseReturn = pharmacySchema.table(
  "dispense_return",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    return_number: text("return_number").notNull(),
    dispense_id: uuid("dispense_id").notNull(),
    visit_id: uuid("visit_id").notNull(),
    patient_id: uuid("patient_id").notNull(),
    return_reason: text("return_reason").notNull(),
    remarks: text("remarks"),
    verification_json: jsonb("verification_json")
      .$type<{
        unopened: boolean;
        packaging_intact: boolean;
        expiry_verified: boolean;
      }>()
      .notNull()
      .default({ unopened: false, packaging_intact: false, expiry_verified: false }),
    total_return_amount: numeric("total_return_amount", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    idempotency_key: text("idempotency_key"),
    /** Pharmacist who processed the return — semantic alias of standard `created_by` on this immutable header. */
    processed_by: uuid("processed_by"),
    processed_at: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "dispense_return_dispense_fk",
      columns: [t.iq_tenant_id, t.dispense_id],
      foreignColumns: [dispense.iq_tenant_id, dispense.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);

export const dispenseReturnLineItems = pharmacySchema.table(
  "dispense_return_line_items",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    dispense_return_id: uuid("dispense_return_id").notNull(),
    dispense_line_item_id: uuid("dispense_line_item_id").notNull(),
    medicine_id: uuid("medicine_id"),
    medicine_display_name: text("medicine_display_name").notNull(),
    stock_batch_id: uuid("stock_batch_id"),
    return_qty: numeric("return_qty", { precision: 12, scale: 4 }).notNull(),
    unit_amount: numeric("unit_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    line_discount: numeric("line_discount", { precision: 18, scale: 4 }).notNull().default("0"),
    tax_amount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    return_amount: numeric("return_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "dispense_return_line_return_fk",
      columns: [t.iq_tenant_id, t.dispense_return_id],
      foreignColumns: [dispenseReturn.iq_tenant_id, dispenseReturn.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    foreignKey({
      name: "dispense_return_line_dispense_line_fk",
      columns: [t.iq_tenant_id, t.dispense_line_item_id],
      foreignColumns: [dispenseLineItems.iq_tenant_id, dispenseLineItems.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
  ],
);
