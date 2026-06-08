import {
  boolean,
  index,
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
