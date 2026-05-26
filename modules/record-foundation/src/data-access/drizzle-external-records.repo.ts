import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { externalHealthRecords } from "../schema/tables.js";
import type { ExternalHealthRecordRepo } from "../ports.js";
import type {
  ExternalHealthRecord,
  IngestExternalRecordData,
} from "../domain/external-record.js";

export class DrizzleExternalHealthRecordRepo
  implements ExternalHealthRecordRepo
{
  constructor(private db: DbInstance) {}

  async findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<ExternalHealthRecord[]> {
    const rows = await this.db
      .select()
      .from(externalHealthRecords)
      .where(
        and(
          eq(externalHealthRecords.iq_tenant_id, tenantId),
          eq(externalHealthRecords.patient_id, patientId),
        ),
      )
      .orderBy(externalHealthRecords.received_at);
    return rows as ExternalHealthRecord[];
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<ExternalHealthRecord | null> {
    const rows = await this.db
      .select()
      .from(externalHealthRecords)
      .where(
        and(
          eq(externalHealthRecords.iq_tenant_id, tenantId),
          eq(externalHealthRecords.id, id),
        ),
      );
    return (rows[0] as ExternalHealthRecord) ?? null;
  }

  async create(data: IngestExternalRecordData): Promise<ExternalHealthRecord> {
    const rows = await this.db
      .insert(externalHealthRecords)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        patient_id: data.patient_id,
        care_context_id: data.care_context_id,
        bundle_manifest_id: data.bundle_manifest_id,
        consent_artifact_id: data.consent_artifact_id,
        source_hip_id: data.source_hip_id,
        source_hip_display_name: data.source_hip_display_name ?? null,
        display_summary: data.display_summary ?? null,
        data_erase_at: data.data_erase_at,
      })
      .returning();
    return rows[0] as ExternalHealthRecord;
  }

  async markViewed(
    tenantId: string,
    id: string,
    viewedAt: string,
  ): Promise<ExternalHealthRecord | null> {
    const rows = await this.db
      .update(externalHealthRecords)
      .set({
        doctor_viewed_at: new Date(viewedAt),
      })
      .where(
        and(
          eq(externalHealthRecords.iq_tenant_id, tenantId),
          eq(externalHealthRecords.id, id),
        ),
      )
      .returning();
    return (rows[0] as ExternalHealthRecord) ?? null;
  }
}
