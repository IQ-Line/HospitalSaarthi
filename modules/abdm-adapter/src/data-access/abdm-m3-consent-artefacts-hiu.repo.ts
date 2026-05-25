import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { abdmM3ConsentArtefactsHiu } from "../schema/tables.js";
import type { M3ConsentArtefactsHiuPort, M3ConsentArtefactHiuRow } from "../ports.js";

function rowToRecord(
  row: typeof abdmM3ConsentArtefactsHiu.$inferSelect,
): M3ConsentArtefactHiuRow {
  return {
    iqTenantId: row.iq_tenant_id,
    consentId: row.consent_id,
    consentRequestId: row.consent_request_id,
    patientAbhaAddress: row.patient_abha_address,
    hipId: row.hip_id,
    status: row.status,
    dataEraseAt: row.data_erase_at,
    grantedAt: row.granted_at,
    hiTypes: row.hi_types ?? [],
    careContexts: (row.care_contexts ?? []) as Array<{
      patientReference: string;
      careContextReference: string;
    }>,
    artefactJson: row.artefact_json as Record<string, unknown>,
    signature: row.signature,
    signatureValid: row.signature_valid,
    receivedAt: row.received_at,
  };
}

export class DrizzleM3ConsentArtefactsHiuRepo implements M3ConsentArtefactsHiuPort {
  constructor(private readonly db: DbInstance) {}

  async upsert(input: M3ConsentArtefactHiuRow): Promise<void> {
    await this.db
      .insert(abdmM3ConsentArtefactsHiu)
      .values({
        iq_tenant_id: input.iqTenantId,
        consent_id: input.consentId,
        consent_request_id: input.consentRequestId,
        patient_abha_address: input.patientAbhaAddress,
        hip_id: input.hipId,
        status: input.status,
        data_erase_at: input.dataEraseAt,
        granted_at: input.grantedAt,
        hi_types: input.hiTypes,
        care_contexts: input.careContexts,
        artefact_json: input.artefactJson,
        signature: input.signature,
        signature_valid: input.signatureValid,
      })
      .onConflictDoUpdate({
        target: [
          abdmM3ConsentArtefactsHiu.iq_tenant_id,
          abdmM3ConsentArtefactsHiu.consent_id,
        ],
        set: {
          status: input.status,
          artefact_json: input.artefactJson,
          signature: input.signature,
          signature_valid: input.signatureValid,
        },
      });
  }

  async findById(
    iqTenantId: string,
    consentId: string,
  ): Promise<M3ConsentArtefactHiuRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3ConsentArtefactsHiu)
      .where(
        and(
          eq(abdmM3ConsentArtefactsHiu.iq_tenant_id, iqTenantId),
          eq(abdmM3ConsentArtefactsHiu.consent_id, consentId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async listForRequest(
    iqTenantId: string,
    consentRequestId: string,
  ): Promise<M3ConsentArtefactHiuRow[]> {
    const rows = await this.db
      .select()
      .from(abdmM3ConsentArtefactsHiu)
      .where(
        and(
          eq(abdmM3ConsentArtefactsHiu.iq_tenant_id, iqTenantId),
          eq(abdmM3ConsentArtefactsHiu.consent_request_id, consentRequestId),
        ),
      );
    return rows.map(rowToRecord);
  }
}
