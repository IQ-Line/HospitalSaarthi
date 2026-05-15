import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "@hims/ts-sdk-db";
import { desc, inArray } from "drizzle-orm";
import { registrations } from "../schema/tables.js";
import type { RegistrationRepo } from "../ports.js";
import type {
  CreateRegistrationInput,
  ListRegistrationsParams,
  RegistrationRecord,
} from "../domain/registration.types.js";

export class DrizzleRegistrationRepo implements RegistrationRepo {
  constructor(private readonly db: DbInstance) {}

  async insert(
    tenantId: string,
    input: CreateRegistrationInput,
  ): Promise<RegistrationRecord> {
    const rows = await this.db
      .insert(registrations)
      .values({
        iq_tenant_id: tenantId,
        patient_id: input.patient_id,
        visit_id: input.visit_id ?? null,
        facility_id: input.facility_id ?? null,
        visit_type: input.visit_type ?? null,
        department_id: input.department_id ?? null,
        provider_id: input.provider_id ?? null,
        appointment_id: input.appointment_id ?? null,
        registration_status: input.registration_status ?? "pending",
        created_by: input.created_by ?? null,
        updated_by: input.created_by ?? null,
      })
      .returning();
    return rows[0] as RegistrationRecord;
  }

  async findById(
    tenantId: string,
    registrationId: string,
  ): Promise<RegistrationRecord | undefined> {
    const rows = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.iq_tenant_id, tenantId),
          eq(registrations.registration_id, registrationId),
        ),
      );
    return (rows[0] as RegistrationRecord) ?? undefined;
  }

  async listPage(
    tenantId: string,
    params: ListRegistrationsParams & { patientIds?: string[] },
  ): Promise<{ rows: RegistrationRecord[]; total: number }> {
    const page = params.page;
    const limit = params.limit;
    const offset = (page - 1) * limit;

    const conditions = [eq(registrations.iq_tenant_id, tenantId)];

    if (params.patientIds && params.patientIds.length > 0) {
      conditions.push(inArray(registrations.patient_id, params.patientIds));
    }

    const where = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(registrations)
        .where(where)
        .orderBy(desc(registrations.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(registrations)
        .where(where),
    ]);

    return {
      rows: data as RegistrationRecord[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }
}
