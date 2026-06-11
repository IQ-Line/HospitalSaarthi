import {
  boolean,
  index,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  tenantColumn,
  auditColumns,
  sql,
} from "@hims/ts-sdk-db";

export const ipdSchema = pgSchema("ipd");

/** Clinical areas — ward, daycare, ICU, etc. */
export const wards = ipdSchema.table(
  "wards",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    ward_name: text("ward_name").notNull(),
    ward_code: text("ward_code").notNull(),
    ward_type: text("ward_type").notNull(),
    floor: text("floor"),
    specialty: text("specialty"),
    gender_restriction: text("gender_restriction").notNull().default("any"),
    is_active: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_wards_code").on(t.iq_tenant_id, t.ward_code),
    index("idx_wards_type").on(t.iq_tenant_id, t.ward_type),
  ],
);

/** Individual beds/chairs with occupancy status. */
export const beds = ipdSchema.table(
  "beds",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    ward_id: uuid("ward_id").notNull(),
    room_number: text("room_number"),
    bed_number: text("bed_number").notNull(),
    bed_code: text("bed_code").notNull(),
    bed_type: text("bed_type").notNull().default("general"),
    bed_status: text("bed_status").notNull().default("available"),
    current_patient_id: uuid("current_patient_id"),
    current_episode_id: uuid("current_episode_id"),
    reserved_for_episode_id: uuid("reserved_for_episode_id"),
    reserved_until: timestamp("reserved_until", { withTimezone: true }),
    is_active: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_beds_code").on(t.iq_tenant_id, t.bed_code),
    index("idx_beds_ward_status").on(t.iq_tenant_id, t.ward_id, t.bed_status),
  ],
);

/** Core admission/encounter record (ADR-0029 clinical row). */
export const episodes = ipdSchema.table(
  "episodes",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    episode_number: text("episode_number").notNull(),
    visit_id: uuid("visit_id"),
    patient_id: uuid("patient_id").notNull(),
    patient_name: text("patient_name").notNull(),
    admission_type: text("admission_type").notNull(),
    admission_source: text("admission_source").notNull(),
    status: text("status").notNull().default("scheduled"),
    ward_id: uuid("ward_id"),
    bed_id: uuid("bed_id"),
    specialty_id: uuid("specialty_id"),
    attending_consultant_id: uuid("attending_consultant_id"),
    provisional_diagnosis: text("provisional_diagnosis"),
    financial_class: text("financial_class").notNull().default("general"),
    deposit_amount: numeric("deposit_amount", { precision: 18, scale: 4 }),
    expected_los_days: smallint("expected_los_days"),
    admitted_at: timestamp("admitted_at", { withTimezone: true }),
    discharged_at: timestamp("discharged_at", { withTimezone: true }),
    closure_type: text("closure_type"),
    closure_reason: text("closure_reason"),
    idempotency_key: text("idempotency_key"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_episodes_number").on(t.iq_tenant_id, t.episode_number),
    uniqueIndex("uq_episodes_idempotency")
      .on(t.iq_tenant_id, t.idempotency_key)
      .where(sql`${t.idempotency_key} is not null`),
    uniqueIndex("uq_episodes_visit")
      .on(t.iq_tenant_id, t.visit_id)
      .where(sql`${t.visit_id} is not null`),
    index("idx_episodes_status").on(t.iq_tenant_id, t.status),
    index("idx_episodes_patient").on(t.iq_tenant_id, t.patient_id),
    index("idx_episodes_ward_status").on(t.iq_tenant_id, t.ward_id, t.status),
  ],
);

/** Doctor/nurse documentation — Notes tab (LLD §4). */
export const clinicalNotes = ipdSchema.table(
  "clinical_notes",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    episode_id: uuid("episode_id").notNull(),
    note_type: text("note_type").notNull(),
    author_id: uuid("author_id").notNull(),
    author_role: text("author_role").notNull(),
    author_specialty_code: text("author_specialty_code"),
    content: jsonb("content").notNull().default({}),
    status: text("status").notNull().default("draft"),
    finalized_at: timestamp("finalized_at", { withTimezone: true }),
    finalized_by: uuid("finalized_by"),
    signed_at: timestamp("signed_at", { withTimezone: true }),
    signed_by: uuid("signed_by"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_clinical_notes_episode").on(t.iq_tenant_id, t.episode_id),
    index("idx_clinical_notes_author_status").on(t.iq_tenant_id, t.author_id, t.status),
  ],
);

/** Parameterized vital observations — Vitals tab (LLD §5). */
export const vitalSigns = ipdSchema.table(
  "vital_signs",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    episode_id: uuid("episode_id").notNull(),
    check_in_id: uuid("check_in_id").notNull(),
    recorded_at: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    vital_code: text("vital_code").notNull(),
    vital_name: text("vital_name").notNull(),
    data_type: text("data_type").notNull(),
    value_numeric: numeric("value_numeric", { precision: 18, scale: 4 }),
    value_text: text("value_text"),
    unit: text("unit"),
    recorded_by: uuid("recorded_by").notNull(),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_vital_signs_episode_check_in").on(t.iq_tenant_id, t.episode_id, t.check_in_id),
    index("idx_vital_signs_episode_recorded").on(t.iq_tenant_id, t.episode_id, t.recorded_at),
    index("idx_vital_signs_check_in").on(t.iq_tenant_id, t.check_in_id),
  ],
);

/** Inpatient orders — Order Tracker (LLD §6). */
export const inpatientOrders = ipdSchema.table(
  "inpatient_orders",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    episode_id: uuid("episode_id").notNull(),
    order_number: text("order_number").notNull(),
    order_category: text("order_category").notNull(),
    item_code: text("item_code").notNull(),
    item_name: text("item_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    dosage_instruction: text("dosage_instruction"),
    frequency: text("frequency"),
    duration_days: smallint("duration_days"),
    priority: text("priority").notNull().default("routine"),
    status: text("status").notNull().default("placed"),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    cancelled_reason: text("cancelled_reason"),
    billing_status: text("billing_status").notNull().default("pending"),
    notes: text("notes"),
    idempotency_key: text("idempotency_key"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_inpatient_orders_number").on(t.iq_tenant_id, t.order_number),
    uniqueIndex("uq_inpatient_orders_idempotency")
      .on(t.iq_tenant_id, t.idempotency_key)
      .where(sql`${t.idempotency_key} is not null`),
    index("idx_inpatient_orders_episode_status").on(t.iq_tenant_id, t.episode_id, t.status),
    index("idx_inpatient_orders_category_status").on(
      t.iq_tenant_id,
      t.order_category,
      t.status,
    ),
  ],
);
