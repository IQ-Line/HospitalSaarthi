import type { DbInstance } from "@hims/ts-sdk-db";
import { and, desc, eq, inArray, lt, sql } from "@hims/ts-sdk-db";
import { abdmM3DataTransfers, abdmSessions } from "../schema/tables.js";
import type { M3DataTransfersPort, M3DataTransferRow } from "../ports.js";
import { M3Hiu } from "../lib/m3-fsm-states.js";

function rowToRecord(row: typeof abdmM3DataTransfers.$inferSelect): M3DataTransferRow {
  return {
    iqTenantId: row.iq_tenant_id,
    transferId: row.transfer_id,
    sessionId: row.session_id,
    flowKind: row.flow_kind,
    state: row.state as M3DataTransferRow["state"],
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
          inArray(abdmM3DataTransfers.state, [M3Hiu.DATA_REQUESTED, M3Hiu.AWAITING_PUSH]),
        ),
      )
      .orderBy(desc(abdmM3DataTransfers.updated_at))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async patch(input: {
    iqTenantId: string;
    transferId: string;
    state?: M3DataTransferRow["state"];
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

  async patchWithSession(input: {
    iqTenantId: string;
    transferId: string;
    transfer: {
      state?: M3DataTransferRow["state"];
      cmTransactionId?: string | null;
      hipPublicKeyB64?: string;
      hipNonceB64?: string;
      bundleJson?: Record<string, unknown> | null;
      error?: { code: string; message: string } | null;
      awaitingPushUntil?: Date | null;
    };
    session?: {
      sessionId: string;
      state?: M3DataTransferRow["state"];
      contextMerge?: Record<string, unknown>;
    };
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(abdmM3DataTransfers)
        .set({
          ...(input.transfer.state ? { state: input.transfer.state } : {}),
          ...(input.transfer.cmTransactionId !== undefined
            ? { cm_transaction_id: input.transfer.cmTransactionId }
            : {}),
          ...(input.transfer.hipPublicKeyB64 !== undefined
            ? { hip_public_key_b64: input.transfer.hipPublicKeyB64 }
            : {}),
          ...(input.transfer.hipNonceB64 !== undefined
            ? { hip_nonce_b64: input.transfer.hipNonceB64 }
            : {}),
          ...(input.transfer.bundleJson !== undefined
            ? { bundle_json: input.transfer.bundleJson }
            : {}),
          ...(input.transfer.error !== undefined ? { error: input.transfer.error } : {}),
          ...(input.transfer.awaitingPushUntil !== undefined
            ? { awaiting_push_until: input.transfer.awaitingPushUntil }
            : {}),
          updated_at: new Date(),
        })
        .where(
          and(
            eq(abdmM3DataTransfers.iq_tenant_id, input.iqTenantId),
            eq(abdmM3DataTransfers.transfer_id, input.transferId),
          ),
        );

      if (input.session) {
        const hasContextMerge =
          input.session.contextMerge !== undefined &&
          Object.keys(input.session.contextMerge).length > 0;
        await tx
          .update(abdmSessions)
          .set({
            ...(input.session.state !== undefined ? { state: input.session.state } : {}),
            ...(hasContextMerge
              ? {
                  context: sql`${abdmSessions.context} || ${JSON.stringify(input.session.contextMerge)}::jsonb`,
                }
              : {}),
            updated_at: new Date(),
          })
          .where(
            and(
              eq(abdmSessions.iq_tenant_id, input.iqTenantId),
              eq(abdmSessions.session_id, input.session.sessionId),
            ),
          );
      }
    });
  }

  async janitor(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .update(abdmM3DataTransfers)
      .set({
        state: M3Hiu.EXPIRED,
        error: { code: "AWAITING_PUSH_TIMEOUT", message: "HIP push not received in time" },
        updated_at: now,
      })
      .where(
        and(
          eq(abdmM3DataTransfers.state, M3Hiu.AWAITING_PUSH),
          lt(abdmM3DataTransfers.awaiting_push_until, now),
        ),
      )
      .returning({ transfer_id: abdmM3DataTransfers.transfer_id });
    return result.length;
  }
}
