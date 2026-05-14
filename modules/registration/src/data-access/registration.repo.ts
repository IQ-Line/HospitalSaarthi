import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { registrations } from "../schema/tables.js";
import type { RegistrationRepo } from "../ports.js";
import type { CreateRegistrationData, Registration } from "../domain/registration.types.js";

function mapRow(row: typeof registrations.$inferSelect): Registration {
  return {
    registration_id: row.registration_id,
    iq_tenant_id: row.iq_tenant_id,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    facility_id: row.facility_id,
    visit_type: row.visit_type,
    department_id: row.department_id,
    provider_id: row.provider_id,
    appointment_id: row.appointment_id,
    registration_status: row.registration_status,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class DrizzleRegistrationRepo implements RegistrationRepo {
  constructor(private db: DbInstance) {}

  async create(
    tenantId: string,
    data: CreateRegistrationData,
  ): Promise<Registration> {
    const rows = await this.db
      .insert(registrations)
      .values({
        iq_tenant_id: tenantId,
        patient_id: data.patient_id,
        visit_id: data.visit_id ?? null,
        facility_id: data.facility_id ?? null,
        visit_type: data.visit_type ?? null,
        department_id: data.department_id ?? null,
        provider_id: data.provider_id ?? null,
        appointment_id: data.appointment_id ?? null,
        registration_status: data.registration_status ?? "pending",
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("insert registration returned no row");
    return mapRow(row);
  }

  async findById(
    tenantId: string,
    registrationId: string,
  ): Promise<Registration | undefined> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.registration_id, registrationId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? mapRow(row) : undefined;
  }
}
