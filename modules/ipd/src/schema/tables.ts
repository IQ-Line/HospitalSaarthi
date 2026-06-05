import {
  boolean,
  date,
  index,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  tenantColumn,
  auditColumns,
  sql,
} from "@hims/ts-sdk-db";

export const ipdSchema = pgSchema("ipd");

/** IPD / day-care episode — admission intake owner (ADR-0029 clinical row). */
export const admissions = ipdSchema.table(
  "admission",
  {
    admission_id: uuid("admission_id").defaultRandom().notNull(),
    ...tenantColumn(),
    admission_number: text("admission_number").notNull(),

    patient_id: uuid("patient_id").notNull(),
    registration_visit_id: uuid("registration_visit_id"),
    source_visit_id: uuid("source_visit_id"),

    admission_type: text("admission_type").notNull().default("IPD"),
    admission_source: text("admission_source").notNull(),

    facility_id: uuid("facility_id").notNull(),
    department_id: uuid("department_id"),
    intended_ward_code: text("intended_ward_code"),
    admitting_doctor_id: uuid("admitting_doctor_id"),
    attending_doctor_id: uuid("attending_doctor_id"),

    status: text("status").notNull().default("draft"),

    admission_datetime: timestamp("admission_datetime", { withTimezone: true }),
    expected_discharge_date: date("expected_discharge_date"),

    chief_complaint: text("chief_complaint"),
    provisional_diagnosis: text("provisional_diagnosis"),
    payer_type: text("payer_type").notNull().default("self"),
    insurance_reference: text("insurance_reference"),
    companion_name: text("companion_name"),
    companion_phone: text("companion_phone"),
    remarks: text("remarks"),
    mother_admission_id: uuid("mother_admission_id"),

    deposit_required: boolean("deposit_required").notNull().default(false),
    deposit_amount: numeric("deposit_amount", { precision: 12, scale: 2 }),
    deposit_bill_id: uuid("deposit_bill_id"),
    deposit_collected_at: timestamp("deposit_collected_at", { withTimezone: true }),

    ward_code: text("ward_code"),
    ward_name: text("ward_name"),
    bed_label: text("bed_label"),
    bed_assigned_at: timestamp("bed_assigned_at", { withTimezone: true }),

    patient_uhid: text("patient_uhid").notNull(),
    patient_full_name: text("patient_full_name").notNull(),
    patient_phone: text("patient_phone"),
    patient_gender: text("patient_gender"),
    patient_date_of_birth: date("patient_date_of_birth"),

    cancel_reason: text("cancel_reason"),
    idempotency_key: text("idempotency_key"),

    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.admission_id] }),
    uniqueIndex("uq_admission_number").on(t.iq_tenant_id, t.admission_number),
    uniqueIndex("uq_admission_idempotency")
      .on(t.iq_tenant_id, t.idempotency_key)
      .where(sql`${t.idempotency_key} is not null`),
    uniqueIndex("uq_admission_registration_visit")
      .on(t.iq_tenant_id, t.registration_visit_id)
      .where(sql`${t.registration_visit_id} is not null`),
    index("idx_admission_queue").on(t.iq_tenant_id, t.status, t.updated_at),
    index("idx_admission_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);
