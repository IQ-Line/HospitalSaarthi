import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  numeric,
  pgSchema,
  primaryKey,
  sql,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  tenantColumn,
} from "@hims/ts-sdk-db";
import { integer } from "drizzle-orm/pg-core";

export const PHARMACY_SCHEMA_NAME = "pharmacy" as const;
export const pharmacySchema = pgSchema(PHARMACY_SCHEMA_NAME);

export const walkInPatients = pharmacySchema.table(
  "walk_in_patients",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    first_name: text("first_name").notNull(),
    last_name: text("last_name"),
    phone: text("phone"),
    gender: text("gender").notNull(),
    date_of_birth: date("date_of_birth"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    // CHECK predicates must reference columns by BARE name (Postgres rejects
    // schema/table-qualified column refs inside a CHECK expression), so use
    // sql.raw with the column's name rather than the column object.
    check(
      "walk_in_patients_first_name_nonempty_chk",
      sql.raw(`length(trim(${t.first_name.name})) > 0`),
    ),
    check(
      "walk_in_patients_gender_chk",
      sql.raw(`${t.gender.name} in ('male', 'female', 'other')`),
    ),
    index("ix_pharmacy_walk_in_patients_tenant_created").on(
      t.iq_tenant_id,
      t.created_at.desc(),
    ),
  ],
);

export const dispenseRecords = pharmacySchema.table(
  "dispense_records",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    walk_in_order: boolean("walk_in_order").notNull().default(false),
    walk_in_patient_id: uuid("walk_in_patient_id"),
    visit_id: uuid("visit_id"),
    patient_id: uuid("patient_id"),
    opd_prescription_id: uuid("opd_prescription_id"),
    subtotal: numeric("subtotal", { precision: 18, scale: 4 }).notNull().default("0"),
    discount: numeric("discount", { precision: 18, scale: 4 }).notNull().default("0"),
    total_amount: numeric("total_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    notes: text("notes"),
    dispense_status: text("dispense_status").notNull().default("issued"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "dispense_records_walk_in_patient_fk",
      columns: [t.iq_tenant_id, t.walk_in_patient_id],
      foreignColumns: [walkInPatients.iq_tenant_id, walkInPatients.id],
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    check(
      "dispense_records_subtotal_nonneg_chk",
      sql.raw(`${t.subtotal.name} >= 0`),
    ),
    check(
      "dispense_records_discount_nonneg_chk",
      sql.raw(`${t.discount.name} >= 0`),
    ),
    check(
      "dispense_records_total_nonneg_chk",
      sql.raw(`${t.total_amount.name} >= 0`),
    ),
    check(
      "dispense_records_dispense_status_check",
      sql.raw(`${t.dispense_status.name} in ('issued', 'partial_issue')`),
    ),
    check(
      "dispense_records_order_kind_chk",
      sql.raw(`(
      ${t.walk_in_order.name} = true
      and ${t.walk_in_patient_id.name} is not null
      and ${t.visit_id.name} is null
      and ${t.patient_id.name} is null
      and ${t.opd_prescription_id.name} is null
    )
    or (
      ${t.walk_in_order.name} = false
      and ${t.walk_in_patient_id.name} is null
      and ${t.visit_id.name} is not null
      and ${t.patient_id.name} is not null
    )`),
    ),
    uniqueIndex("uq_pharmacy_dispense_records_tenant_visit_opd")
      .on(t.iq_tenant_id, t.visit_id)
      .where(sql`${t.walk_in_order} = false and ${t.visit_id} is not null`),
    index("ix_pharmacy_dispense_records_tenant_patient")
      .on(t.iq_tenant_id, t.patient_id)
      .where(sql`${t.patient_id} is not null`),
    index("ix_pharmacy_dispense_records_walk_in_patient")
      .on(t.iq_tenant_id, t.walk_in_patient_id)
      .where(sql`${t.walk_in_patient_id} is not null`),
  ],
);

export const dispenseLineItems = pharmacySchema.table(
  "dispense_line_items",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    dispense_record_id: uuid("dispense_record_id").notNull(),
    medicine_id: uuid("medicine_id"),
    medicine_display_name: text("medicine_display_name").notNull(),
    prescribed_quantity: numeric("prescribed_quantity", { precision: 12, scale: 4 }),
    quantity_dispensed: numeric("quantity_dispensed", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    unit_amount: numeric("unit_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    line_discount: numeric("line_discount", { precision: 18, scale: 4 }).notNull().default("0"),
    tax_percent: numeric("tax_percent", { precision: 8, scale: 4 }).notNull().default("0"),
    tax_amount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    line_total: numeric("line_total", { precision: 18, scale: 4 }).notNull().default("0"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "dispense_line_items_dispense_record_fk",
      columns: [t.iq_tenant_id, t.dispense_record_id],
      foreignColumns: [dispenseRecords.iq_tenant_id, dispenseRecords.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    check(
      "dispense_line_items_qty_nonneg_chk",
      sql.raw(`${t.quantity_dispensed.name} >= 0`),
    ),
    check(
      "dispense_line_items_unit_amount_nonneg_chk",
      sql.raw(`${t.unit_amount.name} >= 0`),
    ),
    check(
      "dispense_line_items_line_discount_nonneg_chk",
      sql.raw(`${t.line_discount.name} >= 0`),
    ),
    check(
      "dispense_line_items_tax_percent_nonneg_chk",
      sql.raw(`${t.tax_percent.name} >= 0`),
    ),
    check(
      "dispense_line_items_tax_amount_nonneg_chk",
      sql.raw(`${t.tax_amount.name} >= 0`),
    ),
    check(
      "dispense_line_items_line_total_nonneg_chk",
      sql.raw(`${t.line_total.name} >= 0`),
    ),
    index("ix_pharmacy_dispense_line_items_record").on(
      t.iq_tenant_id,
      t.dispense_record_id,
    ),
    index("ix_pharmacy_dispense_line_items_tenant_medicine")
      .on(t.iq_tenant_id, t.medicine_id)
      .where(sql`${t.medicine_id} is not null`),
  ],
);

export const opdQueueProjection = pharmacySchema.table(
  "opd_queue_projection",
  {
    visit_id: uuid("visit_id").notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    prescription_id: uuid("prescription_id").notNull(),
    doctor_id: uuid("doctor_id"),
    visit_status: text("visit_status").notNull(),
    prescription_status: text("prescription_status").notNull(),
    medicine_count: integer("medicine_count").notNull().default(0),
    queued_at: timestamp("queued_at", { withTimezone: true }).notNull(),
    patient_name: text("patient_name"),
    uhid: text("uhid"),
    phone: text("phone"),
    age_years: integer("age_years"),
    gender: text("gender"),
    doctor_name: text("doctor_name"),
    formatted_visit_id: text("formatted_visit_id"),
    dispense_status: text("dispense_status").notNull().default("pending"),
    last_synced_at: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.visit_id] }),
    check(
      "opd_queue_projection_dispense_status_check",
      sql.raw(
        `${t.dispense_status.name} in ('pending', 'issued', 'partial_issue')`,
      ),
    ),
    check(
      "opd_queue_projection_medicine_count_nonneg_chk",
      sql.raw(`${t.medicine_count.name} >= 0`),
    ),
    index("ix_pharmacy_opd_queue_projection_tenant_status_queued").on(
      t.iq_tenant_id,
      t.dispense_status,
      t.queued_at.desc(),
    ),
    index("ix_pharmacy_opd_queue_projection_tenant_queued").on(
      t.iq_tenant_id,
      t.queued_at.desc(),
    ),
  ],
);
