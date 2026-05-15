import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "@hims/ts-sdk-db";
import type { EventBus } from "@hims/ts-sdk-events";
import { abdmSessions } from "../schema/tables.js";
import type { AbdmSessionsPort } from "../ports.js";
import type { AbdmSession } from "../domain/session.js";
import { createSessionStateChangedEnvelope } from "../lib/abdm-envelope.js";

type AbdmSessionRow = typeof abdmSessions.$inferSelect;

function rowToSession(row: AbdmSessionRow): AbdmSession {
  return {
    iqTenantId: row.iq_tenant_id,
    sessionId: row.session_id,
    flowKind: row.flow_kind as AbdmSession["flowKind"],
    state: row.state as AbdmSession["state"],
    txnId: row.txn_id,
    requestId: row.request_id,
    xToken: row.x_token,
    tToken: row.t_token,
    context: (row.context ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DrizzleAbdmSessionsRepo implements AbdmSessionsPort {
  constructor(
    private readonly db: DbInstance,
    private readonly eventBus?: EventBus,
  ) {}

  async create(input: {
    iqTenantId: string;
    flowKind: AbdmSession["flowKind"];
    initialContext?: Record<string, unknown>;
  }): Promise<AbdmSession> {
    const [row] = await this.db
      .insert(abdmSessions)
      .values({
        iq_tenant_id: input.iqTenantId,
        flow_kind: input.flowKind,
        state: "INIT",
        context: input.initialContext ?? {},
      })
      .returning();
    if (!row) {
      throw new Error("abdm_sessions insert returned no row");
    }
    return rowToSession(row);
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
    return row ? rowToSession(row) : null;
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
        ...(input.xToken !== undefined ? { x_token: input.xToken } : {}),
        ...(input.tToken !== undefined ? { t_token: input.tToken } : {}),
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
    const session = rowToSession(row);
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
}
