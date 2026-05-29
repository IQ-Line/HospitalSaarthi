import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { abdmConsentArtefacts } from "../schema/tables.js";
import type { ConsentArtefactsPort, ConsentArtefactRow } from "../ports.js";

export class DrizzleConsentArtefactsRepo implements ConsentArtefactsPort {
  constructor(private readonly db: DbInstance) {}

  async upsert(input: ConsentArtefactRow): Promise<boolean> {
    const rows = await this.db
      .insert(abdmConsentArtefacts)
      .values({
        iq_tenant_id: input.iqTenantId,
        consent_id: input.consentId,
        patient_id: input.patientId,
        hip_id: input.hipId,
        hiu_id: input.hiuId,
        status: input.status,
        data_erase_at: input.dataEraseAt,
        granted_at: input.grantedAt,
        artefact_json: input.artefactJson,
        signature: input.signature,
        signature_valid: input.signatureValid,
      })
      .onConflictDoNothing()
      .returning({ consent_id: abdmConsentArtefacts.consent_id });
    return rows.length > 0;
  }

  async findById(
    iqTenantId: string,
    consentId: string,
  ): Promise<ConsentArtefactRow | null> {
    const rows = await this.db
      .select()
      .from(abdmConsentArtefacts)
      .where(
        and(
          eq(abdmConsentArtefacts.iq_tenant_id, iqTenantId),
          eq(abdmConsentArtefacts.consent_id, consentId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      iqTenantId: row.iq_tenant_id,
      consentId: row.consent_id,
      patientId: row.patient_id,
      hipId: row.hip_id,
      hiuId: row.hiu_id,
      status: row.status,
      dataEraseAt: row.data_erase_at,
      grantedAt: row.granted_at,
      artefactJson: row.artefact_json as Record<string, unknown>,
      signature: row.signature,
      signatureValid: row.signature_valid,
    };
  }
}
