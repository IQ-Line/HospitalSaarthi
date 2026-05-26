import type { DbInstance } from "@hims/ts-sdk-db";
import { erasureLog } from "../schema/tables.js";
import type { ErasureLogRepo } from "../ports.js";

export class DrizzleErasureLogRepo implements ErasureLogRepo {
  constructor(private db: DbInstance) {}

  async insert(data: {
    iqTenantId: string;
    erasedEntityKind: string;
    erasedEntityId: string;
    consentArtifactId?: string;
    patientId: string;
    dataEraseAt: string;
    reason: string;
  }): Promise<void> {
    await this.db.insert(erasureLog).values({
      iq_tenant_id: data.iqTenantId,
      erased_entity_kind: data.erasedEntityKind,
      erased_entity_id: data.erasedEntityId,
      consent_artifact_id: data.consentArtifactId ?? null,
      patient_id: data.patientId,
      data_erase_at: new Date(data.dataEraseAt),
      reason: data.reason,
    });
  }
}
