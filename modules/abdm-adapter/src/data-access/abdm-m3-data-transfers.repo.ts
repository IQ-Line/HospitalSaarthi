import type { DbInstance } from "@hims/ts-sdk-db";
import { and, desc, eq, inArray } from "@hims/ts-sdk-db";
import { abdmM3DataTransfers } from "../schema/tables.js";
import type { M3DataTransfersPort, M3DataTransferRow } from "../ports.js";

function rowToRecord(row: typeof abdmM3DataTransfers.$inferSelect): M3DataTransferRow {
  return {
    iqTenantId: row.iq_tenant_id,
    transferId: row.transfer_id,
    sessionId: row.session_id,
    flowKind: row.flow_kind,
    state: row.state,
    consentId: row.consent_id,
    outboundRequestId: row.outbound_request_id,
    cmTransactionId: row.cm_transaction_id,
    hiuPrivateKeyJwk: row.hiu_private_key_jwk,
    hiuPublicKeyB64: row.hiu_public_key_b64,
    hiuNonceB64: row.hiu_nonce_b64,
    hipPublicKeyB64: row.hip_public_key_b64,
    hipNonceB64: row.hip_nonce_b64,
    dataPushUrl: row.data_push_url,
    bundleJson: row.bundle_json as Record<string, unknown> | null,
    error: row.error as { code: string; message: string } | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    awaitingPushUntil: row.awaiting_push_until,
  };
}

export class DrizzleM3DataTransfersRepo implements M3DataTransfersPort {
  constructor(private readonly db: DbInstance) {}

  async insert(input: Omit<M3DataTransferRow, "createdAt" | "updatedAt">): Promise<void> {
    await this.db.insert(abdmM3DataTransfers).values({
      iq_tenant_id: input.iqTenantId,
      transfer_id: input.transferId,
      session_id: input.sessionId,
      flow_kind: input.flowKind,
      state: input.state,
      consent_id: input.consentId,
      outbound_request_id: input.outboundRequestId,
      cm_transaction_id: input.cmTransactionId,
      hiu_private_key_jwk: input.hiuPrivateKeyJwk,
      hiu_public_key_b64: input.hiuPublicKeyB64,
      hiu_nonce_b64: input.hiuNonceB64,
      hip_public_key_b64: input.hipPublicKeyB64,
      hip_nonce_b64: input.hipNonceB64,
      data_push_url: input.dataPushUrl,
      bundle_json: input.bundleJson,
      error: input.error,
      awaiting_push_until: input.awaitingPushUntil,
    });
  }

  async findById(
    iqTenantId: string,
    transferId: string,
  ): Promise<M3DataTransferRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3DataTransfers)
      .where(
        and(
          eq(abdmM3DataTransfers.iq_tenant_id, iqTenantId),
          eq(abdmM3DataTransfers.transfer_id, transferId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async findByTransferId(transferId: string): Promise<M3DataTransferRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3DataTransfers)
      .where(eq(abdmM3DataTransfers.transfer_id, transferId))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async findByOutboundRequestId(input: {
    iqTenantId: string;
    outboundRequestId: string;
  }): Promise<M3DataTransferRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3DataTransfers)
      .where(
        and(
          eq(abdmM3DataTransfers.iq_tenant_id, input.iqTenantId),
          eq(abdmM3DataTransfers.outbound_request_id, input.outboundRequestId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async findLatestActiveByConsentId(
    iqTenantId: string,
    consentId: string,
  ): Promise<M3DataTransferRow | null> {
    const rows = await this.db
      .select()
      .from(abdmM3DataTransfers)
      .where(
        and(
          eq(abdmM3DataTransfers.iq_tenant_id, iqTenantId),
          eq(abdmM3DataTransfers.consent_id, consentId),
          inArray(abdmM3DataTransfers.state, ["DATA_REQUESTED", "AWAITING_PUSH"]),
        ),
      )
      .orderBy(desc(abdmM3DataTransfers.updated_at))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async patch(input: {
    iqTenantId: string;
    transferId: string;
    state?: string;
    cmTransactionId?: string;
    hipPublicKeyB64?: string;
    hipNonceB64?: string;
    bundleJson?: Record<string, unknown> | null;
    error?: { code: string; message: string } | null;
    awaitingPushUntil?: Date | null;
  }): Promise<void> {
    await this.db
      .update(abdmM3DataTransfers)
      .set({
        ...(input.state ? { state: input.state } : {}),
        ...(input.cmTransactionId !== undefined
          ? { cm_transaction_id: input.cmTransactionId }
          : {}),
        ...(input.hipPublicKeyB64 !== undefined
          ? { hip_public_key_b64: input.hipPublicKeyB64 }
          : {}),
        ...(input.hipNonceB64 !== undefined
          ? { hip_nonce_b64: input.hipNonceB64 }
          : {}),
        ...(input.bundleJson !== undefined ? { bundle_json: input.bundleJson } : {}),
        ...(input.error !== undefined ? { error: input.error } : {}),
        ...(input.awaitingPushUntil !== undefined
          ? { awaiting_push_until: input.awaitingPushUntil }
          : {}),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(abdmM3DataTransfers.iq_tenant_id, input.iqTenantId),
          eq(abdmM3DataTransfers.transfer_id, input.transferId),
        ),
      );
  }
}
