import {
  bigint,
  index,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  boolean,
  integer,
  tenantColumn,
  auditColumns,
} from "@hims/ts-sdk-db";

export const recordFoundationSchema = pgSchema("record_foundation");

// ─── care_contexts ───────────────────────────────────────────────────────────

export const careContexts = recordFoundationSchema.table(
  "care_contexts",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    abha_linkage_status: text("abha_linkage_status").notNull().default("not_linked"),
    abdm_reference_number: text("abdm_reference_number"),
    source_origin: text("source_origin").notNull(),
    source_system_id: text("source_system_id").notNull(),
    source_record_type: text("source_record_type").notNull(),
    source_record_id: text("source_record_id"),
    encounter_id: uuid("encounter_id"),
    display: text("display").notNull(),
    period_start: timestamp("period_start", { withTimezone: true }).notNull(),
    period_end: timestamp("period_end", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    supersedes_id: uuid("supersedes_id"),
    sensitivity_labels: text("sensitivity_labels").array(),
    consent_disclosable: boolean("consent_disclosable").notNull().default(false),
    ...auditColumns(),
    linked_at: timestamp("linked_at", { withTimezone: true }),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }),
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
    unique("uq_care_contexts_abdm_ref").on(t.iq_tenant_id, t.abdm_reference_number),
    index("idx_care_contexts_patient_time").on(
      t.iq_tenant_id,
      t.patient_id,
      t.period_start,
    ),
    index("idx_care_contexts_linkable").on(
      t.iq_tenant_id,
      t.patient_id,
      t.status,
      t.abha_linkage_status,
    ),
    index("idx_care_contexts_erase_due").on(t.data_erase_at),
    index("idx_care_contexts_encounter").on(t.iq_tenant_id, t.encounter_id),
    index("idx_care_contexts_supersedes").on(t.iq_tenant_id, t.supersedes_id),
  ],
);

// ─── record_bundle_manifests ─────────────────────────────────────────────────

export const recordBundleManifests = recordFoundationSchema.table(
  "record_bundle_manifests",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    care_context_id: uuid("care_context_id").notNull(),
    bundle_kind: text("bundle_kind").notNull(),
    fhir_profile_url: text("fhir_profile_url").notNull(),
    fhir_profile_version: text("fhir_profile_version").notNull(),
    producer_kind: text("producer_kind").notNull(),
    producer_id: text("producer_id").notNull(),
    validation_status: text("validation_status").notNull().default("pending"),
    validation_errors: jsonb("validation_errors"),
    bundle_storage_id: uuid("bundle_storage_id").notNull(),
    bundle_size_bytes: integer("bundle_size_bytes").notNull(),
    bundle_hash: text("bundle_hash").notNull(),
    signature_storage_ref: text("signature_storage_ref"),
    produced_at: timestamp("produced_at", { withTimezone: true }).notNull(),
    received_at: timestamp("received_at", { withTimezone: true }),
    stored_at: timestamp("stored_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_manifests_care_context").on(t.iq_tenant_id, t.care_context_id),
    index("idx_manifests_kind").on(t.iq_tenant_id, t.bundle_kind),
    index("idx_manifests_invalid").on(t.iq_tenant_id, t.validation_status),
  ],
);

// ─── bundle_storage ──────────────────────────────────────────────────────────

export const bundleStorage = recordFoundationSchema.table(
  "bundle_storage",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    storage_kind: text("storage_kind").notNull().default("inline_jsonb"),
    bundle_jsonb: jsonb("bundle_jsonb"),
    object_storage_ref: text("object_storage_ref"),
    encryption_kind: text("encryption_kind").notNull().default("at_rest_pg"),
    stored_at: timestamp("stored_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
  ],
);

// ─── external_health_records ─────────────────────────────────────────────────

export const externalHealthRecords = recordFoundationSchema.table(
  "external_health_records",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    care_context_id: uuid("care_context_id").notNull(),
    bundle_manifest_id: uuid("bundle_manifest_id").notNull(),
    consent_artifact_id: uuid("consent_artifact_id").notNull(),
    source_hip_id: text("source_hip_id").notNull(),
    source_hip_display_name: text("source_hip_display_name"),
    received_at: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    display_summary: jsonb("display_summary"),
    doctor_viewed_at: timestamp("doctor_viewed_at", { withTimezone: true }),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }).notNull(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_external_records_patient_time").on(
      t.iq_tenant_id,
      t.patient_id,
      t.received_at,
    ),
    index("idx_external_records_consent").on(t.iq_tenant_id, t.consent_artifact_id),
    index("idx_external_records_erase_due").on(t.data_erase_at),
  ],
);

// ─── timeline_index ──────────────────────────────────────────────────────────

export const timelineIndex = recordFoundationSchema.table(
  "timeline_index",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    care_context_id: uuid("care_context_id").notNull(),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    origin_label: text("origin_label").notNull(),
    consent_disclosable: boolean("consent_disclosable").notNull().default(false),
    sensitivity_labels: text("sensitivity_labels").array(),
    rebuilt_at: timestamp("rebuilt_at", { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_timeline_context").on(t.iq_tenant_id, t.care_context_id),
    index("idx_timeline_patient_time").on(
      t.iq_tenant_id,
      t.patient_id,
      t.occurred_at,
    ),
    index("idx_timeline_disclosable").on(
      t.iq_tenant_id,
      t.patient_id,
      t.consent_disclosable,
    ),
  ],
);

// ─── erasure_log ─────────────────────────────────────────────────────────────

export const erasureLog = recordFoundationSchema.table(
  "erasure_log",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    ...tenantColumn(),
    erased_entity_kind: text("erased_entity_kind").notNull(),
    erased_entity_id: uuid("erased_entity_id").notNull(),
    consent_artifact_id: uuid("consent_artifact_id"),
    patient_id: uuid("patient_id").notNull(),
    original_size_bytes: integer("original_size_bytes"),
    original_hash: text("original_hash"),
    data_erase_at: timestamp("data_erase_at", { withTimezone: true }).notNull(),
    erased_at: timestamp("erased_at", { withTimezone: true }).notNull().defaultNow(),
    erasure_actor: text("erasure_actor").notNull().default("scheduler"),
    reason: text("reason").notNull(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_erasure_log_patient").on(t.iq_tenant_id, t.patient_id, t.erased_at),
    index("idx_erasure_log_consent").on(t.iq_tenant_id, t.consent_artifact_id),
  ],
);
