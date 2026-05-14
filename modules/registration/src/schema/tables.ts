import {
  index,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
  tenantColumn,
  auditColumns,
} from "@hims/ts-sdk-db";

/** Registration module owns the `registration` PostgreSQL schema (Citus co-located with `iq_tenant_id`). */
export const registrationSchema = pgSchema("registration");

/**
 * Encounter registration — links patient to visit workflow (OPD / IPD / shared).
 * Foreign ids are logical references only (no cross-schema FKs).
 */
export const registrations = registrationSchema.table(
  "registration",
  {
    registration_id: uuid("registration_id").defaultRandom().notNull(),
    ...tenantColumn(),
    visit_id: uuid("visit_id"),
    patient_id: uuid("patient_id").notNull(),
    facility_id: uuid("facility_id"),
    visit_type: text("visit_type"),
    department_id: uuid("department_id"),
    provider_id: uuid("provider_id"),
    appointment_id: uuid("appointment_id"),
    registration_status: text("registration_status").notNull().default("pending"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.registration_id] }),
    index("idx_registration_patient").on(t.iq_tenant_id, t.patient_id),
    index("idx_registration_visit").on(t.iq_tenant_id, t.visit_id),
    index("idx_registration_status").on(t.iq_tenant_id, t.registration_status),
  ],
);
