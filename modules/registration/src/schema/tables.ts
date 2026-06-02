import {
  index,
  pgSchema,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
  varchar,
  tenantColumn,
  auditColumns,
  sql,
  date,
  smallint,
} from "@hims/ts-sdk-db";

export const registrationSchema = pgSchema("registration");

export const registrations = registrationSchema.table(
  "registration",
  {
    registration_id: uuid("registration_id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    patient_uhid: text("patient_uhid").notNull(),
    patient_abha_number: text("patient_abha_number"),
    patient_abha_address: text("patient_abha_address"),
    patient_full_name: text("patient_full_name").notNull(),
    patient_phone_number: text("patient_phone_number").notNull(),
    patient_gender: text("patient_gender"),
    patient_date_of_birth: date("patient_date_of_birth"),
    patient_year_of_birth: smallint("patient_year_of_birth"),
    patient_source_record_id: uuid("patient_source_record_id").notNull(),
    idempotency_key: text("idempotency_key"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.registration_id] }),
    index("idx_registration_patient").on(t.iq_tenant_id, t.patient_id),
    index("idx_registration_uhid").on(t.iq_tenant_id, t.patient_uhid),
    index("idx_registration_phone").on(t.iq_tenant_id, t.patient_phone_number),
    uniqueIndex("uq_registration_idempotency")
      .on(t.iq_tenant_id, t.idempotency_key)
      .where(sql`${t.idempotency_key} is not null`),
    uniqueIndex("uq_registration_patient").on(t.iq_tenant_id, t.patient_id),
  ],
);

export const visits = registrationSchema.table(
  "visit",
  {
    visit_id: uuid("visit_id").defaultRandom().notNull(),
    ...tenantColumn(),
    patient_id: uuid("patient_id").notNull(),
    visit_type: text("visit_type"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    facility_id: uuid("facility_id"),
    department_id: uuid("department_id"),
    doctor_id: uuid("doctor_id"),
    appointment_id: uuid("appointment_id"),
    idempotency_key: text("idempotency_key"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.visit_id] }),
    index("idx_visit_patient").on(t.iq_tenant_id, t.patient_id),
    index("idx_visit_status").on(t.iq_tenant_id, t.status),
    uniqueIndex("uq_visit_idempotency")
      .on(t.iq_tenant_id, t.idempotency_key)
      .where(sql`${t.idempotency_key} is not null`),
  ],
);
