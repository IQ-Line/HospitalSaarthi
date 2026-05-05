import {
  pgSchema,
  uuid,
  text,
  date,
  smallint,
  bigint,
  boolean,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";

export const empiSchema = pgSchema("empi");

// ─── patients (golden record) ────────────────────────────────────────────────

export const patients = empiSchema.table(
  "patients",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    uhid: text("uhid").notNull(),
    abha_number: text("abha_number"),
    salutation: text("salutation"),
    first_name: text("first_name").notNull(),
    middle_name: text("middle_name"),
    last_name: text("last_name"),
    full_name: text("full_name").notNull(),
    father_name: text("father_name"),
    mother_name: text("mother_name"),
    date_of_birth: date("date_of_birth"),
    year_of_birth: smallint("year_of_birth"),
    age_years: smallint("age_years"),
    age_months: smallint("age_months"),
    age_days: smallint("age_days"),
    gender: text("gender").notNull(),
    phone_number: text("phone_number").notNull(),
    alternate_phone: text("alternate_phone"),
    blood_group: text("blood_group"),
    occupation: text("occupation"),
    religion: text("religion"),
    caste: text("caste"),
    nationality: text("nationality").notNull().default("Indian"),
    education: text("education"),
    emergency_contact_name: text("emergency_contact_name"),
    emergency_contact_relationship: text("emergency_contact_relationship"),
    emergency_contact_phone: text("emergency_contact_phone"),
    status: text("status").notNull().default("active"),
    merged_into_id: uuid("merged_into_id"),
    registered_by: uuid("registered_by"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_patients_tenant_uhid").on(t.iq_tenant_id, t.uhid),
    unique("uq_patients_tenant_abha").on(t.iq_tenant_id, t.abha_number),
    index("idx_patients_phone").on(t.iq_tenant_id, t.phone_number),
    index("idx_patients_fullname").on(t.full_name),
    index("idx_patients_status").on(t.iq_tenant_id, t.status),
  ],
);

// ─── patient_source_records ──────────────────────────────────────────────────

export const patientSourceRecords = empiSchema.table(
  "patient_source_records",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    source_system: text("source_system").notNull(),
    source_reference: text("source_reference"),
    demographics_snapshot: jsonb("demographics_snapshot").notNull(),
    contributed_at: timestamp("contributed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    contributed_by: uuid("contributed_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_source_records_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);

// ─── patient_identifiers ─────────────────────────────────────────────────────

export const patientIdentifiers = empiSchema.table(
  "patient_identifiers",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    identifier_type: text("identifier_type").notNull(),
    identifier_value: text("identifier_value").notNull(),
    issuing_system: text("issuing_system"),
    source_record_id: uuid("source_record_id"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    unique("uq_identifiers_type_value").on(
      t.iq_tenant_id,
      t.identifier_type,
      t.identifier_value,
    ),
    index("idx_identifiers_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);

// ─── patient_addresses ───────────────────────────────────────────────────────

export const patientAddresses = empiSchema.table(
  "patient_addresses",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    address_type: text("address_type").notNull(),
    street: text("street"),
    city: text("city"),
    district: text("district"),
    state: text("state"),
    pincode: text("pincode"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_addresses_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);

// ─── sequence_counters ───────────────────────────────────────────────────────

export const sequenceCounters = empiSchema.table(
  "sequence_counters",
  {
    ...tenantColumn(),
    sequence_name: text("sequence_name").notNull(),
    current_value: bigint("current_value", { mode: "number" })
      .notNull()
      .default(0),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.sequence_name] }),
  ],
);

// ─── match_candidates (future — schema only at MVP) ─────────────────────────

export const matchCandidates = empiSchema.table(
  "match_candidates",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_a_id: uuid("patient_a_id").notNull(),
    patient_b_id: uuid("patient_b_id").notNull(),
    match_score: numeric("match_score", { precision: 5, scale: 4 }).notNull(),
    match_algorithm: text("match_algorithm").notNull(),
    blocking_keys_matched: text("blocking_keys_matched").array(),
    status: text("status").notNull().default("pending"),
    reviewed_by: uuid("reviewed_by"),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_match_candidates_pending").on(t.iq_tenant_id, t.status),
  ],
);

// ─── merge_history (future — schema only at MVP) ────────────────────────────

export const mergeHistory = empiSchema.table(
  "merge_history",
  {
    id: uuid("id").defaultRandom().notNull(),
    ...tenantColumn(),
    surviving_patient_id: uuid("surviving_patient_id").notNull(),
    merged_patient_id: uuid("merged_patient_id").notNull(),
    merge_reason: text("merge_reason"),
    pre_merge_snapshot: jsonb("pre_merge_snapshot").notNull(),
    merged_by: uuid("merged_by").notNull(),
    merged_at: timestamp("merged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unmerged_at: timestamp("unmerged_at", { withTimezone: true }),
    unmerged_by: uuid("unmerged_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_merge_history_surviving").on(
      t.iq_tenant_id,
      t.surviving_patient_id,
    ),
    index("idx_merge_history_merged").on(
      t.iq_tenant_id,
      t.merged_patient_id,
    ),
  ],
);
