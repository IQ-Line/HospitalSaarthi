import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { patientSourceRecords } from "../schema/tables.js";
import type { SourceRecordRepo } from "../ports.js";
import type {
  PatientSourceRecord,
  CreateSourceRecordData,
} from "../domain/patient.types.js";

export class DrizzleSourceRecordRepo implements SourceRecordRepo {
  constructor(private db: DbInstance) {}

  async findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<PatientSourceRecord[]> {
    const rows = await this.db
      .select()
      .from(patientSourceRecords)
      .where(
        and(
          eq(patientSourceRecords.iq_tenant_id, tenantId),
          eq(patientSourceRecords.patient_id, patientId),
        ),
      )
      .orderBy(patientSourceRecords.contributed_at);
    return rows as PatientSourceRecord[];
  }

  async create(data: CreateSourceRecordData): Promise<PatientSourceRecord> {
    const rows = await this.db
      .insert(patientSourceRecords)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        patient_id: data.patient_id,
        source_system: data.source_system,
        source_reference: data.source_reference ?? null,
        demographics_snapshot: data.demographics_snapshot,
        contributed_by: data.contributed_by ?? null,
      })
      .returning();
    return rows[0] as PatientSourceRecord;
  }
}
