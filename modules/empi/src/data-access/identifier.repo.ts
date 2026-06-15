import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, ilike, sql } from "@hims/ts-sdk-db";
import { patientIdentifiers } from "../schema/tables.js";
import type { IdentifierRepo } from "../ports.js";
import type {
  PatientIdentifier,
  CreateIdentifierData,
} from "../domain/patient.types.js";

export class DrizzleIdentifierRepo implements IdentifierRepo {
  constructor(private db: DbInstance) {}

  async findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<PatientIdentifier[]> {
    const rows = await this.db
      .select()
      .from(patientIdentifiers)
      .where(
        and(
          eq(patientIdentifiers.iq_tenant_id, tenantId),
          eq(patientIdentifiers.patient_id, patientId),
          eq(patientIdentifiers.is_active, true),
        ),
      );
    return rows as PatientIdentifier[];
  }

  async findActivePatientIdByIdentifier(
    tenantId: string,
    identifierType: string,
    identifierValue: string,
  ): Promise<string | undefined> {
    const normalizedValue = identifierValue.trim();
    const rows = await this.db
      .select({ patient_id: patientIdentifiers.patient_id })
      .from(patientIdentifiers)
      .where(
        and(
          eq(patientIdentifiers.iq_tenant_id, tenantId),
          eq(patientIdentifiers.identifier_type, identifierType),
          identifierType === "abha_address"
            ? sql`lower(${patientIdentifiers.identifier_value}) = lower(${normalizedValue})`
            : eq(patientIdentifiers.identifier_value, normalizedValue),
          eq(patientIdentifiers.is_active, true),
        ),
      )
      .limit(1);
    return rows[0]?.patient_id;
  }

  async create(data: CreateIdentifierData): Promise<PatientIdentifier> {
    const rows = await this.db
      .insert(patientIdentifiers)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        patient_id: data.patient_id,
        identifier_type: data.identifier_type,
        identifier_value: data.identifier_value,
        issuing_system: data.issuing_system ?? null,
        source_record_id: data.source_record_id ?? null,
        created_by: data.created_by ?? null,
      })
      .returning();
    return rows[0] as PatientIdentifier;
  }

  async deactivate(
    tenantId: string,
    id: string,
  ): Promise<PatientIdentifier | undefined> {
    const rows = await this.db
      .update(patientIdentifiers)
      .set({ is_active: false })
      .where(
        and(
          eq(patientIdentifiers.iq_tenant_id, tenantId),
          eq(patientIdentifiers.id, id),
        ),
      )
      .returning();
    return (rows[0] as PatientIdentifier) ?? undefined;
  }
}
