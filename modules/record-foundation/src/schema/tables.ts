import {
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  pgSchema,
  primaryKey,
  unique,
  index,
  foreignKey,
  tenantColumn,
  auditColumns,
} from "@hims/ts-sdk-db";

export const recordFoundationSchema = pgSchema("record_foundation");

export const careContexts = recordFoundationSchema.table(
  "care_contexts",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    source_origin: text("source_origin").notNull(),
    source_system_id: text("source_system_id").notNull(),
    source_record_type: text("source_record_type").notNull(),
    source_record_id: text("source_record_id"),
    encounter_id: uuid("encounter_id"),
    display: text("display").notNull(),
    period_start: timestamp("period_start", { withTimezone: true }).notNull(),
    period_end: timestamp("period_end", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_care_contexts_source").on(
      t.iq_tenant_id,
      t.source_origin,
      t.source_system_id,
      t.source_record_id,
      t.source_record_type,
    ),
    index("idx_care_contexts_patient_time").on(
      t.iq_tenant_id,
      t.patient_id,
      t.period_start,
    ),
    index("idx_care_contexts_encounter").on(t.iq_tenant_id, t.encounter_id),
  ],
);

export const bundles = recordFoundationSchema.table(
  "bundles",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    care_context_id: uuid("care_context_id").notNull(),
    bundle_kind: text("bundle_kind").notNull(),
    fhir_profile_url: text("fhir_profile_url").notNull(),
    fhir_profile_version: text("fhir_profile_version").notNull(),
    producer_kind: text("producer_kind").notNull(),
    producer_id: text("producer_id").notNull(),
    bundle_json: jsonb("bundle_json").notNull(),
    bundle_size_bytes: integer("bundle_size_bytes").notNull(),
    produced_at: timestamp("produced_at", { withTimezone: true }).notNull(),
    stored_at: timestamp("stored_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_bundles_care_context").on(t.iq_tenant_id, t.care_context_id),
    index("idx_bundles_kind").on(t.iq_tenant_id, t.bundle_kind),
    foreignKey({
      columns: [t.iq_tenant_id, t.care_context_id],
      foreignColumns: [careContexts.iq_tenant_id, careContexts.id],
    }),
  ],
);
