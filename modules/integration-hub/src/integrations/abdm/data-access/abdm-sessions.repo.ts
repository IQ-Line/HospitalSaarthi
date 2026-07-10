import type { DbInstance } from "@hims/ts-sdk-db";
import { and, desc, eq, sql } from "@hims/ts-sdk-db";
import type { EventBus } from "@hims/ts-sdk-events";
import { abdmSessions } from "../schema/tables.js";
import type { AbdmSessionsPort } from "../ports.js";
import type { AbdmFlowKind, AbdmSession, AbdmSessionShape } from "../domain/session.js";
import { createSessionStateChangedEnvelope } from "../lib/abdm-envelope.js";
import {
  createSessionTokenCryptoFromEnv,
  type SessionTokenCrypto,
} from "../lib/session-token-crypto.js";

type AbdmSessionRow = typeof abdmSessions.$inferSelect;

function rowToSession(row: AbdmSessionRow, crypto: SessionTokenCrypto | null): AbdmSession {
  const decrypt = (v: string | null) => (crypto ? crypto.decrypt(v) : v);
  // Persisted rows carry flow_kind / state / context independently; reconstitute the
  // widest single-flow shape, then narrow to the discriminated union. The DB is the
  // source of truth for the flow<->state<->context correlation the type system enforces.
  const shape: AbdmSessionShape<AbdmFlowKind> = {
    iqTenantId: row.iq_tenant_id,
    sessionId: row.session_id,
    flowKind: row.flow_kind as AbdmFlowKind,
    state: row.state as AbdmSession["state"],
    txnId: row.txn_id,
    requestId: row.request_id,
    xToken: decrypt(row.x_token),
    tToken: decrypt(row.t_token),
    context: (row.context ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return shape as AbdmSession;
}

export class DrizzleAbdmSessionsRepo implements AbdmSessionsPort {
  private readonly tokenCrypto: SessionTokenCrypto | null;

  constructor(
    private readonly db: DbInstance,
    private readonly eventBus?: EventBus,
    tokenCrypto: SessionTokenCrypto | null = createSessionTokenCryptoFromEnv(),
  ) {
    this.tokenCrypto = tokenCrypto;
  }

  private encryptToken(value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    return this.tokenCrypto ? (this.tokenCrypto.encrypt(value) ?? undefined) : value;
  }

  async create(input: {
    iqTenantId: string;
    flowKind: AbdmSession["flowKind"];
    initialContext?: Record<string, unknown>;
  }): Promise<AbdmSession> {
    const ttlHours = Number(process.env["ABDM_SESSION_TTL_HOURS"] ?? 24);
    const expiresAt =
      Number.isFinite(ttlHours) && ttlHours > 0
        ? new Date(Date.now() + ttlHours * 3_600_000).toISOString()
        : undefined;
    const [row] = await this.db
      .insert(abdmSessions)
      .values({
        iq_tenant_id: input.iqTenantId,
        flow_kind: input.flowKind,
        state: "INIT",
        context: {
          ...(input.initialContext ?? {}),
          ...(expiresAt ? { expiresAt } : {}),
        },
      })
      .returning();
    if (!row) {
      throw new Error("abdm_sessions insert returned no row");
    }
    return rowToSession(row, this.tokenCrypto);
  }

  async findById(input: {
    iqTenantId: string;
    sessionId: string;
  }): Promise<AbdmSession | null> {
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.session_id, input.sessionId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }

  async patch(input: {
    iqTenantId: string;
    sessionId: string;
    state?: AbdmSession["state"];
    txnId?: string;
    requestId?: string;
    xToken?: string;
    tToken?: string;
    contextMerge?: Record<string, unknown>;
  }): Promise<AbdmSession> {
    const hasContextMerge =
      input.contextMerge !== undefined && Object.keys(input.contextMerge).length > 0;

    const prev =
      input.state !== undefined && this.eventBus
        ? await this.findById({
            iqTenantId: input.iqTenantId,
            sessionId: input.sessionId,
          })
        : null;

    const [row] = await this.db
      .update(abdmSessions)
      .set({
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.txnId !== undefined ? { txn_id: input.txnId } : {}),
        ...(input.requestId !== undefined ? { request_id: input.requestId } : {}),
        ...(input.xToken !== undefined ? { x_token: this.encryptToken(input.xToken) } : {}),
        ...(input.tToken !== undefined ? { t_token: this.encryptToken(input.tToken) } : {}),
        ...(hasContextMerge
          ? {
              context: sql`${abdmSessions.context} || ${JSON.stringify(input.contextMerge)}::jsonb`,
            }
          : {}),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.session_id, input.sessionId),
        ),
      )
      .returning();

    if (!row) {
      throw new Error("abdm_sessions patch affected no row");
    }
    const session = rowToSession(row, this.tokenCrypto);
    if (
      this.eventBus &&
      prev &&
      input.state !== undefined &&
      prev.state !== input.state
    ) {
      await this.eventBus.publish(
        createSessionStateChangedEnvelope(input.iqTenantId, {
          sessionId: session.sessionId,
          flowKind: session.flowKind,
          prevState: prev.state,
          newState: session.state,
        }),
      );
    }
    return session;
  }

  async findUserLinkByTransactionId(input: {
    iqTenantId: string;
    transactionId: string;
  }): Promise<AbdmSession | null> {
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.flow_kind, "abdm.m2.user-initiated-link.v1"),
          eq(abdmSessions.txn_id, input.transactionId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }

  async findUserLinkByLinkRefNumber(input: {
    iqTenantId: string;
    linkRefNumber: string;
  }): Promise<AbdmSession | null> {
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.flow_kind, "abdm.m2.user-initiated-link.v1"),
          sql`${abdmSessions.context}->>'linkRefNumber' = ${input.linkRefNumber}`,
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }

  async findHipLinkByRequestId(input: {
    iqTenantId: string;
    requestId: string;
  }): Promise<AbdmSession | null> {
    return this.findByFlowAndRequestId({
      iqTenantId: input.iqTenantId,
      flowKind: "abdm.m2.hip-initiated-link.v1",
      requestId: input.requestId,
    });
  }

  async findByFlowAndRequestId(input: {
    iqTenantId: string;
    flowKind: AbdmSession["flowKind"];
    requestId: string;
  }): Promise<AbdmSession | null> {
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.flow_kind, input.flowKind),
          eq(abdmSessions.request_id, input.requestId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }

  async findLatestLinkedUserLinkByAbhaAddress(input: {
    iqTenantId: string;
    abhaAddress: string;
  }): Promise<AbdmSession | null> {
    const abha = input.abhaAddress.trim();
    if (!abha) return null;
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.flow_kind, "abdm.m2.user-initiated-link.v1"),
          eq(abdmSessions.state, "LINKED"),
          sql`lower(${abdmSessions.context}->>'abhaAddress') = lower(${abha})`,
        ),
      )
      .orderBy(desc(abdmSessions.updated_at))
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }

  async findAddContextsNotifiedByCareContextReference(input: {
    iqTenantId: string;
    careContextReference: string;
  }): Promise<AbdmSession | null> {
    const refJson = JSON.stringify([input.careContextReference]);
    const rows = await this.db
      .select()
      .from(abdmSessions)
      .where(
        and(
          eq(abdmSessions.iq_tenant_id, input.iqTenantId),
          eq(abdmSessions.flow_kind, "abdm.m2.add-contexts.v1"),
          eq(abdmSessions.state, "NOTIFIED"),
          sql`${abdmSessions.context}->'careContextReferences' @> ${refJson}::jsonb`,
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToSession(row, this.tokenCrypto) : null;
  }
}
